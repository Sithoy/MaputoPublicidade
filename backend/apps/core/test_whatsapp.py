import hashlib
import hashlib as media_hash
import hmac
import json
from datetime import timedelta
from unittest.mock import MagicMock, Mock, patch

import pytest
import requests
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import PortalNotification, SupportConversation, SupportMessage
from apps.core.whatsapp import connection, credentials, store_credentials
from apps.core.whatsapp_templates import describe

BASE = "/api/integrations/whatsapp/"
SECRET = "private-app-secret"
TOKEN = "private-access-token"
VERIFY = "private-verification-token"
DETAILS = {
    "business_phone": "+258841234567",
    "waba_id": "123",
    "phone_number_id": "456",
    "app_id": "789",
    "api_version": "v25.0",
    "mode": "coexistence",
    "onboarding_confirmed": True,
}

TEMPLATE = {
    "id": "111",
    "name": "orcamento_pronto",
    "language": "pt_PT",
    "category": "UTILITY",
    "status": "APPROVED",
    "components": [{"type": "BODY", "text": "Olá {{1}}, a proposta {{2}} está pronta."}],
}


def template_values(row=None):
    row = row or TEMPLATE
    return {
        "template_id": row["id"],
        "revision": describe(row)["revision"],
        "name": row["name"],
        "language": row["language"],
        "parameters": {"body:1": "Dário", "body:2": "MP-0001-2026"},
        "confirmed": True,
        "consent_note": "Autorização por email",
    }


@pytest.fixture(autouse=True)
def clear_throttles():
    cache.clear()


@pytest.fixture
def admin_api(staff_user):
    staff_user.profile.staff_role = StaffRole.ADMINISTRATOR
    staff_user.profile.save()
    api = APIClient()
    api.force_authenticate(staff_user)
    return api


@pytest.fixture
def configured(db):
    config = connection()
    config.details = DETAILS.copy()
    store_credentials(config, {"access_token": TOKEN, "app_secret": SECRET, "verify_token": VERIFY})
    config.tested_at = config.webhook_verified_at = timezone.now()
    config.enabled = True
    config.save()
    return config


def payload(message=None, field="messages", status=None):
    value = {
        "metadata": {"phone_number_id": "456"},
        "contacts": [{"wa_id": "258849999999", "profile": {"name": "Cliente WhatsApp"}}],
    }
    if message:
        value["message_echoes" if field == "smb_message_echoes" else "messages"] = [message]
    if status:
        value["statuses"] = [status]
    return {
        "object": "whatsapp_business_account",
        "entry": [{"id": "123", "changes": [{"field": field, "value": value}]}],
    }


def message(identifier="wamid.incoming", age=0, echo=False):
    return {
        "id": identifier,
        "to" if echo else "from": "258849999999",
        "timestamp": str(int((timezone.now() - timedelta(hours=age)).timestamp())),
        "type": "text",
        "text": {"body": "Preciso de 200 cadernos"},
    }


def webhook(data, signed=True):
    raw = json.dumps(data).encode()
    signature = "sha256=" + hmac.new(SECRET.encode(), raw, hashlib.sha256).hexdigest()
    return APIClient().post(
        BASE + "webhook/",
        raw,
        content_type="application/json",
        HTTP_X_HUB_SIGNATURE_256=signature if signed else "forged",
    )


