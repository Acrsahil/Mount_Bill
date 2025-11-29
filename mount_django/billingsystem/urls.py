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
    path("delete_invoice/<int:id>/",views.delete_invoice,name="delete_invoice"),
    path("invoices/", views.invoices, name="invoices"),
    path("products/", views.products, name="products"),
    path("clients/", views.clients, name="clients"),
    path("reports/", views.reports, name="reports"),
    path("settings/", views.settings, name="settings"),
    path("save-client/", views.save_client, name="save_client"),
]
