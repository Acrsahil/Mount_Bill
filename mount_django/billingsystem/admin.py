# billingsystem/admin.py - CORRECT SYNTAX
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (
    AdditionalCharges,
    Bill,
    Company,
    Customer,
    ItemActivity,
    OrderList,
    OrderSummary,
    Product,
    ProductCategory,
    RemainingAmount,
    User,
    PaymentIn,
    PaymentOut,
    BalanceAdjustment,
)


# Company Admin
@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "email",
        "phone",
        "tax_id",
        "created_at",
        "owner_info",
        "managers_count",
    )
    list_filter = ("created_at",)
    search_fields = ("name", "email", "phone", "tax_id")
    readonly_fields = ("created_at",)

    def owner_info(self, obj):
        return obj.company_owner.username if obj.company_owner else "No owner"

    owner_info.short_description = "Owner"

    def managers_count(self, obj):
        return obj.managers.count()

    managers_count.short_description = "Managers"


# Custom User Admin
class CustomUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "phone",
        "has_paid_for_company",
        "owned_company_info",
        "active_company_info",
        "is_staff",
        "date_joined",
    )
    list_filter = ("has_paid_for_company", "is_staff", "is_active", "date_joined")

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            _("Personal info"),
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "email",
                    "phone",
                )
            },
        ),
        (
            _("Company Info"),
            {
                "fields": (
                    "has_paid_for_company",
                    "payment_date",
                    "owned_company",
                    "active_company",
                )
            },
        ),
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
                    "phone",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    search_fields = ("username", "email", "phone")
    ordering = ("-date_joined",)
    filter_horizontal = (
        "groups",
        "user_permissions",
    )

    def owned_company_info(self, obj):
        return obj.owned_company.name if obj.owned_company else "No owned company"

    owned_company_info.short_description = "Owned Company"

    def active_company_info(self, obj):
        return obj.active_company.name if obj.active_company else "No active company"

    active_company_info.short_description = "Active Company"


# Customer Admin
@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    # Changed: removed email, added phone
    list_display = ("uid","name", "phone", "company")
    list_filter = ("company",)
    # Changed: removed email
    search_fields = ("name", "phone", "company__name")


# Product Category Admin


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "company")
    list_filter = ("company",)
    search_fields = ("name", "company__name")


# Product Admin
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "uid",
        "name",
        "cost_price",
        "selling_price",
        "product_quantity",
        "category",
        "company",
        "date_added",
        "low_stock_bar",
    )
    list_filter = ("company", "category", "date_added")
    search_fields = ("name", "company__name", "category__name")
    raw_id_fields = ("category",)


# Order List Admin
@admin.register(OrderList)
class OrderListAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer",
        "company",
        "order_date",
        "created_by",
        "payment_status",
    )
    list_filter = ("company", "order_date")
    search_fields = ("customer__name", "company__name", "created_by__username")
    raw_id_fields = ("customer", "created_by")


# Bill Admin
@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "product",
        "quantity",
        "product_price",
        "bill_date",
        "total_price",
        "discount",
    )
    list_filter = ("bill_date", "order__company")
    search_fields = ("order__id", "product__name")
    raw_id_fields = ("order", "product")

    def total_price(self, obj):
        return obj.product_price * obj.quantity

    total_price.short_description = "Total"


# Order Summary Admin
@admin.register(OrderSummary)
class OrderSummaryAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "total_amount",
        "discount",
        "tax",
        "final_amount",
        "due_amount",
        "calculated_on",
    )
    list_filter = ("calculated_on",)
    search_fields = ("order__id",)
    raw_id_fields = ("order",)


# Register User with Custom Admin
admin.site.register(User, CustomUserAdmin)


@admin.register(AdditionalCharges)
class AdditionalChargesAdmin(admin.ModelAdmin):
    list_display = (
        "additional_charges",
        "charge_name",
        "additional_amount",
    )
    search_fields = ("charge_name",)


@admin.register(RemainingAmount)
class RemainingAmountAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "orders",
        "remaining_amount",
    )
    search_fields = ("customer",)


@admin.register(ItemActivity)
class ItemActivityAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "product",
        "type",
        "date",
        "change",
        "quantity",
    )
    search_fields = ("order_id",)

@admin.register(PaymentIn)
class PaymentInAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "date",
        "payment_in",
        "remarks",
    )
    search_fields = ("customer_id",)

@admin.register(PaymentOut)
class PaymentOutAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "date",
        "payment_out",
        "remarks",
    )
    search_fields = ("customer_id",)

@admin.register(BalanceAdjustment)
class BalanceAdjustmentAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "amount",
        "date",
    )
    search_fields = ("customer_id",)