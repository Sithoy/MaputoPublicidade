"""Configuration and bounded, non-sending authentication checks for Zoho."""

import base64
import hashlib
import imaplib
import smtplib
import ssl

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.accounts.roles import StaffCapability

from .models import EmailConnection
from .permissions import HasStaffCapability


def cipher():
    key = hashlib.sha256(("mp-email-credentials-v1:" + settings.SECRET_KEY).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def password(config):
    try:
        return cipher().decrypt(config.credentials.encode()).decode() if config.credentials else ""
    except InvalidToken:
        raise ValidationError("Não foi possível ler a credencial. Contacte o administrador técnico.") from None


class EmailInput(serializers.Serializer):
    mailbox = serializers.EmailField(max_length=254)
    display_name = serializers.CharField(max_length=160)
    smtp_host = serializers.ChoiceField(choices=["smtppro.zoho.com", "smtp.zoho.com"])
    imap_host = serializers.ChoiceField(choices=["imappro.zoho.com", "imap.zoho.com"])
    password = serializers.CharField(max_length=255, required=False, allow_blank=True, write_only=True, trim_whitespace=False)

    def validate(self, values):
        if set(self.initial_data) - set(self.fields):
            raise ValidationError("Campos desconhecidos.")
        if values["mailbox"].lower() != "atendimento@maputopublicidade.com":
            raise ValidationError("Esta ligação está limitada à caixa Atendimento da MP.")
        return values


def data(config):
    return {"mailbox": config.mailbox, "display_name": config.display_name, "smtp_host": config.smtp_host,
            "imap_host": config.imap_host, "password_configured": bool(config.credentials), "tested_at": config.tested_at,
            "sending_active": False, "receiving_active": False}


class EmailSettingsThrottle(UserRateThrottle):
    rate = "10/min"
    scope = "email_settings"


class EmailSettingsView(APIView):
    throttle_classes = [EmailSettingsThrottle]

    def get_permissions(self):
        return [HasStaffCapability(StaffCapability.MANAGE_INTEGRATIONS)]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store, private"
        return response

    def get(self, request):
        return Response(data(EmailConnection.objects.get_or_create(pk=1)[0]))

    @transaction.atomic
    def patch(self, request):
        values = EmailInput(data=request.data)
        values.is_valid(raise_exception=True)
        EmailConnection.objects.get_or_create(pk=1)
        config = EmailConnection.objects.select_for_update().get(pk=1)
        fields = dict(values.validated_data)
        secret = fields.pop("password", "")
        changed = bool(secret) or any(getattr(config, key) != value for key, value in fields.items())
        # A mailbox change can never silently carry another account's credential.
        if fields["mailbox"] != config.mailbox and not secret:
            config.credentials = ""
        for key, value in fields.items():
            setattr(config, key, value)
        if secret:
            config.credentials = cipher().encrypt(secret.encode()).decode()
        if changed:
            config.tested_at = None
        config.save()
        return Response(data(config))


class EmailTestView(EmailSettingsView):
    def post(self, request):
        config = EmailConnection.objects.get_or_create(pk=1)[0]
        secret = password(config)
        if not secret:
            raise ValidationError("Guarde a credencial antes de testar.")
        snapshot = (config.mailbox, config.smtp_host, config.imap_host, config.credentials)
        try:
            with smtplib.SMTP(config.smtp_host, 587, timeout=8) as smtp:
                smtp.ehlo()
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
                smtp.login(config.mailbox, secret)
            with imaplib.IMAP4_SSL(config.imap_host, 993, ssl_context=ssl.create_default_context(), timeout=8) as imap:
                imap.login(config.mailbox, secret)
                status, _ = imap.select("INBOX", readonly=True)
                if status != "OK":
                    raise ValueError
        except Exception:
            # Server exceptions can contain credentials or provider responses.
            raise ValidationError("Falhou a ligação SMTP/IMAP. Verifique a credencial e os servidores na conta Zoho.") from None
        with transaction.atomic():
            current = EmailConnection.objects.select_for_update().get(pk=1)
            if snapshot != (current.mailbox, current.smtp_host, current.imap_host, current.credentials):
                raise ValidationError("A configuração mudou durante o teste. Teste novamente.")
            current.tested_at = timezone.now()
            current.save(update_fields=["tested_at"])
        return Response({**data(current), "detail": "SMTP e IMAP autenticados. Não foram enviados nem importados emails."})
