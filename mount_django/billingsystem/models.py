from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser

class CountryCode(models.Model):
    name=models.CharField(max_length=50)
    iso_code=models.CharField(max_length=2)
    dial_code=models.CharField(max_length=5)
    def __str__(self):
        return f"{self.iso_code}{self.dial_code}"

class UserRegistration(AbstractUser):
    username=models.CharField(max_length=100,unique=True)
    company_name=models.CharField(max_length=1500)
    email=models.EmailField(max_length=254,unique=True) 
    phone_country=models.ForeignKey(CountryCode,on_delete=models.PROTECT,null=True,blank=True,related_name="users")
    phone_number=models.CharField(max_length=10)
    USERNAME_FIELD = 'username'  # Field used to log in
    REQUIRED_FIELDS = ['email']
    @property
    def full_phone(self):
        return f"{self.phone_country.dial_code}{self.phone_number}"
    
class ProductCategory(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=100)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2,default=0)
    image = models.ImageField(upload_to="Productimage/")
    date_added = models.DateTimeField(default=timezone.now)
    category = models.ForeignKey(
        ProductCategory, on_delete=models.CASCADE, related_name="products"
    )

    def __str__(self):
        return self.name


class Customer(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,  # Changed from CASCADE
        null=True,
        blank=True,
        related_name="children",
    )
    email = models.EmailField(max_length=100, unique=True)
    phone = models.CharField(max_length=15, unique=True)  # Increased length
    address = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class OrderList(models.Model):
    order_date = models.DateTimeField(default=timezone.now)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="orders",
    )

    def __str__(self):
        return f"Order {self.id} - {self.customer.name}"


class Bill(models.Model):
    order = models.ForeignKey(OrderList, on_delete=models.CASCADE, related_name="bills")
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="bills",
    )
    product_price = models.BigIntegerField()  # price at billing time
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
