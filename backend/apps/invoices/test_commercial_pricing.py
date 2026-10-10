from decimal import Decimal
from unittest.mock import patch

import pytest
from django.urls import reverse

from apps.core.documents import build_quote_pdf
from apps.core.pricing import document_totals
from apps.invoices.models import Invoice
from apps.quotes.views import create_order_from_quote


def proposal_payload(quote, **changes):
    return {
        "client_name": quote.client_name,
        "client_phone": "841234567",
        "estimated_delivery_days": 7,
        "discount_type": "percentage",
        "discount_percentage": "10",
        "tax_rate": "16",
        "billing_address": "Av. Eduardo Mondlane, Maputo",
        "valid_until": "2026-12-31",
        "terms": "Instalação não incluída.",
        "items": [
            {
                "item_id": item.id,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": "500.00",
                "notes": "Acabamento mate",
            }
            for item in quote.items.all()
        ],
        **changes,
    }


@pytest.mark.django_db
def test_proposal_discount_and_invoice_conversion_preserve_agreement_and_payment(
    staff_client, quote
):
    with patch("apps.quotes.views.notify_quote_ready"):
        response = staff_client.post(
            reverse("quote-proposal", args=[quote.reference]),
            proposal_payload(quote),
            format="json",
        )
    assert response.status_code == 200, response.data
    quote.refresh_from_db()
    quote.user.profile.company = "Outra empresa no perfil"
    quote.user.profile.save(update_fields=["company"])
    assert quote.final_price == Decimal("1044.00")
    assert quote.discount_amount == Decimal("100.00")
    assert response.data["subtotal"] == 1000
    assert response.data["tax_amount"] == 144
    assert quote.commercial_pricing
    order = create_order_from_quote(quote)
    order.amount_paid = Decimal("522.00")
    order.save(update_fields=["amount_paid"])
    created = staff_client.post(
        reverse("invoice-list"), {"order_reference": order.reference}, format="json"
    )
    assert created.status_code == 201, created.data
    assert created.data["total"] == 1044
    assert created.data["discount_type"] == "percentage"
    assert created.data["discount_percentage"] == 10
    assert created.data["discount_amount"] == 100
    assert created.data["amount_paid"] == 522
    assert created.data["balance_due"] == 522
    assert created.data["billing_address"] == quote.billing_address
    assert created.data["client_company"] == quote.client_company
    assert quote.terms in created.data["terms"]


@pytest.mark.django_db
@pytest.mark.parametrize(
    "changes",
    [
        {"discount_percentage": "101"},
        {"discount_type": "fixed", "discount_amount": "1001"},
        {"tax_rate": "-1"},
    ],
)
def test_invalid_quote_financial_fields_do_not_change_existing_request(
    staff_client, quote, changes
):
    original = quote.items.first().unit_price
    response = staff_client.post(
        reverse("quote-proposal", args=[quote.reference]),
        proposal_payload(quote, **changes),
        format="json",
    )
    assert response.status_code == 400
    quote.refresh_from_db()
    assert not quote.commercial_pricing
    assert quote.items.first().unit_price == original


@pytest.mark.django_db
def test_invoice_percentage_recalculates_when_items_change_and_rejects_excess_fixed_discount(
    staff_client,
):
    response = staff_client.post(
        reverse("invoice-list"),
        {
            "client_name": "Empresa",
            "discount_type": "percentage",
            "discount_percentage": "12.50",
            "tax_rate": "16",
            "items": [{"description": "Vinil", "quantity": "2.5", "unit_price": "100"}],
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    assert response.data["discount_amount"] == Decimal("31.25")
    assert response.data["total"] == Decimal("253.75")
    url = reverse("invoice-detail", args=[response.data["reference"]])
    changed = staff_client.patch(
        url,
        {"items": [{"description": "Vinil", "quantity": "5", "unit_price": "100"}]},
        format="json",
    )
    assert changed.status_code == 200
    assert changed.data["discount_amount"] == Decimal("62.50")
    denied = staff_client.patch(
        url, {"discount_type": "fixed", "discount_amount": "501"}, format="json"
    )
    assert denied.status_code == 400
    invoice = Invoice.objects.get(reference=response.data["reference"])
    assert invoice.discount_type == "percentage"


def test_rounding_and_full_discount():
    totals = document_totals("0.05", "percentage", discount_percentage="10", tax_rate="16")
    assert totals["discount_amount"] == Decimal("0.01")
    assert document_totals("100", "percentage", discount_percentage=100)["total"] == 0


@pytest.mark.django_db
def test_quote_pdf_contains_bank_details_specs_percentage_and_no_debt(staff_client, quote):
    fitz = pytest.importorskip("fitz")
    with patch("apps.quotes.views.notify_quote_ready"):
        staff_client.post(
            reverse("quote-proposal", args=[quote.reference]),
            proposal_payload(quote),
            format="json",
        )
    quote.refresh_from_db()
    pdf = fitz.open(stream=build_quote_pdf(quote), filetype="pdf")
    text = " ".join(" ".join(page.get_text().split()) for page in pdf)
    for value in [
        "PROPOSTA COMERCIAL",
        "DADOS BANCÁRIOS",
        "Desconto (10%)",
        "Acabamento mate",
        "NUIT",
        "VALIDADE",
        "Adiantamento previsto",
        "Instalação não incluída.",
    ]:
        assert value in text
    assert "Em dívida" not in text
    pdf.close()
