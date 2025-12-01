import uuid

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """
    User can:
    1. Be free user (no company initially)
    2. Join as Manager in other companies (free via invitation)
    3. Create own company (paid, becomes Owner)
    Can be Manager in multiple companies + Owner of own company simultaneously
    """

    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)

    # Track if user has paid to create their own company
    has_paid_for_company = models.BooleanField(default=False)
    payment_date = models.DateField(null=True, blank=True)

    # Stripe/PayPal customer ID for recurring payments if needed
    stripe_customer_id = models.CharField(max_length=100, blank=True)

    # The company they OWN (if any) - ONLY ONE OWNED COMPANY
    owned_company = models.OneToOneField(
        "Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="company_owner",
    )

    # Track user's currently active company (can switch between owned + managed)
    active_company = models.ForeignKey(
        "Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="active_users",
    )

    def __str__(self):
        managed = self.managed_companies.count()
        owned = "Yes" if self.owned_company else "No"
        return f"{self.username} (Owns: {owned}, Manages: {managed} companies)"

    # === ROLE CHECKS ===

    def is_owner_of(self, company):
        """Check if user owns a specific company"""
        return self.owned_company == company

    def is_manager_in(self, company):
        """Check if user is manager in a specific company"""
        return self.managed_companies.filter(id=company.id).exists()

    def get_role_in(self, company):
        """Get user's role in a specific company"""
        if self.is_owner_of(company):
            return "owner"
        elif self.is_manager_in(company):
            return "manager"
        return None

    def get_all_companies(self):
        """Get all companies user is associated with"""
        companies = []
        if self.owned_company:
            companies.append(self.owned_company)
        companies.extend(self.managed_companies.all())
        return list(set(companies))

    def has_company_access(self, company):
        """Check if user has access to a company"""
        return self.is_owner_of(company) or self.is_manager_in(company)

    def set_active_company(self, company):
        """Set user's active company"""
        if not self.has_company_access(company):
            raise ValidationError("User does not have access to this company")
        self.active_company = company
        self.save()

    # === PAYMENT & COMPANY CREATION ===

    def can_create_company(self):
        """Check if user can create their own company"""
        return self.has_paid_for_company and not self.owned_company

    def process_payment_for_company(self, amount=100):
        """Process payment for creating own company"""
        # Integrate with Stripe/PayPal
        # For now, simulate payment
        self.has_paid_for_company = True
        self.payment_date = timezone.now().date()
        self.save()
        return True

    def create_own_company(self, name, email, phone=""):
        """Create user's own company after payment"""
        if not self.can_create_company():
            raise ValidationError(
                "Cannot create company. Payment required or already has company."
            )

        company = Company.objects.create(name=name, email=email, phone=phone)

        # Set user as owner
        self.owned_company = company
        self.save()

        # Set as active company
        self.set_active_company(company)

        return company

    # === PERMISSION CHECKS (Manager Limitations) ===

    def can_manage_users_in(self, company):
        """Check if user can manage users in a company"""
        # Only owners can manage users (add/remove managers)
        return self.is_owner_of(company)

    def can_edit_company_settings_in(self, company):
        """Check if user can edit company settings"""
        # Only owners can edit company settings
        return self.is_owner_of(company)

    def can_add_products_in(self, company):
        """Check if user can add products"""
        # Both owners and managers can add products
        return self.has_company_access(company)

    def can_edit_product_prices_in(self, company):
        """Check if user can edit product prices"""
        # Both owners and managers can edit prices
        return self.has_company_access(company)

    def can_delete_products_in(self, company):
        """Check if user can delete products"""
        # Only owners can delete products (Manager limitation)
        return self.is_owner_of(company)

    def can_view_financial_reports_in(self, company):
        """Check if user can view financial reports"""
        # Both owners and managers can view financials
        return self.has_company_access(company)

    def can_create_invoices_in(self, company):
        """Check if user can create invoices"""
        # Both owners and managers can create invoices
        return self.has_company_access(company)

    def can_view_all_invoices_in(self, company):
        """Check if user can view all invoices"""
        # Both owners and managers can view all invoices
        return self.has_company_access(company)

    def can_export_data_in(self, company):
        """Check if user can export company data"""
        # Only owners can export data (Manager limitation)
        return self.is_owner_of(company)

    def can_delete_company_in(self, company):
        """Check if user can delete company"""
        # Only owners can delete their own company
        return self.is_owner_of(company)

    def can_invite_managers_in(self, company):
        """Check if user can invite other managers"""
        # Only owners can invite managers
        return self.is_owner_of(company)


