from django.urls import path

from . import views

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("invoice-uid/<int:id>/",views.invoice_uid,name="invoice_uid"),
    path("fetch-activity/<uuid:id>/", views.fetch_product_activities, name="fetch-activity"),
    path("fetch-transactions/<uuid:id>/",views.fetch_transactions,name="fetch_transactions"),
    path("payment-in/<int:id>/",views.payment_in,name="payment_in"),
    path("update-stock/<int:id>/", views.update_stock, name="update_stock"),
    path("products-json/", views.products_json, name="products_json"),
    path("category-json/", views.category_json, name="category_json"),
    path("filtered-products/", views.filtered_products, name="filtered_products"),
    path("product-detail/", views.product_detail, name="product_detail"),
    path("product-detail/<uuid:id>/", views.product_detail, name="product_detail"),
    path("clients-json/", views.clients_json, name="clients_json"),
    path("client-detail/", views.client_detail, name="client_detail"),
    path("client-detail/<uuid:id>/", views.client_detail, name="client_detail"),
    path("client-update/<int:id>/",views.update_client,name="update_client"),
    path("save-product/", views.save_product, name="save_product"),
    path("update-product/<int:id>/", views.update_product, name="update_product"),
    path("delete-product/<int:id>/", views.delete_product, name="delete_product"),
    path("add-stock/<int:id>/", views.add_stock, name="add-stock"),
    path("reduce-stock/<int:id>/", views.reduce_stock, name="reduce-stock"),
    path(
        "sahilpage/<int:pro_id>/<int:second_id>/",
        views.product_details,
        name="product_details",
    ),
    path("sahilpage/", views.sahilpage, name="sahilpage"),
    path("save-invoice/", views.save_invoice, name="save_invoice"),
    path("delete_invoice/<int:id>/", views.delete_invoice, name="delete_invoice"),
    path("invoice-layout/<uuid:id>/", views.invoice_layout, name="invoice_layout"),
    path("invoices/", views.invoices, name="invoices"),
    path("invoices/<uuid:id>/", views.invoices, name="invoices"),
    path(
        "products/", views.products, name="products"
    ),  # FIXED: views.products not views.Product
    path("clients/", views.clients, name="clients"),
    path("reports/", views.reports, name="reports"),
    path("settings/", views.settings, name="settings"),
    path("save-client/", views.save_client, name="save_client"),
    path("create-invoice/", views.create_invoice_page, name="create_invoice_page"),
]
