from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Company,ExpenseCategory
DEFAULT_CATEGORIES = [
    "Delivery","Miscellaneous","Travel & Transportation","Repair & Maintenance",
    "Utilities","Marketing","Bank Fees","Salaries","Rent"
]

for cat_name in DEFAULT_CATEGORIES:
    ExpenseCategory.objects.get_or_create(name=cat_name)

@receiver(post_save, sender=Company)
def link_default_categories(sender, instance, created, **kwargs):
    if created:
        default_cats = ExpenseCategory.objects.filter(name__in=DEFAULT_CATEGORIES)
        for cat in default_cats:
            cat.companies.add(instance)