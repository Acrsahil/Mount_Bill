from django.urls import (
    path,
)

from . import views

urlpatterns = [
    path("", views.bill, name="bill"),
    path("sahilpage/", views.sahilpage, name="sahilpage"),
]
