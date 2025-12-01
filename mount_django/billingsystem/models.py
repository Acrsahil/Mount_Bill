import uuid

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """Essential fields only"""

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
    """Essential fields only"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15, blank=True)
    tax_id = models.CharField(
        max_length=15,
    )

    managers = models.ManyToManyField(
        User, related_name="managed_companies", blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# ========== BUSINESS MODELS ==========


class Customer(models.Model):
    """Essential fields only"""

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="customers"
    )
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100, blank=True)

    class Meta:
        unique_together = ["company", "email"]

    def __str__(self):
        return f"{self.name} ({self.company})"


class ProductCategory(models.Model):
    """Product categories specific to each company"""

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="product_categories"
    )
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ["company", "name"]

    def __str__(self):
        return f"{self.name} ({self.company})"


class Product(models.Model):
    """Products specific to each company"""

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="products"
    )
    name = models.CharField(max_length=100)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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
    """Orders for company's customers"""

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

    def save(self, *args, **kwargs):
        """ESSENTIAL - Database integrity check"""
        if self.created_by:
            # Check if user has access to company
            is_owner = self.created_by.owned_company == self.company
            is_manager = self.company.managers.filter(id=self.created_by.id).exists()

            if not (is_owner or is_manager):
                raise ValidationError("User doesn't have company access")

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.id} - {self.customer.name}"


class Bill(models.Model):
    """With essential clean() validation"""

    order = models.ForeignKey(OrderList, on_delete=models.CASCADE, related_name="bills")
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="bills",
    )
    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    bill_date = models.DateTimeField(default=timezone.now)

    def clean(self):
        """ESSENTIAL - Data validation"""
        if self.product.company != self.order.company:
            raise ValidationError("Product doesn't belong to order's company")

    def __str__(self):
        return f"Bill {self.id} - Order {self.order.id}"


class OrderSummary(models.Model):
    """Summary for each order with totals"""

    order = models.OneToOneField(
        OrderList, on_delete=models.CASCADE, related_name="summary"
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    tax = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    calculated_on = models.DateTimeField(auto_now=True)

    def calculate_totals(self, save=True):
        """Calculate order totals from bills"""
        total = 0
        for bill in self.order.bills.all():
            total += bill.product_price * bill.quantity

        total_after_discount = total * (1 - self.discount / 100)
        total_after_tax = total_after_discount * (1 + self.tax / 100)

        self.total_amount = total
        self.final_amount = total_after_tax

        if save:
            self.save()

    def __str__(self):
        return f"Summary for Order {self.order.id}"
