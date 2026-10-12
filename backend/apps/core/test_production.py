from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import PortalNotification
from apps.quotes.models import ArtworkProofVersion


@pytest.fixture
def production_api(db):
    user = User.objects.create_user("production-secure", is_staff=True)
    user.profile.staff_role = StaffRole.PRODUCTION
    user.profile.save()
    api = APIClient()
    api.force_authenticate(user)
    return api


def upload(api, quote, content=b"%PDF-1.4\n%%EOF"):
    return api.post(
        f"/api/production/{quote.reference}/artwork/",
        {"file": SimpleUploadedFile("arte.pdf", content), "comment": "Rever cor e alinhamento"},
        format="multipart",
    )


def publish(api, quote, version):
    return api.post(f"/api/production/{quote.reference}/publish/{version.pk}/")


def assert_no_finance(data):
    forbidden = {
        "final_price",
        "estimated_price",
        "amount_paid",
        "amount_due",
        "unit_price",
        "payment_status",
        "invoice_reference",
        "discount_amount",
        "discount_percentage",
        "terms",
        "proposal_history",
        "profile",
        "internal_notes",
    }
    if isinstance(data, dict):
        assert not forbidden.intersection(data)
        for value in data.values():
            assert_no_finance(value)
    elif isinstance(data, list):
        for row in data:
            assert_no_finance(row)


