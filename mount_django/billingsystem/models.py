import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class Company(models.Model):
    """
    The business entity that uses your billing system
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15)
    address = models.TextField()
    tax_id = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # SaaS additions
    subdomain = models.CharField(max_length=50, unique=True, blank=True, null=True)
    plan = models.CharField(
        max_length=20,
        default="free",
        choices=[("free", "Free"), ("basic", "Basic"), ("pro", "Professional")],
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    """
    Company employees who can login to the system
    """

    phone = models.CharField(max_length=15, blank=True)

    # Changed: removed unique=True to allow same email across companies
    gmail = models.EmailField(
        max_length=255, blank=True, null=True, verbose_name="Gmail Address"
    )

    # Regular email field (not used for login by default)
    email = models.EmailField(blank=True)

    address = models.TextField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to="profile_pics/", blank=True)

    # Company association
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="employees",
        null=True,
        blank=True,
    )

    # Role within the company
    class Role(models.TextChoices):
        OWNER = "OWNER", "Company Owner"  # -> full access
        MANAGER = "MANAGER", "Manager"  # -> write
        STAFF = "STAFF", "Staff"  # -> read # partial -> write

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STAFF)

    class Meta:
        # Username must be unique within a company
        unique_together = [["company", "username"]]

    def __str__(self):
        return f"{self.username} ({self.company})"


class Customer(models.Model):
    """
    The company's clients - NO login, just data records
    """

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="customers"
    )
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    # Not unique across companies
    email = models.EmailField(max_length=100, blank=True)
    # Not unique across companies
    phone = models.CharField(max_length=15, blank=True)
    address = models.CharField(max_length=100)

    class Meta:
        # A customer is unique within a company
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
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    image = models.ImageField(upload_to="Productimage/")
    date_added = models.DateTimeField(default=timezone.now)
    category = models.ForeignKey(
        ProductCategory, on_delete=models.CASCADE, related_name="products"
    )

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

    def __str__(self):
        return f"Order {self.id} - {self.customer.name} ({self.company})"


class Bill(models.Model):
    order = models.ForeignKey(OrderList, on_delete=models.CASCADE, related_name="bills")
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="bills",
    )
    product_price = models.BigIntegerField()
    quantity = models.PositiveIntegerField(default=1)
    bill_date = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Bill {self.id} - Order {self.order.id}"


class OrderSummary(models.Model):
    order = models.OneToOneField(
        OrderList, on_delete=models.CASCADE, related_name="summary"
    )
    total_amount = models.BigIntegerField(default=0)
    discount = models.FloatField(default=0.0)
    tax = models.FloatField(default=0.0)
    final_amount = models.BigIntegerField(default=0)
    calculated_on = models.DateTimeField(auto_now=True)

    def calculate_totals(self, save=True):
        total = sum(
            bill.product_price * bill.quantity for bill in self.order.bills.all()
        )
        total_after_discount = total * (1 - self.discount / 100)
        total_after_tax = total_after_discount * (1 + self.tax / 100)
        self.total_amount = total
        self.final_amount = round(total_after_tax)
        if save:
            self.save()

    def __str__(self):
        return f"Summary for Order {self.order.id}"
