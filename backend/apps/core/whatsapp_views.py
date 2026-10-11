import hashlib
import hmac
import json
import re
import secrets
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone

from django.contrib.auth.models import User
from django.db import transaction
from django.http import HttpResponse
from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.accounts.roles import StaffCapability, has_staff_capability

from .models import PortalNotification, SupportConversation, SupportMessage
from .permissions import HasStaffCapability
from .whatsapp import (
    SECRET_FIELDS,
    connection,
    credentials,
    graph,
    missing_fields,
    store_credentials,
)


class SettingsThrottle(UserRateThrottle):
    rate = "20/min"
    scope = "whatsapp_settings"


class SettingsInput(serializers.Serializer):
    business_name = serializers.CharField(max_length=160, required=False, allow_blank=True)
    business_phone = serializers.RegexField(
        r"^\+[1-9][0-9]{6,14}$", required=False, allow_blank=True
    )
    portfolio_id = serializers.RegexField(r"^[0-9]{1,30}$", required=False, allow_blank=True)
    waba_id = serializers.RegexField(r"^[0-9]{1,30}$", required=False, allow_blank=True)
    phone_number_id = serializers.RegexField(r"^[0-9]{1,30}$", required=False, allow_blank=True)
    app_id = serializers.RegexField(r"^[0-9]{1,30}$", required=False, allow_blank=True)
    api_version = serializers.RegexField(r"^v[0-9]{1,2}\.0$", required=False)
    mode = serializers.ChoiceField(choices=["coexistence", "api_only"], required=False)
    onboarding_provider = serializers.CharField(max_length=160, required=False, allow_blank=True)
    onboarding_confirmed = serializers.BooleanField(required=False)
    access_token = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, write_only=True
    )
    app_secret = serializers.CharField(
        max_length=255, required=False, allow_blank=True, write_only=True
    )
    verify_token = serializers.CharField(
        max_length=255, min_length=16, required=False, allow_blank=True, write_only=True
    )
    enabled = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if set(self.initial_data) - set(self.fields):
            raise ValidationError("Campo de configuração não permitido.")
        return attrs


def settings_data(config, request):
    present = credentials(config)
    return {
        **config.details,
        "enabled": config.enabled,
        "credential_status": {key: bool(present.get(key)) for key in SECRET_FIELDS},
        "missing_fields": missing_fields(config),
        "tested_at": config.tested_at,
        "webhook_verified_at": config.webhook_verified_at,
        "last_received_at": config.last_received_at,
        "webhook_url": request.build_absolute_uri(reverse("whatsapp-webhook")),
    }


class WhatsAppSettingsView(APIView):
    throttle_classes = [SettingsThrottle]

    def get_permissions(self):
        return [HasStaffCapability(StaffCapability.MANAGE_INTEGRATIONS)]

    def get(self, request):
        return Response(settings_data(connection(), request))

    @transaction.atomic
    def patch(self, request):
        serializer = SettingsInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        config = connection()
        config = type(config).objects.select_for_update().get(pk=config.pk)
        values = dict(serializer.validated_data)
        enabled = values.pop("enabled", config.enabled)
        stored = credentials(config)
        changed = False
        webhook_changed = False
        for key in SECRET_FIELDS:
            value = values.pop(key, "")
            if value and value != stored.get(key):
                stored[key] = value
                changed = True
                webhook_changed |= key in {"app_secret", "verify_token"}
        routing_changed = any(
            config.details.get(key) != value
            for key, value in values.items()
            if key
            in {"phone_number_id", "waba_id", "business_phone", "app_id", "api_version", "mode"}
        )
        changed |= routing_changed
        webhook_changed |= routing_changed
        config.details = {**config.details, **values}
        store_credentials(config, stored)
        if changed:
            config.tested_at = None
            config.enabled = False
        if webhook_changed:
            config.webhook_verified_at = None
        if enabled:
            if missing_fields(config) or not config.tested_at or not config.webhook_verified_at:
                raise ValidationError(
                    "Guarde os dados, teste a ligação e verifique o webhook na Meta antes de ativar."
                )
        config.enabled = enabled
        config.save()
        return Response(settings_data(config, request))


