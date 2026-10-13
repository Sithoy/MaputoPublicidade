from unittest.mock import patch

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.email_connection import password
from apps.core.models import EmailConnection

BASE = "/api/integrations/email/"
VALUES = {"mailbox": "atendimento@maputopublicidade.com", "display_name": "Atendimento MP",
          "smtp_host": "smtppro.zoho.com", "imap_host": "imappro.zoho.com", "password": "private-app-password"}


@pytest.fixture(autouse=True)
def clear_email_throttle():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestEmailConnection:
    def test_credential_is_encrypted_and_never_returned(self, staff_client):
        response = staff_client.patch(BASE, VALUES, format="json")
        assert response.status_code == 200
        assert response.data["password_configured"]
        assert VALUES["password"] not in str(response.data)
        assert "no-store" in response["Cache-Control"]
        config = EmailConnection.objects.get(pk=1)
        assert VALUES["password"] not in config.credentials
        assert password(config) == VALUES["password"]
        staff_client.patch(BASE, {**VALUES, "password": ""}, format="json")
        assert password(EmailConnection.objects.get(pk=1)) == VALUES["password"]

    def test_only_integration_admins_can_manage_credentials(self, authenticated_client, staff_user):
        assert APIClient().get(BASE).status_code == 401
        assert authenticated_client.get(BASE).status_code == 403
        staff_user.profile.staff_role = StaffRole.RECEPTIONIST
        staff_user.profile.save(update_fields=["staff_role"])
        client = APIClient()
        client.force_authenticate(staff_user)
        assert client.patch(BASE, VALUES, format="json").status_code == 403

    def test_rejects_arbitrary_hosts_other_mailboxes_and_unknown_fields(self, staff_client):
        for changes in ({"smtp_host": "localhost"}, {"imap_host": "127.0.0.1"},
                        {"mailbox": "dario.nhaule@maputopublicidade.com"}, {"enabled": True}):
            assert staff_client.patch(BASE, {**VALUES, **changes}, format="json").status_code == 400

    def test_authenticates_without_sending_or_changing_mail(self, staff_client):
        staff_client.patch(BASE, VALUES, format="json")
        with patch("apps.core.email_connection.smtplib.SMTP") as smtp, patch("apps.core.email_connection.imaplib.IMAP4_SSL") as imap:
            imap.return_value.__enter__.return_value.select.return_value = ("OK", [b"0"])
            response = staff_client.post(BASE + "test/", {}, format="json")
            assert response.status_code == 200
            smtp.return_value.__enter__.return_value.starttls.assert_called_once()
            smtp.return_value.__enter__.return_value.sendmail.assert_not_called()
            imap.return_value.__enter__.return_value.select.assert_called_once_with("INBOX", readonly=True)
        assert EmailConnection.objects.get(pk=1).tested_at
        assert response.data["sending_active"] is False
        assert response.data["receiving_active"] is False

    def test_provider_errors_cannot_disclose_password(self, staff_client):
        staff_client.patch(BASE, VALUES, format="json")
        with patch("apps.core.email_connection.smtplib.SMTP", side_effect=RuntimeError(VALUES["password"])):
            response = staff_client.post(BASE + "test/", {}, format="json")
        assert response.status_code == 400
        assert VALUES["password"] not in str(response.data)
        assert not EmailConnection.objects.get(pk=1).tested_at

    def test_changes_during_check_are_not_blessed(self, staff_client):
        staff_client.patch(BASE, VALUES, format="json")
        with patch("apps.core.email_connection.smtplib.SMTP") as smtp, patch("apps.core.email_connection.imaplib.IMAP4_SSL") as imap:
            smtp.return_value.__enter__.return_value.login.side_effect = lambda *args: EmailConnection.objects.filter(pk=1).update(credentials="changed")
            imap.return_value.__enter__.return_value.select.return_value = ("OK", [b"0"])
            assert staff_client.post(BASE + "test/", {}, format="json").status_code == 400
        assert not EmailConnection.objects.get(pk=1).tested_at
