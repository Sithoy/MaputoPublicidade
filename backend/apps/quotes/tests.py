import pytest
from django.urls import reverse

from apps.orders.models import Order
from apps.quotes.models import ArtworkApproval, QuoteItem, QuoteRequest


@pytest.mark.django_db
class TestQuoteApi:
    def test_create_quote_anonymous(self, product, product_data):
        from rest_framework.test import APIClient

        client = APIClient()
        response = client.post(reverse("quote-list"), product_data, format="json")
        assert response.status_code == 201
        assert response.json()["client_name"] == "Novo Cliente"

    def test_client_sees_own_quote(self, authenticated_client, quote):
        response = authenticated_client.get(
            reverse("quote-detail", kwargs={"reference": quote.reference})
        )
        assert response.status_code == 200
        assert response.json()["reference"] == quote.reference

    def test_staff_set_price_to_quoted(self, staff_client, quote):
        url = reverse("quote-set-price", kwargs={"reference": quote.reference})
        response = staff_client.post(url, {"final_price": "1000.00"}, format="json")
        assert response.status_code == 200
        quote.refresh_from_db()
        assert quote.status == QuoteRequest.STATUS_QUOTED

    def test_client_approves_price(self, authenticated_client, quoted_quote):
        url = reverse("quote-approve-price", kwargs={"reference": quoted_quote.reference})
        response = authenticated_client.post(url)
        assert response.status_code == 200
        quoted_quote.refresh_from_db()
        assert quoted_quote.status == QuoteRequest.STATUS_APPROVED

    def test_staff_converts_quote_to_order(self, staff_client, quoted_quote):
        url = reverse("quote-convert-to-order", kwargs={"reference": quoted_quote.reference})
        response = staff_client.post(url)
        assert response.status_code == 201
        assert Order.objects.filter(quote=quoted_quote).exists()
        quoted_quote.refresh_from_db()
        assert quoted_quote.status == QuoteRequest.STATUS_APPROVED

    def test_staff_converts_anonymous_quote_to_order(self, staff_client, product):
        quote = QuoteRequest.objects.create(
            user=None,
            client_name="Cliente Anónimo",
            client_email="anon@example.com",
            client_phone="258840000000",
            status=QuoteRequest.STATUS_QUOTED,
            final_price="1000.00",
        )
        QuoteItem.objects.create(
            quote=quote,
            product=product,
            description="Cartão de Visita",
            quantity=1,
        )
        url = reverse("quote-convert-to-order", kwargs={"reference": quote.reference})
        response = staff_client.post(url)
        assert response.status_code == 201
        order = Order.objects.get(quote=quote)
        assert order.user is None
        assert order.client_name_display == "Cliente Anónimo"
        quote.refresh_from_db()
        assert quote.status == QuoteRequest.STATUS_APPROVED

    def test_artwork_approval_flow(self, staff_client, authenticated_client, quote):
        staff_client.post(
            reverse("quote-upload-proof", kwargs={"reference": quote.reference}),
            {"designer_comment": "Revisão"},
            format="json",
        )
        response = authenticated_client.post(
            reverse("quote-approve", kwargs={"reference": quote.reference}),
            {"comment": "OK"},
            format="json",
        )
        assert response.status_code == 200
        quote.refresh_from_db()
        assert quote.artwork.status == ArtworkApproval.STATUS_APPROVED
