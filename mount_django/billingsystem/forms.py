from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import ProductCategory,UserRegistration,CountryCode


class ProductCategoryForm(forms.Form):
    product_cat = forms.ModelChoiceField(queryset=ProductCategory.objects.all())

class UserRegistrationForm(UserCreationForm):
    username=forms.CharField(max_length=100,widget=forms.TextInput(),required=True)
    company_name=forms.CharField(max_length=1500,widget=forms.TextInput(),required=True)
    email=forms.EmailField(widget=forms.EmailInput(),required=True)
    phone_country = forms.ModelChoiceField(queryset=CountryCode.objects.all(), required=True) 
    phone_number = forms.CharField(max_length=10,required=True)
    class Meta:
        model=UserRegistration
        fields=['username','email','company_name','phone_number','phone_country','password1','password2']
