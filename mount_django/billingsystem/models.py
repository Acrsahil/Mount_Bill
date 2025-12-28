# billingsystem/models.py - OPTION A
import uuid
from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    has_paid_for_company = models.BooleanField(default=False)
    payment_date = models.DateField(null=True, blank=True)

    owned_company = models.OneToOneField(
        "Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="company_owner",
    )

    active_company = models.ForeignKey(
        "Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="active_users",
    )

    def __str__(self):
        return self.username


class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15, blank=True)
    tax_id = models.CharField(max_length=15, blank=True)

    managers = models.ManyToManyField(
        User, related_name="managed_companies", blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Customer(models.Model):  # sabina
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="customers"
    )
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    pan_id = models.CharField(max_length=15, blank=True)
    address = models.CharField(max_length=15, blank=True)

    def __str__(self):
        return f"{self.name} ({self.company})"


class Supplier(models.Model):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="suppliers"
    )
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    pan_id = models.CharField(max_length=15, blank=True)
    address = models.CharField(max_length=15, blank=True)

    def __str__(self):
        return f"{self.name} ({self.company})"


class ProductCategory(models.Model):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="product_categories"
    )
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ["company", "name"]

    def __str__(self):
        return f"{self.name} ({self.company})"


class Product(models.Model):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="products"
    )
    uid = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    product_quantity = models.IntegerField(default=0)
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    date_added = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ["company", "name"]

    def __str__(self):
        return f"{self.name} ({self.company})"


class OrderList(models.Model):
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="orders"
    )
    order_date = models.DateTimeField(default=timezone.now)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_orders"
    )
    # payment status
    PAYMENT_STATUS_CHOICES = [
        ("UNPAID", "Unpaid"),
        ("PARTIAL", "Partial"),
        ("PAID", "Paid"),
    ]

    payment_status = models.CharField(
        max_length=50, choices=PAYMENT_STATUS_CHOICES, default="UNPAID"
    )
    notes = models.TextField(blank=True, null=True)
    is_simple_invoice = models.BooleanField(default=False)
    invoice_description = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.created_by:
            is_owner = self.created_by.owned_company == self.company
            is_manager = self.company.managers.filter(id=self.created_by.id).exists()

            if not (is_owner or is_manager):
                raise ValidationError("User doesn't have company access")

        super().save(*args, **kwargs)

    def __str__(self):
        type_str = "Simple" if self.is_simple_invoice else "Detailed"
        return f"{type_str} Order {self.id} - {self.customer.name}"


class Bill(models.Model):
    order = models.ForeignKey(OrderList, on_delete=models.CASCADE, related_name="bills")

    # CHANGED: Product can be null for simple invoices
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,  # Changed from CASCADE
        null=True,  # Allow null
        blank=True,  # Allow blank
        related_name="bills",
    )

    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    # NEW: Description for simple invoice items
    description = models.TextField(blank=True, null=True)

    bill_date = models.DateTimeField(default=timezone.now)

    @property
    def line_total(self):
        """Calculate line total: quantity × price"""
        return Decimal(str(self.quantity)) * Decimal(str(self.product_price))

    def clean(self):
        """Validate data integrity"""
        # For detailed invoices (has product), check company match
        if self.product and self.product.company != self.order.company:
            raise ValidationError("Product doesn't belong to order's company")

        # For simple invoices (no product), require description
        if not self.product and not self.description:
            raise ValidationError("Description required for simple invoice items")

    def __str__(self):
        if self.product:
            return f"Bill {self.id} - {self.product.name} (Order {self.order.id})"
        else:
            return f"Bill {self.id} - Simple Item (Order {self.order.id})"


class OrderSummary(models.Model):
    order = models.OneToOneField(
        OrderList, on_delete=models.CASCADE, related_name="summary"
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    tax = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    received_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    calculated_on = models.DateTimeField(auto_now=True)

    def clean(self):
        """
        Custom validation for amount fields.

        With max_digits=10 and decimal_places=2, the DB already limits:
        - 8 integer digits + 2 decimal digits

        Here we enforce that same rule with a clear message BEFORE hitting DB.
        """
        super().clean()

        # Max allowed value: 99,999,999.99 (8 digits before decimal, 2 after)
        max_amount = Decimal("99999999.99")

        errors = {}

        # Check all relevant monetary field

        if self.total_amount is not None and self.total_amount > max_amount:
            errors["total_amount"] = [
                "Value cannot have more than 8 digits before the decimal "
                "(maximum allowed is 99,999,999.99)."
            ]

        # You can also add custom rules for discount/tax if you want:
        # e.g. discount and tax should not be negative, or greater than some limit, etc.

        if errors:
            # Raise one ValidationError containing field-specific messages
            raise ValidationError(errors)

    def __str__(self):
        return f"total amount:{self.total_amount}"


class AdditionalCharges(models.Model):
    additional_charges = models.ForeignKey(
        OrderList, on_delete=models.CASCADE, related_name="charges"
    )
    charge_name = models.CharField(max_length=200)
    additional_amount = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)

    def __str__(self):
        return f"Additional amount: {self.additional_amount}"


class RemainingAmount(models.Model):
    customer = models.OneToOneField(
        Customer, on_delete=models.CASCADE, related_name="customer"
    )
    remaining_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)

    def __str__(self):
        return f"remaining amount:{self.remaining_amount}"
