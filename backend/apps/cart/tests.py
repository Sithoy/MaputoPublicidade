import pytest
from django.urls import reverse


@pytest.mark.django_db
class TestCart:
    def test_get_cart_requires_auth(self):
        from rest_framework.test import APIClient

        client = APIClient()
        response = client.get(reverse("cart-detail"))
        assert response.status_code == 401

    def test_get_cart_creates_empty_cart(self, authenticated_client):
        response = authenticated_client.get(reverse("cart-detail"))
        assert response.status_code == 200
        assert response.json()["item_count"] == 0

    def test_add_cart_item(self, authenticated_client, product):
        response = authenticated_client.post(
            reverse("cart-item-list"),
            {"product_slug": product.slug, "quantity": 2, "description": "Teste"},
            format="json",
        )
        assert response.status_code == 201
        assert response.json()["quantity"] == 2

    def test_clear_cart(self, authenticated_client, cart_item):
        response = authenticated_client.post(reverse("cart-detail"))
        assert response.status_code == 200
        assert response.json()["item_count"] == 0

    def test_update_cart_item(self, authenticated_client, cart_item):
        response = authenticated_client.patch(
            reverse("cart-item-detail", kwargs={"pk": cart_item.pk}),
            {"quantity": 5},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["quantity"] == 5

    def test_delete_cart_item(self, authenticated_client, cart_item):
        response = authenticated_client.delete(
            reverse("cart-item-detail", kwargs={"pk": cart_item.pk})
        )
        assert response.status_code == 204
