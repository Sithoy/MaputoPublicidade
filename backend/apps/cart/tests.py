import pytest
from django.core.files.base import ContentFile
from django.urls import reverse

from apps.cart.models import CartItem
from apps.quotes.models import QuoteRequest


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

    def test_convert_cart_to_quote_requires_auth(self):
        from rest_framework.test import APIClient

        client = APIClient()
        response = client.post(reverse("cart-convert-to-quote"))
        assert response.status_code == 401

    def test_convert_empty_cart_returns_400(self, authenticated_client):
        response = authenticated_client.post(
            reverse("cart-convert-to-quote"),
            {
                "client_name": "Cliente",
                "client_email": "cliente@example.com",
            },
            format="json",
        )
        assert response.status_code == 400

    def test_convert_cart_to_quote_preserves_artwork(self, authenticated_client, cart, product):
        cart_item = CartItem.objects.create(
            cart=cart,
            product=product,
            description="Cartão de Visita",
            quantity=2,
            position=0,
        )
        cart_item.artwork_file.save(
            "test-artwork.pdf", ContentFile(b"conteudo do ficheiro"), save=True
        )

        response = authenticated_client.post(
            reverse("cart-convert-to-quote"),
            {
                "client_name": "Cliente",
                "client_email": "cliente@example.com",
                "client_phone": "258841234567",
                "urgency": "urgent",
            },
            format="json",
        )
        assert response.status_code == 201
        data = response.json()
        assert data["reference"].startswith("MP-")
        assert data["client_name"] == "Cliente"
        assert data["urgency"] == "urgent"
        assert len(data["items"]) == 1
        assert data["items"][0]["artwork_file"] is not None

        cart.refresh_from_db()
        assert cart.items.count() == 0
        quote = QuoteRequest.objects.get(reference=data["reference"])
        assert quote.items.count() == 1
        assert quote.items.first().artwork_file is not None
