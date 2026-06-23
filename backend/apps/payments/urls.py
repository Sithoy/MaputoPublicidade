from django.urls import path

from . import views

urlpatterns = [
    path("payments/", views.PaymentViewSet.as_view({"get": "list"}), name="payment-list"),
    path(
        "payments/initiate/",
        views.PaymentViewSet.as_view({"post": "initiate"}),
        name="payment-initiate",
    ),
    path(
        "payments/<str:correlation_id>/status/",
        views.PaymentViewSet.as_view({"get": "status"}),
        name="payment-status",
    ),
    path(
        "payments/<str:correlation_id>/",
        views.PaymentViewSet.as_view({"get": "retrieve"}),
        name="payment-detail",
    ),
    path("payments/webhook/mpesa/", views.mpesa_webhook, name="mpesa-webhook"),
    path("payments/webhook/emola/", views.emola_webhook, name="emola-webhook"),
]
