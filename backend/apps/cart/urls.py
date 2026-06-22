from django.urls import path

from .views import CartDetailView, CartItemViewSet

urlpatterns = [
    path("cart/", CartDetailView.as_view(), name="cart-detail"),
    path("cart/items/", CartItemViewSet.as_view({"post": "create"}), name="cart-item-list"),
    path(
        "cart/items/<int:pk>/",
        CartItemViewSet.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="cart-item-detail",
    ),
]
