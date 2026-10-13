from unittest.mock import patch

import pytest
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.models import SupportConversation, SupportMessage
from apps.core.tracking_views import MAX_AGE, tracking_token


@pytest.fixture(autouse=True)
def tracking_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestTracking:
    def test_reference_is_not_a_credential_and_token_is_scoped(self, quote):
        client = APIClient()
        assert client.get("/api/tracking/detail/", {"reference": quote.reference}).status_code == 403
        token = tracking_token(quote)
        response = client.get("/api/tracking/detail/", HTTP_X_MP_TRACKING_TOKEN=token)
        assert response.status_code == 200
        assert response.data["reference"] == quote.reference
        assert "no-store" in response["Cache-Control"]
        assert set(response.data) == {"reference", "order_reference", "title", "created_at", "step", "status", "next_action", "scheduled_date"}
        assert client.get("/api/tracking/detail/", HTTP_X_MP_TRACKING_TOKEN=token + "x").status_code == 403
        quote.client_email = "new@example.test"
        quote.save(update_fields=["client_email"])
        assert client.get("/api/tracking/detail/", HTTP_X_MP_TRACKING_TOKEN=token).status_code == 403

    def test_expired_token_is_rejected(self, quote):
        with patch("django.core.signing.time.time", return_value=1000):
            token = tracking_token(quote)
        with patch("django.core.signing.time.time", return_value=1000 + MAX_AGE + 1):
            assert APIClient().get("/api/tracking/detail/", HTTP_X_MP_TRACKING_TOKEN=token).status_code == 403

    def test_received_does_not_mean_production_and_internal_review_stays_private(self, quote):
        client = APIClient()
        quote.proposal_stage = "draft"
        quote.save(update_fields=["proposal_stage"])
        token = tracking_token(quote)
        assert client.get("/api/tracking/detail/", HTTP_X_MP_TRACKING_TOKEN=token).data["step"] == 0
        quote.proposal_stage = "review"
        quote.save(update_fields=["proposal_stage"])
        response = client.get("/api/tracking/detail/", HTTP_X_MP_TRACKING_TOKEN=token)
        assert response.data["status"] == "Em análise"
        assert "Comercial" not in str(response.data)

    def test_status_uses_actual_order_and_only_confirmed_date(self, quote, order):
        order.status = "in_production"
        order.save(update_fields=["status"])
        response = APIClient().get("/api/tracking/detail/", HTTP_X_MP_TRACKING_TOKEN=tracking_token(quote))
        assert response.data["step"] == 3
        assert response.data["scheduled_date"] is None
        order.status = "cancelled"
        order.save(update_fields=["status"])
        assert APIClient().get("/api/tracking/detail/", HTTP_X_MP_TRACKING_TOKEN=tracking_token(quote)).data["step"] is None

    def test_lookup_is_generic_and_sends_only_to_original_email(self, quote, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        client = APIClient()
        missing = client.post("/api/tracking/lookup/", {"reference": quote.reference, "email": "wrong@example.test"})
        match = client.post("/api/tracking/lookup/", {"reference": quote.reference, "email": quote.client_email})
        assert missing.data == match.data
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [quote.client_email]
        assert "/acompanhar#token=" in mail.outbox[0].body
        assert "token" not in match.data
        client.post("/api/tracking/lookup/", {"reference": quote.reference, "email": quote.client_email})
        assert len(mail.outbox) == 1

    def test_guest_chat_reaches_reception_and_staff_can_reply(self, quote, staff_client, settings):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        quote.user = None
        quote.save(update_fields=["user"])
        client = APIClient()
        token = tracking_token(quote)
        assert client.post("/api/tracking/messages/", {"body": "Quando estará pronto?"}, HTTP_X_MP_TRACKING_TOKEN=token).status_code == 201
        conversation = SupportConversation.objects.get(quote=quote, channel="tracking")
        listing = staff_client.get("/api/support-conversations/", {"operational_quote": quote.reference})
        assert listing.status_code == 200
        assert listing.data["results"][0]["client_name"] == quote.client_name
        reply = staff_client.post(f"/api/support-conversations/{conversation.pk}/messages/", {"body": "Estamos a analisar."})
        assert reply.status_code == 201
        assert len(mail.outbox) == 1
        messages = client.get("/api/tracking/messages/", HTTP_X_MP_TRACKING_TOKEN=token).data["messages"]
        assert [row["body"] for row in messages] == ["Quando estará pronto?", "Estamos a analisar."]
        assert messages[1]["is_staff"] is True

    def test_guest_cannot_read_other_branddesk_conversations(self, quote, client_user):
        conversation = SupportConversation.objects.create(client=client_user, quote=quote, subject="Privada")
        SupportMessage.objects.create(conversation=conversation, body="Não partilhar neste acesso")
        client = APIClient()
        assert client.get("/api/tracking/messages/", HTTP_X_MP_TRACKING_TOKEN=tracking_token(quote)).data == {"messages": []}
        assert client.post("/api/tracking/messages/", {"body": ""}, HTTP_X_MP_TRACKING_TOKEN=tracking_token(quote)).status_code == 400
        assert client.post("/api/tracking/messages/", {"body": "Olá"}).status_code == 403
