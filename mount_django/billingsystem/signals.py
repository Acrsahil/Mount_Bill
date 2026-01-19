from django.dispatch import receiver
from django.db.models.signals import post_save
from .models import Company,ExpenseCategory

DEFAULT_EXPENSE_CATEGORIES =["Delievery","Miscellaneous","Travel & Transportation","Repair & Maintenance","Utilities","Marketing","Bank Fees","Salaries","Rent"]

@receiver(post_save,sender=Company)
def create_default_category(sender,instance,created,**kwargs):
    if created:
        for category_name in DEFAULT_EXPENSE_CATEGORIES:
            ExpenseCategory.objects.get_or_create(company=instance,name=category_name)