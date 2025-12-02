from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import ProductCategory,UserRegistration,CountryCode


class ProductCategoryForm(forms.Form):
    product_cat = forms.ModelChoiceField(queryset=ProductCategory.objects.all())

class UserRegistrationForm(UserCreationForm):
    username=forms.CharField(max_length=100,widget=forms.TextInput(),required=True)
    email=forms.EmailField(widget=forms.EmailInput(),required=True)
    phone_country = forms.ModelChoiceField(queryset=CountryCode.objects.all(), required=True) 
    phone_number = forms.CharField(max_length=10,required=True)
    class Meta:
        model=UserRegistration
        fields=['username','email','phone_number','phone_country','password1','password2']
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # base style for all
        for field in self.fields.values():
            field.widget.attrs.update({'class':'form-control'})
        self.fields['username'].widget.attrs.update({'placeholder':'Enter your username'})
        self.fields['email'].widget.attrs.update({'placeholder':'Enter your email'})
        # special for password-field
        self.fields['password1'].widget.attrs.update({'placeholder':'Enter password',''
        'class':'form-control password-field',
        'id':'id_password1',
            })
        self.fields['password2'].widget.attrs.update({'placeholder':'Confirm password',
        'class':'form-control password-field',
        'id':'id_password2',
              })