class WhatsAppTestView(WhatsAppSettingsView):
    def post(self, request):
        config = connection()
        if missing_fields(config):
            raise ValidationError("Preencha os dados e confirme o onboarding antes de testar.")
        details = dict(config.details)
        snapshot = config.credentials
        # A failed re-test must not leave an old success available for activation.
        config.tested_at = None
        config.enabled = False
        config.save(update_fields=["tested_at", "enabled"])
        phone = graph(
            config,
            "GET",
            details["phone_number_id"],
            params={"fields": "display_phone_number,verified_name"},
        )
        numbers = graph(
            config,
            "GET",
            f"{details['waba_id']}/phone_numbers",
            params={"fields": "id", "limit": 100},
        )
        if not any(
            str(row.get("id")) == details["phone_number_id"] for row in numbers.get("data", [])
        ):
            raise ValidationError("O número não pertence à conta WhatsApp indicada.")
        displayed = re.sub(r"[^0-9]", "", phone.get("display_phone_number", ""))
        if displayed != details["business_phone"].lstrip("+"):
            raise ValidationError(
                "O telefone configurado não coincide com o número confirmado pela Meta."
            )
        # Do not bless credentials that another administrator changed during the request.
        with transaction.atomic():
            current = type(config).objects.select_for_update().get(pk=config.pk)
            if current.credentials != snapshot or current.details != details:
                raise ValidationError("Os dados foram alterados durante o teste. Teste novamente.")
            current.tested_at = timezone.now()
            current.save(update_fields=["tested_at"])
        return Response(settings_data(current, request))


class WhatsAppVerifyTokenView(WhatsAppSettingsView):
    @transaction.atomic
    def post(self, request):
        config = connection()
        config = type(config).objects.select_for_update().get(pk=config.pk)
        values = credentials(config)
        token = secrets.token_urlsafe(32)
        values["verify_token"] = token
        store_credentials(config, values)
        config.webhook_verified_at = None
        config.enabled = False
        config.save()
        return Response({"verify_token": token, "settings": settings_data(config, request)})


class WhatsAppWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        config = connection()
        token = credentials(config).get("verify_token", "")
        challenge = request.query_params.get("hub.challenge", "")
        if (
            request.query_params.get("hub.mode") != "subscribe"
            or not token
            or not challenge
            or len(challenge) > 255
            or not hmac.compare_digest(
                token.encode(), request.query_params.get("hub.verify_token", "").encode()
            )
        ):
            return Response(status=403)
        config.webhook_verified_at = timezone.now()
        config.save(update_fields=["webhook_verified_at"])
        return HttpResponse(challenge, content_type="text/plain")

    def post(self, request):
        raw = request.body
        if len(raw) > 1024 * 1024:
            return Response(status=413)
        config = connection()
        secret = credentials(config).get("app_secret", "")
        expected = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
        if not secret or not hmac.compare_digest(
            expected.encode(), request.headers.get("X-Hub-Signature-256", "").encode()
        ):
            return Response(status=403)
        if not config.enabled:
            return Response(status=503)
        try:
            payload = json.loads(raw)
            if (
                not isinstance(payload, dict)
                or payload.get("object") != "whatsapp_business_account"
            ):
                return Response(status=400)
            with transaction.atomic():
                self.ingest(config, payload)
        except (ValueError, TypeError, AttributeError, KeyError, OverflowError, OSError):
            return Response(status=400)
        return Response({"received": True})

    def ingest(self, config, payload):
        for entry in payload.get("entry", []):
            if str(entry.get("id")) != config.details.get("waba_id"):
                continue
            for change in entry.get("changes", []):
                value = change.get("value", {})
                if str(value.get("metadata", {}).get("phone_number_id")) != config.details.get(
                    "phone_number_id"
                ):
                    continue
                echo = change.get("field") == "smb_message_echoes"
                if echo and config.details.get("mode", "coexistence") != "coexistence":
                    continue
                if change.get("field") not in {"messages", "smb_message_echoes"}:
                    continue
                names = {
                    row.get("wa_id"): row.get("profile", {}).get("name", "")
                    for row in value.get("contacts", [])
                }
                for incoming in value.get("message_echoes" if echo else "messages", []):
                    phone = incoming.get("to" if echo else "from", "")
                    external_id = incoming.get("id", "")
                    if (
                        not re.fullmatch(r"[1-9][0-9]{6,14}", phone)
                        or not external_id
                        or len(external_id) > 255
                    ):
                        continue
                    sent_at = datetime.fromtimestamp(int(incoming["timestamp"]), tz=dt_timezone.utc)
                    if sent_at > timezone.now() + timedelta(minutes=5):
                        continue
                    thread, _ = SupportConversation.objects.get_or_create(
                        whatsapp_phone=phone,
                        defaults={
                            "channel": "whatsapp",
                            "subject": f"WhatsApp · +{phone}",
                            "contact_name": names.get(phone, "")[:160],
                        },
                    )
                    thread = SupportConversation.objects.select_for_update().get(pk=thread.pk)
                    kind = incoming.get("type", "unknown")
                    attachment = {}
                    media = incoming.get(kind, {})
                    if kind in {"image", "document", "audio", "video", "sticker"} and isinstance(
                        media, dict
                    ):
                        media_id = str(media.get("id", ""))
                        if re.fullmatch(r"[0-9]{1,30}", media_id):
                            attachment = {
                                "id": media_id,
                                "type": kind,
                                "mime_type": str(media.get("mime_type", ""))[:100],
                                "name": str(media.get("filename", kind))[:160],
                                "sha256": str(media.get("sha256", ""))[:64],
                            }
                    if kind == "text":
                        body = incoming.get("text", {}).get("body", "")[:4000]
                    else:
                        caption = incoming.get(kind, {}).get("caption", "")[:3500]
                        label = (
                            "anexo recebido"
                            if attachment
                            else "consultar o conteúdo no WhatsApp Business"
                        )
                        body = f"[{kind}: {label}] {caption}"[:4000]
                    _, created = SupportMessage.objects.get_or_create(
                        whatsapp_id=external_id,
                        defaults={
                            "conversation": thread,
                            "body": body or "[Mensagem sem texto]",
                            "is_staff": echo,
                            "source": "whatsapp_app" if echo else "whatsapp",
                            "delivery_status": "sent" if echo else "received",
                            "attachment": attachment,
                        },
                    )
                    if not created:
                        continue
                    thread.status = "awaiting_client" if echo else "awaiting_team"
                    thread.updated_at = timezone.now()
                    if not echo and (
                        not thread.last_inbound_at or sent_at > thread.last_inbound_at
                    ):
                        thread.last_inbound_at = sent_at
                    thread.save(update_fields=["status", "updated_at", "last_inbound_at"])
                    if not echo:
                        recipients = [
                            user
                            for user in User.objects.filter(
                                is_active=True, is_staff=True
                            ).select_related("profile")
                            if has_staff_capability(user, StaffCapability.MANAGE_SUPPORT)
                        ]
                        PortalNotification.objects.bulk_create(
                            [
                                PortalNotification(
                                    recipient=user,
                                    title=f"Mensagem WhatsApp: {thread.contact_name or '+' + phone}"[
                                        :255
                                    ],
                                    href=f"/admin/apoio?conversa={thread.pk}",
                                )
                                for user in recipients
                            ]
                        )
                # Delivery receipts cannot open/extend the customer service window.
                for receipt in value.get("statuses", []):
                    status = receipt.get("status")
                    if status in {"sent", "delivered", "read", "failed"}:
                        message = (
                            SupportMessage.objects.select_for_update()
                            .filter(whatsapp_id=receipt.get("id"), is_staff=True)
                            .first()
                        )
                        ranks = {
                            "pending": 0,
                            "unconfirmed": 0,
                            "failed": 0,
                            "sent": 1,
                            "delivered": 2,
                            "read": 3,
                        }
                        if message and (
                            ranks[status] > ranks.get(message.delivery_status, 0)
                            or status == "failed"
                            and message.delivery_status in {"pending", "unconfirmed", "sent"}
                        ):
                            message.delivery_status = status
                            message.save(update_fields=["delivery_status"])
                config.last_received_at = timezone.now()
                config.save(update_fields=["last_received_at"])
