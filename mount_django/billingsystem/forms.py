from django import forms

from .models import ProductCategory


class ProductCategoryForm(forms.Form):
    product_cat = forms.ModelChoiceField(queryset=ProductCategory.objects.all())
