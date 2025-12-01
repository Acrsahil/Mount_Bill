from django.contrib import admin

from .models import Bill, Customer, OrderList, OrderSummary, Product, ProductCategory,CountryCode,UserRegistration

# Register your models here.
admin.site.register(Product)
admin.site.register(Customer)
admin.site.register(ProductCategory)
admin.site.register(OrderSummary)
admin.site.register(Bill)
admin.site.register(OrderList)
admin.site.register(CountryCode)
admin.site.register(UserRegistration)