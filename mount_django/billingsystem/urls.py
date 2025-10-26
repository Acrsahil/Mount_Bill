from django.urls import (
    path,
)

from . import views

urlpatterns = [
    path("", views.bill, name="bill"),
    path("sahilpage/", views.sahilpage, name="sahilpage"),
    path("save-product/", views.save_product, name="save_product"),
    path(
        "save-invoice/", views.save_invoice, name="save_invoice"
    ),  # Make sure this line e
]
