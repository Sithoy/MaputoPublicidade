from unittest.mock import patch

import pytest
from django.urls import reverse

from .models import QuoteRequest


@pytest.mark.django_db
def test_manual_proposal_has_single_identity_and_nuit(staff_client, client_user):
    client_user.profile.company = "Empresa antiga do perfil"
    client_user.profile.nuit = "400000111"
    client_user.profile.save()
    with patch("apps.quotes.views.notify_quote_ready"):
        response = staff_client.post(reverse("quote-manual"), {
            "user_id": client_user.id, "client_name": "Empresa Horizonte, Lda",
            "client_company": "", "client_nuit": "400123456",
            "estimated_delivery_days": 7, "payment_option": "deposit_50",
            "items": [{"description": "Cartões", "quantity": 100, "unit_price": "5.00"}],
        }, format="json")
    assert response.status_code == 201
    assert response.data["client_name"] == "Empresa Horizonte, Lda"
    assert response.data["client_company"] == ""
    assert response.data["client_nuit"] == "400123456"
    quote = QuoteRequest.objects.get(reference=response.data["reference"])
    assert quote.client_nuit == "400123456"


@pytest.mark.django_db
def test_quote_identity_and_nuit_edit_is_staff_only(staff_client, authenticated_client, quote):
    url = reverse("quote-detail", args=[quote.reference])
    data = {"client_name": "Maria Nhaule", "client_company": "", "client_nuit": "400987654"}
    assert authenticated_client.patch(url, data, format="json").status_code == 403
    response = staff_client.patch(url, data, format="json")
    assert response.status_code == 200
    quote.refresh_from_db()
    assert quote.client_name == "Maria Nhaule"
    assert quote.client_nuit == "400987654"
    assert staff_client.get(url).data["client_nuit"] == "400987654"
    assert staff_client.patch(url, {"client_name": ""}, format="json").status_code == 400


@pytest.mark.django_db
def test_optional_nuit_can_be_blank_for_individual(staff_client, client_user):
    client_user.profile.nuit = "400000111"
    client_user.profile.save()
    with patch("apps.quotes.views.notify_quote_ready"):
        response = staff_client.post(reverse("quote-manual"), {
            "user_id": client_user.id, "client_name": "Maria Nhaule", "client_nuit": "", "client_company": "",
            "estimated_delivery_days": 5, "items": [{"description": "Impressão", "quantity": 1, "unit_price": "50"}],
        }, format="json")
    assert response.status_code == 201
    assert response.data["client_nuit"] == ""


@pytest.mark.django_db
def test_quote_nuit_is_carried_to_invoice(staff_client, order, client_user):
    client_user.profile.nuit = "400000111"
    client_user.profile.save()
    order.quote.client_nuit = "400123456"
    order.quote.save(update_fields=["client_nuit"])
    response = staff_client.post(reverse("invoice-list"), {"order_reference": order.reference}, format="json")
    assert response.status_code == 201, response.data
    assert response.data["client_nuit"] == "400123456"


@pytest.mark.django_db
def test_quote_pdf_identity_is_not_duplicated(quote):
    from apps.core.documents import _client_block, build_quote_pdf
    quote.client_company = "Empresa Horizonte"
    quote.client_name = "Contacto antigo"
    quote.client_nuit = "400123456"
    quote.save()
    with patch("apps.core.documents._client_block", wraps=_client_block) as block:
        result = build_quote_pdf(quote)
    assert result.startswith(b"%PDF")
    lines = block.call_args.args[2]
    assert lines[0] == "Empresa Horizonte"
    assert "NUIT 400123456" in lines
    assert "Contacto antigo" not in lines
