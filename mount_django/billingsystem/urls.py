from django.urls import path

from . import views

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("product-detail/",views.product_detail,name="product_detail"),
    path("save-product/", views.save_product, name="save_product"),
    path("update-product/<int:id>/",views.update_product,name="update_product"),
    path("add-stock/<int:id>/",views.add_stock,name="add-stock"),
    path("reduce-stock/<int:id>/",views.reduce_stock,name="reduce-stock"),
    path(
        "sahilpage/<int:pro_id>/<int:second_id>/",
        views.product_details,
        name="product_details",
    ),
    path("sahilpage/", views.sahilpage, name="sahilpage"),
    path("save-invoice/", views.save_invoice, name="save_invoice"),
    path("delete_invoice/<int:id>/", views.delete_invoice, name="delete_invoice"),
    path("invoices/", views.invoices, name="invoices"),
    path(
        "products/", views.products, name="products"
    ),  # FIXED: views.products not views.Product
    path("clients/", views.clients, name="clients"),
    path("reports/", views.reports, name="reports"),
    path("settings/", views.settings, name="settings"),
    path("save-client/", views.save_client, name="save_client"),
    path("create-invoice/", views.create_invoice_page, name="create_invoice_page"),
]
