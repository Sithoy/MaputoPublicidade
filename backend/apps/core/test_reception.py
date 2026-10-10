import json

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import PortalNotification, SupportConversation
from apps.quotes.models import QuoteRequest, QuoteRequestAttachment

BASE = "/api/reception/"


@pytest.fixture
def reception_api(staff_user):
    staff_user.profile.staff_role = StaffRole.RECEPTIONIST
    staff_user.profile.save(update_fields=["staff_role"])
    api = APIClient()
    api.force_authenticate(staff_user)
    return api


@pytest.mark.django_db
class TestReception:
    def test_complete_minimal_briefing_without_replacing_client_source(self, reception_api, quote):
        quote.notes = "Mensagem original"
        quote.briefing = {"project_name": "Original", "intent": "guidance"}
        quote.save(update_fields=["notes", "briefing"])
        existing = quote.items.get()
        url = f"{BASE}{quote.reference}/"
        reception_api.post(url + "claim/")
        payload = {
            "briefing": {
                "description": "Materiais para inauguração",
                "deadline": "2026-12-20",
                "fulfilment": "delivery",
                "delivery_address": "Maputo",
                "questions": "Cor por confirmar",
            },
            "items": [
                {"id": existing.pk, "description": "Cartões", "quantity": 300, "size": "9 × 5 cm"},
                {
                    "description": "Roll-up",
                    "quantity": 2,
                    "material": "Lona",
                    "specifications": "Base metálica",
                },
            ],
        }
        response = reception_api.patch(url, payload, format="json")
        assert response.status_code == 200
        existing.refresh_from_db()
        assert existing.quantity == 300
        assert existing.product_id is not None
        assert existing.unit_price is None
        quote.refresh_from_db()
        assert quote.items.count() == 2
        assert quote.notes == "Mensagem original"
        assert quote.briefing["project_name"] == "Original"
        assert quote.reception_briefing["_original"]["items"][0]["quantity"] == 2
        assert response.data["briefing"]["deadline"] == "2026-12-20"
        assert "_original" not in response.data["briefing"]
        assert (
            quote.activity_events.filter(action="reception_updated", is_internal=True).count() == 1
        )
        assert reception_api.post(url + "handoff/").status_code == 200

    def test_description_only_can_complete_a_request_with_unknown_quantities(self, reception_api):
        quote = QuoteRequest.objects.create(client_name="Cliente", client_phone="841234567")
        url = f"{BASE}{quote.reference}/"
        reception_api.post(url + "claim/")
        assert reception_api.post(url + "handoff/").status_code == 400
        response = reception_api.patch(
            url,
            {
                "briefing": {
                    "description": "Material para evento",
                    "questions": "Quantidade a confirmar",
                },
                "items": [],
            },
            format="json",
        )
        assert response.status_code == 200
        assert response.data["missing_information"] == []
        assert quote.items.count() == 0
        assert reception_api.post(url + "handoff/").status_code == 200

    def test_internal_references_are_atomic_and_private(
        self, reception_api, authenticated_client, quote
    ):
        url = f"{BASE}{quote.reference}/"
        reception_api.post(url + "claim/")
        public = QuoteRequestAttachment.objects.create(
            quote=quote, name="cliente.csv", size=3, content=b"a,b"
        )
        response = reception_api.patch(
            url,
            {
                "payload": json.dumps({"briefing": {"description": "Completar"}}),
                "files": [SimpleUploadedFile("referencia.pdf", b"%PDF-1.4\nreference")],
            },
            format="multipart",
        )
        assert response.status_code == 200
        private = quote.request_attachments.get(is_internal=True)
        detail = authenticated_client.get(f"/api/quotes/{quote.reference}/").data
        assert [file["id"] for file in detail["request_attachments"]] == [public.pk]
        assert detail["reception"] is None
        assert (
            authenticated_client.get(
                f"/api/quotes/{quote.reference}/attachment/?id={private.pk}"
            ).status_code
            == 404
        )
        assert (
            reception_api.get(
                f"/api/quotes/{quote.reference}/attachment/?id={private.pk}"
            ).status_code
            == 200
        )
        response = reception_api.patch(
            url,
            {
                "payload": json.dumps({"client_name": "Não guardar"}),
                "files": [SimpleUploadedFile("script.svg", b"<svg></svg>")],
            },
            format="multipart",
        )
        assert response.status_code == 400
        quote.refresh_from_db()
        assert quote.client_name != "Não guardar"
        assert quote.request_attachments.count() == 2

    @pytest.mark.parametrize(
        "items",
        [
            [],
            [{"id": 999999, "description": "Outro", "quantity": 1}],
            [{"description": "Sem quantidade", "quantity": 0}],
        ],
    )
    def test_invalid_item_lists_cannot_delete_or_rebind_originals(
        self, reception_api, quote, items
    ):
        url = f"{BASE}{quote.reference}/"
        reception_api.post(url + "claim/")
        assert reception_api.patch(url, {"items": items}, format="json").status_code == 400
        assert quote.items.get().quantity == 2

    def test_nested_prices_and_ownership_are_rejected(self, reception_api, quote):
        url = f"{BASE}{quote.reference}/"
        reception_api.post(url + "claim/")
        item = quote.items.get()
        assert (
            reception_api.patch(
                url,
                {
                    "items": [
                        {"id": item.pk, "description": "Cartões", "quantity": 2, "unit_price": 10}
                    ]
                },
                format="json",
            ).status_code
            == 400
        )
        assert (
            reception_api.patch(
                url, {"briefing": {"_original": {"fake": True}}}, format="json"
            ).status_code
            == 400
        )

    @pytest.mark.parametrize(
        "role", [StaffRole.PRODUCTION, StaffRole.FINANCE, StaffRole.CONTENT, StaffRole.COMMERCIAL]
    )
    def test_other_roles_cannot_change_triage(self, staff_client, staff_user, role, quote):
        staff_user.profile.staff_role = role
        staff_user.profile.save(update_fields=["staff_role"])
        assert staff_client.get(BASE).status_code == 403
        assert staff_client.post(f"{BASE}{quote.reference}/claim/").status_code == 403

    def test_clients_cannot_access(self, authenticated_client, quote):
        assert authenticated_client.get(BASE + "summary/").status_code == 403
        assert (
            authenticated_client.patch(
                f"{BASE}{quote.reference}/", {"client_name": "Outro"}
            ).status_code
            == 403
        )

    def test_summary_and_queue_exclude_commercial_work(
        self, reception_api, client_user, quote, order
    ):
        # The order fixture has moved the original quote to approved.
        waiting = QuoteRequest.objects.create(
            client_name="Balcão", client_phone="841234567", notes="Preciso de cartões"
        )
        QuoteRequest.objects.create(client_name="Comercial", status="reviewing")
        SupportConversation.objects.create(client=client_user, subject="Dúvida")
        summary = reception_api.get(BASE + "summary/").data
        assert summary["counts"]["queue"] == 1
        assert summary["counts"]["messages"] == 1
        assert [row["reference"] for row in reception_api.get(BASE).data["results"]] == [
            waiting.reference
        ]
        assert "final_price" not in reception_api.get(BASE).data["results"][0]

    def test_assume_confirm_handoff_uses_original_record(
        self, reception_api, staff_user, quote, authenticated_client
    ):
        commercial = User.objects.create_user("commercial-reception", is_staff=True)
        commercial.profile.staff_role = StaffRole.COMMERCIAL
        commercial.profile.save(update_fields=["staff_role"])
        url = f"{BASE}{quote.reference}/"
        assert reception_api.patch(url, {"reception_notes": "Antes de assumir"}).status_code == 400
        assert reception_api.post(url + "claim/").data["reception_owner"] == staff_user.pk
        quote.refresh_from_db()
        assert quote.status == "reviewing"
        assert reception_api.get(BASE + "?scope=mine").data["count"] == 1
        assert (
            reception_api.patch(
                url,
                {"client_phone": "841111111", "reception_notes": "Cliente prefere levantamento."},
            ).status_code
            == 200
        )
        assert reception_api.post(url + "handoff/").status_code == 200
        quote.refresh_from_db()
        assert quote.reception_completed_at is not None
        assert quote.client_phone == "841111111"
        assert QuoteRequest.objects.count() == 1
        assert quote.final_price is None
        assert reception_api.get(BASE).data["count"] == 0
        assert reception_api.post(url + "handoff/").status_code == 404
        assert PortalNotification.objects.filter(recipient=commercial).count() == 1
        commercial_api = APIClient()
        commercial_api.force_authenticate(commercial)
        commercial_data = commercial_api.get(f"/api/quotes/{quote.reference}/").data
        assert commercial_data["reception"]["notes"] == "Cliente prefere levantamento."
        client_data = authenticated_client.get(f"/api/quotes/{quote.reference}/").data
        assert client_data["reception"] is None
        assert not any("levantamento" in event["comment"] for event in client_data["activity"])

    def test_triage_cannot_change_prices_status_or_ownership(self, reception_api, quote):
        url = f"{BASE}{quote.reference}/"
        reception_api.post(url + "claim/")
        for key, value in (
            ("final_price", "50"),
            ("status", "approved"),
            ("reception_owner", 99),
            ("notes", "Substituir original"),
        ):
            assert reception_api.patch(url, {key: value}, format="json").status_code == 400
        quote.refresh_from_db()
        assert quote.final_price is None
        assert quote.status == "reviewing"

    def test_incomplete_contact_blocks_handoff(self, reception_api, quote):
        url = f"{BASE}{quote.reference}/"
        reception_api.post(url + "claim/")
        reception_api.patch(url, {"client_email": "", "client_phone": ""})
        assert reception_api.post(url + "handoff/").status_code == 400
        quote.refresh_from_db()
        assert quote.reception_completed_at is None

    def test_no_stealing_and_release_preserves_notes(self, reception_api, staff_user, quote):
        other = User.objects.create_user("other-reception", is_staff=True)
        other.profile.staff_role = StaffRole.RECEPTIONIST
        other.profile.save(update_fields=["staff_role"])
        other_api = APIClient()
        other_api.force_authenticate(other)
        url = f"{BASE}{quote.reference}/"
        reception_api.post(url + "claim/")
        reception_api.patch(url, {"reception_notes": "Confirmar material."})
        assert other_api.post(url + "claim/").status_code == 400
        assert other_api.post(url + "release/").status_code == 400
        assert reception_api.post(url + "release/").status_code == 200
        assert other_api.post(url + "claim/").status_code == 200
        quote.refresh_from_db()
        assert quote.reception_owner == other
        assert quote.reception_notes == "Confirmar material."
