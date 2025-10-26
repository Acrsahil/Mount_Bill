import json

from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from .models import Customer, Product


@login_required
def bill(request):
    # Get products and manually convert Decimal to float
    products = Product.objects.select_related("category")
    products_list = []
    for product in products:
        products_list.append(
            {
                "id": product.id,
                "name": product.name,
                "price": float(product.price),  # ← Convert here
                "category": product.category.name if product.category else "",
            }
        )

    # Get customers
    customers = Customer.objects.all()
    customers_list = []
    for customer in customers:
        customers_list.append(
            {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "phone": customer.phone,
                "address": customer.address,
            }
        )

    product_data = json.dumps(products_list)
    customer_data = json.dumps(customers_list)

    return render(
        request,
        "website/bill.html",
        {"product": product_data, "customer": customer_data},
    )


def sahilpage(request):
    return render(request, "billingsystem/index.html")
