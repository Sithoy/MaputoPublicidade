from django.conf import settings
from django.core.mail import get_connection
from django.core.mail.backends.base import BaseEmailBackend

from .zoho_mail import connection, send


class ZohoEmailBackend(BaseEmailBackend):
    """Routes all Django emails through Atendimento when explicitly enabled."""

    def send_messages(self, email_messages):
        config = connection()
        if not config or not config.sending_enabled:
            return get_connection(backend=settings.LEGACY_EMAIL_BACKEND, fail_silently=self.fail_silently).send_messages(email_messages)
        count = 0
        for message in email_messages:
            try:
                message.message()  # Django header validation before any external request.
                if message.attachments:
                    raise ValueError('Anexos por API ainda não suportados.')
                if not message.recipients():
                    continue
                send(config, message.subject, message.body, message.to, cc=message.cc, bcc=message.bcc)
                count += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return count