@pytest.mark.django_db
class TestWhatsApp:
    @patch("apps.core.whatsapp.requests.request")
    def test_templates_send_after_window_and_record_consent(self, request, configured, admin_api):
        webhook(payload(message(age=25)))
        thread = SupportConversation.objects.get()
        request.side_effect = [
            Mock(json=lambda: {"data": [TEMPLATE]}),
            Mock(json=lambda: {"messages": [{"id": "wamid.template"}]}),
        ]
        response = admin_api.post(
            f"/api/support-conversations/{thread.pk}/templates/", template_values(), format="json"
        )
        assert response.status_code == 201
        assert request.call_args.kwargs["json"]["type"] == "template"
        assert request.call_args.kwargs["json"]["template"]["components"][0]["parameters"] == [
            {"type": "text", "text": "Dário"},
            {"type": "text", "text": "MP-0001-2026"},
        ]
        outbound = SupportMessage.objects.get(whatsapp_id="wamid.template")
        assert outbound.template["consent_note"] == "Autorização por email"
        assert outbound.sender_id and "Dário" in outbound.body
        assert "consent_note" not in response.data["template"]
        thread.refresh_from_db()
        assert thread.last_inbound_at < timezone.now() - timedelta(hours=24)

    @patch("apps.core.whatsapp.requests.request")
    def test_template_guards_and_provider_approval_are_server_enforced(
        self, request, configured, admin_api
    ):
        webhook(payload(message()))
        url = f"/api/support-conversations/{SupportConversation.objects.get().pk}/templates/"
        request.return_value = Mock(json=lambda: {"data": [TEMPLATE]})
        for edits in (
            {"confirmed": False},
            {"consent_note": ""},
            {"parameters": {"body:1": "Only one"}},
            {"template_id": "999"},
            {"revision": "0" * 64},
        ):
            assert (
                admin_api.post(url, {**template_values(), **edits}, format="json").status_code
                == 400
            )
        for changes in (
            {"status": "PAUSED"},
            {"category": "MARKETING"},
            {
                "components": [
                    {"type": "HEADER", "format": "IMAGE"},
                    {"type": "BODY", "text": "Olá"},
                ]
            },
        ):
            row = {**TEMPLATE, **changes}
            request.return_value = Mock(json=lambda row=row: {"data": [row]})
            assert admin_api.post(url, template_values(), format="json").status_code == 400
        assert not SupportMessage.objects.filter(is_staff=True).exists()
        assert all(call.args[0] == "GET" for call in request.call_args_list)

    @patch("apps.core.whatsapp.requests.request")
    def test_named_template_parameters_and_pagination(self, request, configured, admin_api):
        webhook(payload(message()))
        url = f"/api/support-conversations/{SupportConversation.objects.get().pk}/templates/"
        row = {**TEMPLATE, "components": [{"type": "BODY", "text": "Olá {{cliente}}"}]}
        request.return_value = Mock(
            json=lambda: {
                "data": [row],
                "paging": {"next": "https://untrusted", "cursors": {"after": "cursor"}},
            }
        )
        response = admin_api.get(url, {"after": "last"})
        assert response.status_code == 200 and response.data["after"] == "cursor"
        assert request.call_args.kwargs["params"]["after"] == "last"
        request.side_effect = [
            Mock(json=lambda: {"data": [row]}),
            Mock(json=lambda: {"messages": [{"id": "wamid.named"}]}),
        ]
        values = {**template_values(row), "parameters": {"body:cliente": "Dário"}}
        assert admin_api.post(url, values, format="json").status_code == 201
        assert (
            request.call_args.kwargs["json"]["template"]["components"][0]["parameters"][0][
                "parameter_name"
            ]
            == "cliente"
        )

    @patch("apps.core.whatsapp.requests.request")
    def test_failed_template_send_persists_without_retry(self, request, configured, admin_api):
        webhook(payload(message()))
        request.side_effect = [Mock(json=lambda: {"data": [TEMPLATE]}), requests.Timeout(TOKEN)]
        response = admin_api.post(
            f"/api/support-conversations/{SupportConversation.objects.get().pk}/templates/",
            template_values(),
            format="json",
        )
        assert response.status_code == 400 and TOKEN not in str(response.data)
        assert SupportMessage.objects.get(is_staff=True).delivery_status == "unconfirmed"
        assert request.call_count == 2

    @patch("apps.core.whatsapp.requests.request")
    def test_templates_permissions_and_disabled_integration(
        self, request, configured, admin_api, authenticated_client, client_user
    ):
        webhook(payload(message()))
        thread = SupportConversation.objects.get()
        assert (
            authenticated_client.get(
                f"/api/support-conversations/{thread.pk}/templates/"
            ).status_code
            == 404
        )
        branddesk = SupportConversation.objects.create(client=client_user, subject="BrandDesk")
        assert (
            admin_api.get(f"/api/support-conversations/{branddesk.pk}/templates/").status_code
            == 403
        )
        configured.enabled = False
        configured.save()
        assert (
            admin_api.get(f"/api/support-conversations/{thread.pk}/templates/").status_code == 400
        )
        request.assert_not_called()

    @patch("apps.core.whatsapp_media.requests.get")
    @patch("apps.core.whatsapp.requests.request")
    def test_media_private_proxy_and_scoping(
        self, request, download, configured, admin_api, authenticated_client
    ):
        content = b"\x89PNG\r\n\x1a\nexample"
        incoming = message()
        incoming.update(
            type="image",
            image={
                "id": "987",
                "mime_type": "image/png",
                "sha256": media_hash.sha256(content).hexdigest(),
            },
        )
        assert webhook(payload(incoming)).status_code == 200
        msg = SupportMessage.objects.get()
        url = f"/api/support-conversations/{msg.conversation_id}/attachments/{msg.pk}/"
        request.return_value = Mock(
            json=lambda: {
                "url": "https://lookaside.fbsbx.com/whatsapp_business/attachments/?id=987",
                "mime_type": "image/png",
                "file_size": len(content),
            }
        )
        response = MagicMock(status_code=200)
        response.iter_content.return_value = [content]
        download.return_value.__enter__.return_value = response
        result = admin_api.get(url)
        assert result.status_code == 200 and result.content == content
        assert result["Cache-Control"] == "private, no-store"
        assert download.call_args.kwargs["allow_redirects"] is False
        assert download.call_args.kwargs["headers"]["Authorization"] == f"Bearer {TOKEN}"
        serialized = admin_api.get(
            f"/api/support-conversations/{msg.conversation_id}/messages/"
        ).data["results"][0]
        assert serialized["attachment"]["previewable"] and "id" not in serialized["attachment"]
        assert authenticated_client.get(url).status_code == 404
        other = SupportConversation.objects.create(
            channel="whatsapp", whatsapp_phone="258841111111", subject="Other"
        )
        assert (
            admin_api.get(
                f"/api/support-conversations/{other.pk}/attachments/{msg.pk}/"
            ).status_code
            == 404
        )

    @patch("apps.core.whatsapp_media.requests.get")
    @patch("apps.core.whatsapp.requests.request")
    def test_media_blocks_ssrf_redirects_size_mime_and_integrity(
        self, request, download, configured, admin_api
    ):
        thread = SupportConversation.objects.create(
            channel="whatsapp", whatsapp_phone="258841111111", subject="Media"
        )
        msg = SupportMessage.objects.create(
            conversation=thread, body="Media", attachment={"id": "987", "sha256": "0" * 64}
        )
        url = f"/api/support-conversations/{thread.pk}/attachments/{msg.pk}/"
        defaults = {
            "url": "https://lookaside.fbsbx.com/whatsapp_business/attachments/?id=987",
            "mime_type": "image/png",
            "file_size": 10,
        }
        for edits in (
            {"url": "https://evil.example/file"},
            {"url": "http://127.0.0.1/file"},
            {"url": "https://lookaside.fbsbx.com.evil.example/file"},
            {"url": "https://lookaside.fbsbx.com:123/file"},
            {"mime_type": "text/html"},
            {"file_size": 21 * 1024 * 1024},
        ):
            meta = {**defaults, **edits}
            request.return_value = Mock(json=lambda meta=meta: meta)
            assert admin_api.get(url).status_code == 400
        download.assert_not_called()
        request.return_value = Mock(json=lambda: defaults)
        response = MagicMock(status_code=302)
        download.return_value.__enter__.return_value = response
        assert admin_api.get(url).status_code == 400
        response.status_code = 200
        response.iter_content.return_value = [b"<html>malicious</html>"]
        assert admin_api.get(url).status_code == 400
        response.iter_content.return_value = [b"\x89PNG\r\n\x1a\nexample"]
        assert admin_api.get(url).status_code == 400

    def test_settings_encrypt_and_never_return_secrets(self, admin_api):
        response = admin_api.patch(
            BASE,
            {**DETAILS, "access_token": TOKEN, "app_secret": SECRET, "verify_token": VERIFY},
            format="json",
        )
        assert response.status_code == 200
        config = connection()
        assert all(value not in config.credentials for value in (TOKEN, SECRET, VERIFY))
        assert credentials(config)["access_token"] == TOKEN
        assert response.data["credential_status"] == dict.fromkeys(
            ("access_token", "app_secret", "verify_token"), True
        )
        assert not response.data["enabled"]
        assert not any(
            value in json.dumps(response.data, default=str) for value in (TOKEN, SECRET, VERIFY)
        )
        assert (
            admin_api.patch(
                BASE, {"access_token": "", "business_name": "MP"}, format="json"
            ).status_code
            == 200
        )
        assert credentials(connection())["access_token"] == TOKEN
        assert "access_token" not in admin_api.get(BASE).data

    def test_settings_permission_and_validation(self, admin_api, authenticated_client, staff_user):
        assert authenticated_client.get(BASE).status_code == 403
        staff_user.profile.staff_role = StaffRole.RECEPTIONIST
        staff_user.profile.save()
        assert admin_api.get(BASE).status_code == 403
        assert admin_api.post(BASE + "verify-token/").status_code == 403
        staff_user.profile.staff_role = StaffRole.ADMINISTRATOR
        staff_user.profile.save()
        for data in (
            {"phone_number_id": "../other"},
            {"business_phone": "841234567"},
            {"verify_token": "short"},
            {"credentials": "raw"},
            {"api_version": "https://evil"},
        ):
            assert admin_api.patch(BASE, data, format="json").status_code == 400
        assert APIClient().get(BASE).status_code == 401

    def test_activation_requires_test_and_webhook(self, admin_api):
        assert admin_api.patch(BASE, {"enabled": True}, format="json").status_code == 400
        admin_api.patch(
            BASE,
            {**DETAILS, "access_token": TOKEN, "app_secret": SECRET, "verify_token": VERIFY},
            format="json",
        )
        assert admin_api.patch(BASE, {"enabled": True}, format="json").status_code == 400
        assert not connection().enabled

    def test_edits_invalidate_connection_and_webhook(self, admin_api, configured):
        response = admin_api.patch(
            BASE, {"phone_number_id": "999", "enabled": False}, format="json"
        )
        assert response.status_code == 200
        assert not response.data["tested_at"] and not response.data["webhook_verified_at"]
        assert not connection().enabled

    def test_webhook_verification_and_token_rotation(self, admin_api, configured):
        api = APIClient()
        params = {"hub.mode": "subscribe", "hub.challenge": "1234", "hub.verify_token": "wrong"}
        assert api.get(BASE + "webhook/", params).status_code == 403
        params["hub.verify_token"] = VERIFY
        response = api.get(BASE + "webhook/", params)
        assert response.status_code == 200 and response.content == b"1234"
        response = admin_api.post(BASE + "verify-token/")
        assert response.status_code == 200
        assert len(response.data["verify_token"]) >= 32
        assert "verify_token" not in response.data["settings"]
        assert not connection().enabled and not connection().webhook_verified_at
        assert api.get(BASE + "webhook/", params).status_code == 403

    @patch("apps.core.whatsapp.requests.request")
    def test_connection_test_checks_waba_phone(self, request, admin_api, configured):
        request.side_effect = [
            Mock(json=lambda: {"display_phone_number": "+258 84 1234567"}),
            Mock(json=lambda: {"data": [{"id": "456"}]}),
        ]
        assert admin_api.post(BASE + "test/").status_code == 200
        assert request.call_args.kwargs["allow_redirects"] is False
        request.side_effect = [
            Mock(json=lambda: {"display_phone_number": "+258841234567"}),
            Mock(json=lambda: {"data": [{"id": "other"}]}),
        ]
        assert admin_api.post(BASE + "test/").status_code == 400
        request.side_effect = requests.Timeout(TOKEN)
        response = admin_api.post(BASE + "test/")
        assert response.status_code == 400 and TOKEN not in str(response.data)

    def test_inbound_is_idempotent_unlinked_and_notifies_reception(
        self, configured, admin_api, authenticated_client
    ):
        assert webhook(payload(message())).status_code == 200
        notifications = PortalNotification.objects.count()
        assert webhook(payload(message())).status_code == 200
        thread = SupportConversation.objects.get()
        assert thread.client is None and thread.channel == "whatsapp"
        assert thread.contact_name == "Cliente WhatsApp" and thread.last_inbound_at
        assert (
            SupportMessage.objects.count() == 1
            and PortalNotification.objects.count() == notifications
        )
        assert notifications > 0
        response = admin_api.get(f"/api/support-conversations/{thread.pk}/")
        assert response.status_code == 200 and response.data["whatsapp"]["can_reply"]
        assert (
            authenticated_client.get(f"/api/support-conversations/{thread.pk}/").status_code == 404
        )
        assert admin_api.get("/api/reception/summary/").status_code == 200

    def test_invalid_signature_disabled_wrong_waba_and_malformed(self, configured):
        assert webhook(payload(message()), signed=False).status_code == 403
        data = payload(message())
        data["entry"][0]["id"] = "other"
        assert webhook(data).status_code == 200
        assert not SupportConversation.objects.exists()
        assert webhook({"object": "whatsapp_business_account", "entry": [None]}).status_code == 400
        configured.enabled = False
        configured.save()
        assert webhook(payload(message())).status_code == 503
        assert not SupportMessage.objects.exists()

    def test_echo_and_old_messages_do_not_extend_window(self, configured):
        assert webhook(payload(message(age=25))).status_code == 200
        thread = SupportConversation.objects.get()
        before = thread.last_inbound_at
        assert (
            webhook(payload(message("wamid.echo", echo=True), "smb_message_echoes")).status_code
            == 200
        )
        assert webhook(payload(message("wamid.old", age=48))).status_code == 200
        thread.refresh_from_db()
        assert thread.last_inbound_at == before
        assert SupportMessage.objects.get(whatsapp_id="wamid.echo").source == "whatsapp_app"
        assert webhook(payload(message("wamid.future", age=-1))).status_code == 200
        assert not SupportMessage.objects.filter(whatsapp_id="wamid.future").exists()

    def test_media_placeholder_and_monotonic_receipts(self, configured):
        incoming = message()
        incoming.update(type="image", image={"id": "media-id", "caption": "Referência do cliente"})
        assert webhook(payload(incoming)).status_code == 200
        assert "Referência" in SupportMessage.objects.get().body
        thread = SupportConversation.objects.get()
        outbound = SupportMessage.objects.create(
            conversation=thread,
            is_staff=True,
            body="Olá",
            whatsapp_id="wamid.out",
            delivery_status="sent",
        )
        for state in ("read", "delivered", "sent", "failed"):
            assert webhook(payload(status={"id": "wamid.out", "status": state})).status_code == 200
        outbound.refresh_from_db()
        assert outbound.delivery_status == "read"

    @patch("apps.core.whatsapp.requests.request")
    def test_reception_can_send_text_within_window_only(
        self, request, configured, admin_api, staff_user
    ):
        staff_user.profile.staff_role = StaffRole.RECEPTIONIST
        staff_user.profile.save()
        webhook(payload(message()))
        thread = SupportConversation.objects.get()
        url = f"/api/support-conversations/{thread.pk}/messages/"
        request.return_value = Mock(json=lambda: {"messages": [{"id": "wamid.sent"}]})
        assert (
            admin_api.post(url, {"body": "Vamos preparar a proposta."}, format="json").status_code
            == 201
        )
        assert request.call_args.kwargs["json"]["to"] == thread.whatsapp_phone
        assert SupportMessage.objects.get(whatsapp_id="wamid.sent").source == "whatsapp_api"
        thread.last_inbound_at = timezone.now() - timedelta(hours=24, seconds=1)
        thread.save()
        assert admin_api.post(url, {"body": "Outra resposta"}, format="json").status_code == 400
        assert request.call_count == 1

    @patch("apps.core.whatsapp.requests.request", side_effect=requests.Timeout(TOKEN))
    def test_uncertain_send_is_not_retried_or_hidden(self, request, configured, admin_api):
        webhook(payload(message()))
        thread = SupportConversation.objects.get()
        response = admin_api.post(
            f"/api/support-conversations/{thread.pk}/messages/", {"body": "Olá"}, format="json"
        )
        assert response.status_code == 400 and TOKEN not in str(response.data)
        assert SupportMessage.objects.get(is_staff=True).delivery_status == "unconfirmed"
        assert request.call_count == 1
