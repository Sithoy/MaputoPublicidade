"""Meta Cloud API connection, encrypted credentials and inbox transport."""

import base64
import hashlib
import json
from datetime import timedelta

import requests
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import SupportMessage, WhatsAppConnection

SECRET_FIELDS = ("access_token", "app_secret", "verify_token")


def connection():
    return WhatsAppConnection.objects.get_or_create(pk=1)[0]


def cipher():
    # Domain-separated key. SECRET_KEY must be strong and stable across deploys.
    key = hashlib.sha256(("mp-whatsapp-credentials-v1:" + settings.SECRET_KEY).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def credentials(config):
    if not config.credentials:
        return {}
    try:
        return json.loads(cipher().decrypt(config.credentials.encode()))
    except (InvalidToken, ValueError):
        raise ValidationError(
            "Não foi possível ler as credenciais. Verifique a chave de encriptação do servidor com o administrador técnico."
        ) from None


def store_credentials(config, values):
    config.credentials = cipher().encrypt(json.dumps(values).encode()).decode()


def missing_fields(config):
    secrets = credentials(config)
    required = ("business_phone", "waba_id", "phone_number_id", "app_id")
    missing = [field for field in required if not config.details.get(field)]
    missing += [field for field in SECRET_FIELDS if not secrets.get(field)]
    if config.details.get("mode", "coexistence") == "coexistence" and not config.details.get(
        "onboarding_confirmed"
    ):
        missing.append("onboarding_confirmed")
    return missing


def can_reply(conversation, config=None):
    config = config or connection()
    return bool(
        config.enabled
        and conversation.last_inbound_at
        and conversation.last_inbound_at > timezone.now() - timedelta(hours=24)
    )


def graph(config, method, path, **kwargs):
    token = credentials(config).get("access_token", "")
    try:
        response = requests.request(
            method,
            f"https://graph.facebook.com/{config.details.get('api_version', 'v25.0')}/{path}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
            allow_redirects=False,
            **kwargs,
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict) or data.get("error"):
            raise ValueError()
        return data
    except (requests.RequestException, ValueError):
        # Never return provider payloads, request headers or tokens to the browser/logs.
        raise ValidationError(
            "A Meta não confirmou a operação. Verifique o token, as permissões e a ligação."
        ) from None


def send_text(conversation, sender, body):
    config = connection()
    if not can_reply(conversation, config):
        raise ValidationError(
            "A janela de 24 horas está fechada ou a integração está desativada. Use o WhatsApp Business no telefone (Coexistence) ou um template aprovado."
        )
    return send_payload(
        conversation, sender, body, {"type": "text", "text": {"body": body}}, config
    )


def send_payload(conversation, sender, body, payload, config, template=None):
    if not config.enabled:
        raise ValidationError("A integração WhatsApp está desativada.")
    message = SupportMessage.objects.create(
        conversation=conversation,
        sender=sender,
        is_staff=True,
        body=body,
        source="whatsapp_api",
        delivery_status="pending",
        template=template or {},
    )
    try:
        data = graph(
            config,
            "POST",
            f"{config.details['phone_number_id']}/messages",
            json={
                "messaging_product": "whatsapp",
                "to": conversation.whatsapp_phone,
                **payload,
            },
        )
        message.whatsapp_id = data["messages"][0]["id"]
        if not isinstance(message.whatsapp_id, str) or not 1 <= len(message.whatsapp_id) <= 255:
            raise ValueError()
    except (ValidationError, KeyError, IndexError, TypeError, ValueError):
        message.delivery_status = "unconfirmed"
        message.save(update_fields=["delivery_status"])
        raise ValidationError(
            "O envio não pôde ser confirmado. Verifique a conversa no telefone antes de reenviar para evitar duplicação."
        ) from None
    message.delivery_status = "sent"
    message.save(update_fields=["whatsapp_id", "delivery_status"])
    conversation.status = "awaiting_client"
    conversation.updated_at = timezone.now()
    conversation.save(update_fields=["status", "updated_at"])
    return message
