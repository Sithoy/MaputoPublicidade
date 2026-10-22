from decimal import Decimal
from hashlib import sha256

import pymupdf
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from apps.accounts.roles import StaffRole
from apps.quotes.models import QuoteVatEvidence


def payload(quote, **extra):
    item = quote.items.first()
    return {
        "client_name": quote.client_name, "client_email": quote.client_email,
        "client_nuit": quote.client_nuit, "estimated_delivery_days": 5,
        "tax_rate": 16, "items": [{"item_id": item.pk, "description": "Polos", "quantity": 200, "unit_price": "100"}],
        **extra,
    }


def prepare(client, quote, **extra):
    response = client.post(reverse("quote-proposal", args=[quote.reference]), payload(quote, **extra), format="json")
    assert response.status_code == 200, response.data
    quote.refresh_from_db()
    return response


def workflow(client, quote, action="send"):
    return client.post(reverse("quote-proposal-workflow", args=[quote.reference]),
                       {"action": action, "version": quote.proposal_version}, format="json")


def upload(client, quote, name="proof.pdf", content=b"%PDF-1.4\nlocal test evidence"):
    return client.post(reverse("quote-vat-evidence", args=[quote.reference]),
                       {"file": SimpleUploadedFile(name, content)}, format="multipart")


@pytest.mark.django_db
class TestProposalVat:
    def test_draft_pdf_marks_unconfirmed_exemption_and_never_includes_private_reason(self, staff_client, quote):
        prepare(staff_client, quote, tax_rate=0, vat_exempt=True, vat_exemption_reason="PRIVATE_FISCAL_REASON")
        response = staff_client.get(reverse("quote-pdf", args=[quote.reference]))
        assert response.status_code == 200
        with pymupdf.open(stream=b"".join(response.streaming_content), filetype="pdf") as document:
            text = "".join(page.get_text() for page in document)
            assert "Isento de IVA" in text
            assert "por confirmar" in text
            assert "PRIVATE_FISCAL_REASON" not in text
        assert upload(staff_client, quote).status_code == 200
        response = staff_client.get(reverse("quote-pdf", args=[quote.reference]))
        with pymupdf.open(stream=b"".join(response.streaming_content), filetype="pdf") as document:
            assert "por confirmar" not in "".join(page.get_text() for page in document)

    def test_evidence_upload_honours_reception_edit_reservations(self, staff_client, quote):
        from apps.core.test_reception_lease import editor, reserve

        prepare(staff_client, quote, tax_rate=0, vat_exempt=True)
        first, _ = editor("vat-first")
        second, _ = editor("vat-second")
        assert upload(first, quote).status_code == 409
        assert reserve(first, quote).status_code == 200
        assert upload(second, quote).status_code == 409
        assert upload(first, quote).status_code == 200

    def test_production_staff_cannot_access_fiscal_evidence(self, staff_client, staff_user, quote):
        staff_user.profile.staff_role = StaffRole.PRODUCTION
        staff_user.profile.save()
        url = reverse("quote-vat-evidence", args=[quote.reference])
        assert staff_client.get(url).status_code == 403
        assert staff_client.post(url, {}).status_code == 403

    def test_standard_rate_and_total_are_enforced(self, staff_client, quote):
        prepare(staff_client, quote)
        assert quote.tax_rate == Decimal("16")
        assert quote.final_price == Decimal("23200")
        response = staff_client.post(reverse("quote-proposal", args=[quote.reference]), payload(quote, tax_rate=5), format="json")
        assert response.status_code == 400

    def test_unpriced_request_cannot_bypass_exemption_with_zero_rate(self, staff_client, quote):
        response = staff_client.post(reverse("quote-proposal", args=[quote.reference]), payload(quote, tax_rate=0), format="json")
        assert response.status_code == 400

    def test_missing_rate_defaults_to_16_on_new_commercial_quote(self, staff_client, quote):
        data = payload(quote)
        data.pop("tax_rate")
        response = staff_client.post(reverse("quote-proposal", args=[quote.reference]), data, format="json")
        assert response.status_code == 200
        quote.refresh_from_db()
        assert quote.tax_rate == 16

    def test_historical_zero_rate_is_not_reinterpreted_as_exemption(self, staff_client, quote):
        quote.commercial_pricing = True
        quote.tax_rate = 0
        quote.save()
        prepare(staff_client, quote, tax_rate=0)
        assert not quote.vat_exempt
        assert workflow(staff_client, quote).status_code == 200

    def test_exempt_draft_can_save_but_cannot_send_without_evidence(self, staff_client, quote):
        prepare(staff_client, quote, tax_rate=0, vat_exempt=True, vat_exemption_reason="Documento pendente")
        assert quote.final_price == Decimal("20000")
        assert workflow(staff_client, quote, "save").status_code == 200
        quote.refresh_from_db()
        assert workflow(staff_client, quote).status_code == 400
        quote.refresh_from_db()
        assert quote.proposal_stage == "approved"

    def test_upload_audit_private_access_and_send_snapshot(self, staff_client, staff_user, authenticated_client, quote):
        prepare(staff_client, quote, tax_rate=0, vat_exempt=True, vat_exemption_reason="Comprovativo apresentado")
        response = upload(staff_client, quote)
        assert response.status_code == 200, response.data
        evidence = QuoteVatEvidence.objects.get(quote=quote)
        assert evidence.uploaded_by == staff_user
        assert evidence.checksum == sha256(bytes(evidence.content)).hexdigest()
        assert response.data["vat_exemption"]["evidence"]["name"] == "proof.pdf"
        url = reverse("quote-vat-evidence", args=[quote.reference])
        assert authenticated_client.get(url).status_code == 403
        assert authenticated_client.post(url, {}).status_code == 403
        download = staff_client.get(url)
        assert download.status_code == 200
        assert download["Cache-Control"] == "private, no-store"
        assert workflow(staff_client, quote).status_code == 200
        quote.refresh_from_db()
        assert quote.proposal_history[-1]["snapshot"]["vat_evidence"]["checksum"] == evidence.checksum
        detail = authenticated_client.get(reverse("quote-detail", args=[quote.reference]))
        assert detail.status_code == 200
        assert detail.data["vat_exempt"] is True
        assert detail.data["vat_exemption"] is None
        assert "Comprovativo apresentado" not in str(detail.data)

    def test_document_does_not_replace_justification(self, staff_client, quote):
        prepare(staff_client, quote, tax_rate=0, vat_exempt=True)
        assert upload(staff_client, quote).status_code == 200
        assert workflow(staff_client, quote).status_code == 400

    def test_replacements_are_immutable_and_client_changes_need_new_evidence(self, staff_client, quote):
        prepare(staff_client, quote, tax_rate=0, vat_exempt=True, vat_exemption_reason="Isenção documentada")
        assert upload(staff_client, quote).status_code == 200
        assert upload(staff_client, quote, content=b"%PDF-1.4\nreplacement").status_code == 200
        assert QuoteVatEvidence.objects.filter(quote=quote).count() == 2
        download = staff_client.get(reverse("quote-vat-evidence", args=[quote.reference]))
        assert b"".join(download.streaming_content) == b"%PDF-1.4\nreplacement"
        prepare(staff_client, quote, tax_rate=0, vat_exempt=True, client_nuit="999999999")
        assert workflow(staff_client, quote).status_code == 400
        assert staff_client.get(reverse("quote-vat-evidence", args=[quote.reference])).status_code == 404

    @pytest.mark.parametrize("name,content", [("proof.svg", b"<svg/>"), ("proof.pdf", b"not a PDF"), ("proof.pdf", b""), ("proof.pdf", b"%PDF-" + b"a" * (2 * 1024 * 1024))], ids=["active-format", "invalid-pdf", "empty", "oversize"])
    def test_invalid_evidence_is_rejected(self, staff_client, quote, name, content):
        prepare(staff_client, quote, tax_rate=0, vat_exempt=True)
        assert upload(staff_client, quote, name, content).status_code == 400
        assert not QuoteVatEvidence.objects.filter(quote=quote).exists()
