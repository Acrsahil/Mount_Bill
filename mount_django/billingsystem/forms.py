from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import ProductCategory,User


class ProductCategoryForm(forms.Form):
    product_cat = forms.ModelChoiceField(queryset=ProductCategory.objects.all())

class UserForm(UserCreationForm):
    username=forms.CharField(max_length=30)
    phone=forms.IntegerField()
    class Meta:
        model=User
        fields=['username','phone','password1','password2']