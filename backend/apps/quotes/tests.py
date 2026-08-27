import pytest
from django.urls import reverse

from apps.orders.models import Order
from apps.quotes.models import ArtworkApproval, QuoteItem, QuoteRequest


@pytest.mark.django_db
class TestQuoteApi:
    def test_staff_creates_priced_manual_quote(self, staff_client, client_user, product):
        response = staff_client.post(
            reverse("quote-manual"),
            {
                "user_id": client_user.id,
                "items": [
                    {
                        "product_id": product.id,
                        "description": "Cartões de visita premium",
                        "quantity": 2,
                        "unit_price": "750.00",
                    }
                ],
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.json()["status"] == QuoteRequest.STATUS_QUOTED
        assert response.json()["final_price"] == 1500.0
        assert response.json()["client_email"] == client_user.email

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

    def test_internal_notes_hidden_from_client(self, authenticated_client, staff_client, quote):
        quote.internal_notes = "Nota confidencial da equipa"
        quote.save(update_fields=["internal_notes"])
        url = reverse("quote-detail", kwargs={"reference": quote.reference})

        response = authenticated_client.get(url)
        assert response.status_code == 200
        assert response.json()["internal_notes"] is None

        response = staff_client.get(url)
        assert response.json()["internal_notes"] == "Nota confidencial da equipa"

    def test_approval_and_conversion_record_activity(self, authenticated_client, staff_client, quoted_quote):
        authenticated_client.post(
            reverse("quote-approve-price", kwargs={"reference": quoted_quote.reference}),
            {"comment": "Aceito"},
            format="json",
        )
        staff_client.post(
            reverse("quote-convert-to-order", kwargs={"reference": quoted_quote.reference})
        )
        quoted_quote.refresh_from_db()
        actions = list(quoted_quote.activity_events.values_list("action", flat=True))
        assert "price_approved" in actions
        assert "converted_to_order" in actions
        order = quoted_quote.order
        assert order.activity_events.filter(action="created").exists()

    def test_activity_visible_in_detail(self, authenticated_client, quoted_quote):
        authenticated_client.post(
            reverse("quote-approve-price", kwargs={"reference": quoted_quote.reference}),
            {"comment": "Aceito"},
            format="json",
        )
        response = authenticated_client.get(
            reverse("quote-detail", kwargs={"reference": quoted_quote.reference})
        )
        activity = response.json()["activity"]
        assert any(event["action"] == "price_approved" for event in activity)
        # Client-facing actor label hides individual staff names.
        assert all(event["actor_name"] in (None, "Cliente Teste", "Equipa MP") for event in activity)

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
        # Conversion is only possible after the price approval is recorded.
        url = reverse("quote-convert-to-order", kwargs={"reference": quoted_quote.reference})
        response = staff_client.post(url)
        assert response.status_code == 400
        assert not Order.objects.filter(quote=quoted_quote).exists()

        staff_client.post(
            reverse("quote-approve-price", kwargs={"reference": quoted_quote.reference}),
            {"comment": "Aprovado por telefone"},
            format="json",
        )
        response = staff_client.post(url)
        assert response.status_code == 201
        assert Order.objects.filter(quote=quoted_quote).exists()
        quoted_quote.refresh_from_db()
        assert quoted_quote.status == QuoteRequest.STATUS_APPROVED

    def test_client_approve_price_records_provenance(self, authenticated_client, quoted_quote, client_user):
        url = reverse("quote-approve-price", kwargs={"reference": quoted_quote.reference})
        response = authenticated_client.post(url, {"comment": "Aceito"}, format="json")
        assert response.status_code == 200
        quoted_quote.refresh_from_db()
        assert quoted_quote.price_approved_at is not None
        assert quoted_quote.price_approved_by == client_user
        assert quoted_quote.price_approval_comment == "Aceito"

    def test_staff_set_status_approved_records_provenance(self, staff_client, quoted_quote, staff_user):
        url = reverse("quote-set-status", kwargs={"reference": quoted_quote.reference})
        response = staff_client.post(url, {"status": "approved"}, format="json")
        assert response.status_code == 200
        quoted_quote.refresh_from_db()
        assert quoted_quote.price_approved_by == staff_user

    def test_invalid_status_transition_rejected(self, staff_client, quote):
        url = reverse("quote-set-status", kwargs={"reference": quote.reference})
        response = staff_client.post(url, {"status": "delivered"}, format="json")
        assert response.status_code == 400
        quote.refresh_from_db()
        assert quote.status == QuoteRequest.STATUS_RECEIVED

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
        # Anonymous quotes have no portal account, so staff records the
        # approval on the client's behalf before converting.
        staff_client.post(
            reverse("quote-approve-price", kwargs={"reference": quote.reference}),
            {"comment": "Aprovado presencialmente"},
            format="json",
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

    def test_quote_pdf_download(self, authenticated_client, quote):
        response = authenticated_client.get(
            reverse("quote-pdf", kwargs={"reference": quote.reference})
        )
        assert response.status_code == 200
        assert response["Content-Type"] == "application/pdf"
        assert b"".join(response.streaming_content).startswith(b"%PDF")

    def test_quote_pdf_requires_auth(self, quote):
        from rest_framework.test import APIClient

        response = APIClient().get(
            reverse("quote-pdf", kwargs={"reference": quote.reference})
        )
        assert response.status_code == 401

    def test_proof_versions_keep_history(self, staff_client, authenticated_client, quote):
        from django.core.files.uploadedfile import SimpleUploadedFile

        url = reverse("quote-upload-proof", kwargs={"reference": quote.reference})
        staff_client.post(
            url,
            {"proof_file": SimpleUploadedFile("v1.png", b"\x89PNG\r\n\x1a\n", content_type="image/png"), "designer_comment": "Primeira versão"},
            format="multipart",
        )
        staff_client.post(
            url,
            {"proof_file": SimpleUploadedFile("v2.png", b"\x89PNG\r\n\x1a\n", content_type="image/png"), "designer_comment": "Corrigida"},
            format="multipart",
        )

        response = authenticated_client.post(
            reverse("quote-request-change", kwargs={"reference": quote.reference}),
            {"comment": "Ajustar o verde"},
            format="json",
        )
        assert response.status_code == 200

        quote.refresh_from_db()
        versions = list(quote.proof_versions.all())
        assert len(versions) == 2
        assert versions[0].version == 2  # newest first
        assert versions[0].client_decision == "changes_requested"
        assert versions[0].client_comment == "Ajustar o verde"
        assert versions[1].client_decision == "pending"