class Company(models.Model):
    """
    Company can have:
    - One owner (user who paid to create it)
    - Multiple managers (invited by owner)
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15, blank=True)

    # Managers (invited by owner, free users)
    managers = models.ManyToManyField(
        User, related_name="managed_companies", blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def get_owner(self):
        """Get the owner of this company"""
        return self.company_owner

    def get_all_members(self):
        """Get all members (owner + managers)"""
        members = list(self.managers.all())
        if self.company_owner:
            members.append(self.company_owner)
        return members

    def add_manager(self, user):
        """Add user as manager to this company"""
        if user == self.company_owner:
            raise ValidationError("Owner cannot be added as manager")

        # Check if user is already a manager
        if self.managers.filter(id=user.id).exists():
            raise ValidationError("User is already a manager in this company")

        self.managers.add(user)

    def remove_manager(self, user):
        """Remove manager from company"""
        self.managers.remove(user)

    def is_member(self, user):
        """Check if user is member (owner or manager)"""
        return user == self.company_owner or self.managers.filter(id=user.id).exists()

    def get_user_role(self, user):
        """Get user's role in this company"""
        if user == self.company_owner:
            return "owner"
        elif self.managers.filter(id=user.id).exists():
            return "manager"
        return None

    def get_managers_count(self):
        """Get number of managers in company"""
        return self.managers.count()

    def can_user_delete(self, user):
        """Check if user can delete this company"""
        return user == self.company_owner


class ManagerInvitation(models.Model):
    """
    Invitations for users to join as managers
    """

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="invitations"
    )
    email = models.EmailField()
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    invited_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_invitations"
    )
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["company", "email"]

    def __str__(self):
        return f"{self.email} -> {self.company.name} (Manager)"

    def save(self, *args, **kwargs):
        """Validate that only owners can invite managers"""
        if not self.invited_by.is_owner_of(self.company):
            raise ValidationError("Only company owners can invite managers")
        super().save(*args, **kwargs)

    def accept_invitation(self, user):
        """Accept invitation and add user as manager"""
        if self.accepted:
            raise ValidationError("Invitation already accepted")

        # Add user as manager
        self.company.add_manager(user)

        # Mark as accepted
        self.accepted = True
        self.accepted_at = timezone.now()
        self.save()


# ========== BUSINESS MODELS ==========


class Customer(models.Model):
    """
    Customers belong to companies
    """

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="customers"
    )
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    address = models.CharField(max_length=100)

    class Meta:
        unique_together = ["company", "email"]

    def __str__(self):
        return f"{self.name} ({self.company})"

    def can_user_access(self, user):
        """Check if user can access this customer"""
        return user.has_company_access(self.company)


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

    class Meta:
        unique_together = ["company", "name"]

    def __str__(self):
        return f"{self.name} ({self.company})"

    def can_user_edit(self, user):
        """Check if user can edit this product"""
        return user.has_company_access(self.company)

    def can_user_delete(self, user):
        """Check if user can delete this product"""
        # Only owners can delete products (Manager limitation)
        return user.is_owner_of(self.company)


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

    def save(self, *args, **kwargs):
        """Validate that creator has access to company"""
        if self.created_by and not self.created_by.has_company_access(self.company):
            raise ValidationError(
                f"User {self.created_by} does not have access to company {self.company}"
            )
        super().save(*args, **kwargs)

    def can_user_access(self, user):
        """Check if user can access this order"""
        return user.has_company_access(self.company)


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

    def clean(self):
        """Validate that product belongs to order's company"""
        if self.product.company != self.order.company:
            raise ValidationError(
                f"Product {self.product} does not belong to company {
                    self.order.company
                }"
            )


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


class UserActivityLog(models.Model):
    """Track user activities across companies"""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activities")
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True
    )
    action = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.action} - {self.created_at}"
