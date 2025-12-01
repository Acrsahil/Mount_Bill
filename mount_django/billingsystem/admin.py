from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (
    Bill,
    Company,
    Customer,
    OrderList,
    OrderSummary,
    Product,
    ProductCategory,
    User,
)

# Company Admin


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "created_at")
    list_filter = ("created_at",)
    search_fields = ("name", "email", "phone")
    readonly_fields = ("created_at",)


# Custom User Admin


class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "company", "role", "is_staff", "date_joined")
    list_filter = ("company", "role", "is_staff", "is_active", "date_joined")

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            _("Personal info"),
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "email",
                    "gmail",
                    "phone",
                    "address",
                    "date_of_birth",
                    "profile_picture",
                )
            },
        ),
        (_("Company & Role"), {"fields": ("company", "role")}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "email",
                    "gmail",
                    "phone",
                    "company",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    search_fields = ("username", "email", "gmail", "phone", "company__name")
    ordering = ("-date_joined",)
    filter_horizontal = (
        "groups",
        "user_permissions",
    )


# Customer Admin


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "company")
    list_filter = ("company",)
    search_fields = ("name", "email", "phone", "company__name")
    raw_id_fields = ("parent",)


# Product Category Admin


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "company")
    list_filter = ("company",)
    search_fields = ("name", "company__name")


# Product Admin


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "selling_price", "company", "date_added")
    list_filter = ("company", "category", "date_added")
    search_fields = ("name", "company__name", "category__name")
    raw_id_fields = ("category",)


# Order List Admin


@admin.register(OrderList)
class OrderListAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "company", "order_date", "created_by")
    list_filter = ("company", "order_date")
    search_fields = ("customer__name", "company__name", "created_by__username")
    raw_id_fields = ("customer", "created_by")


# Bill Admin


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product", "quantity", "product_price", "bill_date")
    list_filter = ("bill_date",)
    search_fields = ("order__id", "product__name")
    raw_id_fields = ("order", "product")


# Order Summary Admin


@admin.register(OrderSummary)
class OrderSummaryAdmin(admin.ModelAdmin):
    list_display = ("order", "total_amount", "final_amount", "calculated_on")
    list_filter = ("calculated_on",)
    search_fields = ("order__id",)
    raw_id_fields = ("order",)


# Register User with Custom Admin
admin.site.register(User, CustomUserAdmin)
