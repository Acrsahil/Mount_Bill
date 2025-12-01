import uuid

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


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

    managers = models.ManyToManyField(
        User, related_name="managed_companies", blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# business logic!!!
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


class Product(models.Model):
    """Essential fields only"""

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="products"
    )
    name = models.CharField(max_length=100)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ["company", "name"]

    def __str__(self):
        return f"{self.name} ({self.company})"


class OrderList(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

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
        return f"Order {self.id}"


class Bill(models.Model):
    """With essential clean() validation"""

    order = models.ForeignKey(OrderList, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    def clean(self):
        """ESSENTIAL - Data validation"""
        if self.product.company != self.order.company:
            raise ValidationError("Product doesn't belong to order's company")

    def __str__(self):
        return f"Bill {self.id}"
