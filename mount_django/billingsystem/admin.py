from django.contrib import admin

from .models import Customer, Product, ProductCategory

# Register your models here.
admin.site.register(Product)
admin.site.register(Customer)
admin.site.register(ProductCategory)