@pytest.mark.django_db
class TestProduction:
    def test_production_cannot_access_commercial_or_financial_routes(
        self, production_api, quote, order
    ):
        for path in (
            "/api/quotes/",
            f"/api/quotes/{quote.reference}/",
            f"/api/quotes/{quote.reference}/pdf/",
            "/api/quotes/export/",
            "/api/invoices/",
            "/api/admin/stats/",
            f"/api/orders/{order.reference}/payments/",
        ):
            assert production_api.get(path).status_code == 403, path
        assert (
            production_api.post(
                f"/api/quotes/{quote.reference}/upload-proof/", {"designer_comment": "No bypass"}
            ).status_code
            == 403
        )
        assert_no_finance(production_api.get("/api/orders/").data)
        response = production_api.get(f"/api/orders/{order.reference}/")
        assert response.status_code == 200
        assert_no_finance(response.data)
        response = production_api.post(
            f"/api/orders/{order.reference}/set-delivery/",
            {"delivery_method": "delivery", "delivery_address": "Maputo"},
            format="json",
        )
        assert response.status_code == 200
        assert_no_finance(response.data)

    def test_workspace_is_a_technical_whitelist(self, production_api, quoted_quote, client_user):
        quoted_quote.internal_notes = "Discount and financing secret"
        quoted_quote.production_notes = "Confirmar alinhamento do logótipo"
        quoted_quote.save()
        response = production_api.get("/api/production/")
        assert response.status_code == 200
        assert_no_finance(response.data)
        assert "Discount and financing secret" not in str(response.data)
        assert response.data["results"][0]["production_notes"] == quoted_quote.production_notes
        assert APIClient().get("/api/production/").status_code == 401
        client = APIClient()
        client.force_authenticate(client_user)
        assert client.get("/api/production/").status_code == 403

    def test_draft_is_private_and_publish_does_not_change_commercial_status(
        self, production_api, quoted_quote, authenticated_client
    ):
        assert upload(production_api, quoted_quote).status_code == 201
        version = ArtworkProofVersion.objects.get(quote=quoted_quote)
        assert not version.published_at and not version.file
        assert authenticated_client.get(f"/api/artwork-files/{version.pk}/").status_code == 404
        detail = authenticated_client.get(f"/api/quotes/{quoted_quote.reference}/").data
        assert not detail["proof_versions"]
        assert (
            production_api.get(
                f"/api/production/{quoted_quote.reference}/files/{version.pk}/"
            ).status_code
            == 200
        )
        published = publish(production_api, quoted_quote, version)
        assert published.status_code == 200
        assert_no_finance(published.data["job"])
        quoted_quote.refresh_from_db()
        assert quoted_quote.status == "quoted" and not quoted_quote.price_approved_at
        detail = authenticated_client.get(f"/api/quotes/{quoted_quote.reference}/").data
        assert detail["artwork"]["proof_file"] == f"/api/artwork-files/{version.pk}/"
        assert detail["proof_versions"][0]["id"] == version.pk
        assert PortalNotification.objects.filter(
            recipient=quoted_quote.user,
            href=f"/area-cliente/orcamentos/{quoted_quote.reference}",
        ).count() == 1

    def test_shared_link_only_reviews_art_and_is_revocable(self, production_api, quoted_quote):
        upload(production_api, quoted_quote)
        version = ArtworkProofVersion.objects.get(quote=quoted_quote)
        data = publish(production_api, quoted_quote, version).data
        token = data["review_path"].rsplit("/", 1)[-1]
        api = APIClient()
        url = f"/api/art-review/{token}/"
        response = api.get(url)
        assert response.status_code == 200
        assert_no_finance(response.data)
        assert "client_email" not in response.data and "client_name" not in response.data
        assert api.get(response.data["file_url"]).status_code == 200
        assert (
            api.post(
                url,
                {"decision": "changes_requested", "name": "Dário", "comment": ""},
                format="json",
            ).status_code
            == 400
        )
        assert (
            api.post(
                url,
                {"decision": "approved", "name": "Dário", "comment": "Cores confirmadas"},
                format="json",
            ).status_code
            == 200
        )
        quoted_quote.refresh_from_db()
        version.refresh_from_db()
        assert version.decision_source == "shared_link" and version.reviewer_name == "Dário"
        assert not quoted_quote.price_approved_at and quoted_quote.status == "quoted"
        assert (
            api.post(url, {"decision": "approved", "name": "Dário"}, format="json").status_code
            == 400
        )
        production_api.post(f"/api/production/{quoted_quote.reference}/revoke/{version.pk}/")
        assert api.get(url).status_code == 404
        assert api.get(url + "file/").status_code == 404

    def test_link_expiry_tampering_and_stale_versions(self, production_api, quoted_quote):
        upload(production_api, quoted_quote)
        first = ArtworkProofVersion.objects.get(quote=quoted_quote)
        token = publish(production_api, quoted_quote, first).data["review_path"].rsplit("/", 1)[-1]
        url = f"/api/art-review/{token}/"
        api = APIClient()
        assert api.get(url.replace(token, token + "x")).status_code == 404
        upload(production_api, quoted_quote)
        second = quoted_quote.proof_versions.first()
        publish(production_api, quoted_quote, second)
        assert not api.get(url).data["current"]
        assert (
            api.post(url, {"decision": "approved", "name": "Cliente"}, format="json").status_code
            == 400
        )
        first.share_expires_at = timezone.now() - timedelta(seconds=1)
        first.save()
        assert api.get(url).status_code == 404

    def test_branddesk_decision_is_scoped_to_account_and_current_version(
        self, production_api, quoted_quote, authenticated_client
    ):
        upload(production_api, quoted_quote)
        version = quoted_quote.proof_versions.first()
        publish(production_api, quoted_quote, version)
        url = f"/api/quotes/{quoted_quote.reference}/approve/"
        assert authenticated_client.post(url, {}, format="json").status_code == 400
        assert (
            authenticated_client.post(url, {"version_id": version.pk}, format="json").status_code
            == 200
        )
        version.refresh_from_db()
        assert version.decision_source == "branddesk"
        quoted_quote.refresh_from_db()
        assert quoted_quote.status == "quoted"
        assert quoted_quote.price_approved_at is None
        assert PortalNotification.objects.filter(
            recipient=production_api.handler._force_user,
            href="/admin/producao",
        ).exists()
        upload(production_api, quoted_quote)
        revised = quoted_quote.proof_versions.first()
        publish(production_api, quoted_quote, revised)
        assert authenticated_client.post(
            f"/api/quotes/{quoted_quote.reference}/request-change/",
            {"version_id": revised.pk, "comment": "Ajustar o logótipo"}, format="json",
        ).status_code == 200
        quoted_quote.refresh_from_db()
        assert quoted_quote.status == "quoted"
        assert quoted_quote.price_approved_at is None
        other = User.objects.create_user("other-client-art")
        client = APIClient()
        client.force_authenticate(other)
        assert client.get(f"/api/artwork-files/{version.pk}/").status_code == 404
        production_api.post(f"/api/production/{quoted_quote.reference}/revoke/{version.pk}/")
        assert authenticated_client.get(f"/api/artwork-files/{version.pk}/").status_code == 200

    def test_production_waits_for_latest_art_approval(self, production_api, order, quote):
        quote.status = "approved"
        quote.save()
        upload(production_api, quote)
        version = quote.proof_versions.first()
        url = f"/api/orders/{order.reference}/set-status/"
        assert (
            production_api.post(url, {"status": "in_production"}, format="json").status_code == 400
        )
        token = publish(production_api, quote, version).data["review_path"].rsplit("/", 1)[-1]
        APIClient().post(
            f"/api/art-review/{token}/", {"decision": "approved", "name": "Cliente"}, format="json"
        )
        assert (
            production_api.post(url, {"status": "in_production"}, format="json").status_code == 200
        )

    def test_invalid_upload_and_foreign_file_are_rejected(
        self, production_api, quoted_quote, quote
    ):
        assert (
            upload(production_api, quoted_quote, b"<script>malicious</script>").status_code == 400
        )
        assert not ArtworkProofVersion.objects.exists()
        assert (
            upload(production_api, quoted_quote, b"%PDF-" + b"x" * (3 * 1024 * 1024)).status_code
            == 400
        )
        assert (
            production_api.get(f"/api/production/{quoted_quote.reference}/files/99999/").status_code
            == 404
        )
