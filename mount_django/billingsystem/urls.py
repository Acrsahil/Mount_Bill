from django.urls import (
    path,
)

from . import views

urlpatterns = [
    path("", views.bill, name="bill"),
    path("save-product/", views.save_product, name="save_product"),
    path(
        "sahilpage/<int:pro_id>/<int:second_id>/",
        views.product_details,
        name="product_details",
    ),
    path("sahilpage/", views.sahilpage, name="sahilpage"),
    path(
        "save-invoice/", views.save_invoice, name="save_invoice"
    ),  # Make sure this line e
]
