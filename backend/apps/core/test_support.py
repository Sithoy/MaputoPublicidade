import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import PortalNotification, SupportConversation, SupportMessage

BASE = "/api/support-conversations/"


@pytest.mark.django_db
class TestSupport:
    def test_create_context_notification_and_no_sender_spoof(
        self, authenticated_client, client_user, staff_user, quote
    ):
        response = authenticated_client.post(
            BASE,
            {
                "subject": "Entrega",
                "body": "Quando estará pronto?",
                "quote_reference": quote.reference,
                "client": staff_user.pk,
                "is_staff": True,
            },
            format="json",
        )
        assert response.status_code == 201
        conversation = SupportConversation.objects.get(pk=response.data["id"])
        assert conversation.client == client_user
        assert conversation.quote == quote
        assert not conversation.messages.get().is_staff
        notice = PortalNotification.objects.get(recipient=staff_user)
        staff_api = APIClient()
        staff_api.force_authenticate(staff_user)
        assert notice.id in [
            row["id"] for row in staff_api.get("/api/notifications/").data["results"]
        ]

    def test_other_client_cannot_access_or_link(self, authenticated_client, staff_user, quote):
        other = User.objects.create_user("other-support")
        conversation = SupportConversation.objects.create(client=other, subject="Privado")
        for suffix in ("", "messages/"):
            assert authenticated_client.get(f"{BASE}{conversation.pk}/{suffix}").status_code == 404
        assert (
            authenticated_client.post(
                f"{BASE}{conversation.pk}/messages/", {"body": "oi"}
            ).status_code
            == 404
        )
        quote.user = other
        quote.save(update_fields=["user"])
        assert (
            authenticated_client.post(
                BASE, {"subject": "Teste", "body": "Oi", "quote_reference": quote.reference}
            ).status_code
            == 400
        )

    @pytest.mark.parametrize(
        "role,allowed",
        [
            (StaffRole.RECEPTIONIST, True),
            (StaffRole.COMMERCIAL, True),
            (StaffRole.PRODUCTION, False),
            (StaffRole.FINANCE, False),
            (StaffRole.CONTENT, False),
        ],
    )
    def test_staff_permissions(self, staff_user, role, allowed):
        staff_user.profile.staff_role = role
        staff_user.profile.save(update_fields=["staff_role"])
        api = APIClient()
        api.force_authenticate(staff_user)
        assert api.get(BASE).status_code == (200 if allowed else 403)

    def test_reply_read_and_reopen(self, authenticated_client, client_user, staff_user):
        conversation = SupportConversation.objects.create(client=client_user, subject="Ajuda")
        staff_api = APIClient()
        staff_api.force_authenticate(staff_user)
        url = f"{BASE}{conversation.pk}/"
        first = staff_api.post(url + "messages/", {"body": "Podemos ajudar."}).data["id"]
        assert authenticated_client.get(url).data["unread_count"] == 1
        second = staff_api.post(url + "messages/", {"body": "Outra informação."}).data["id"]
        assert authenticated_client.post(url + "read/", {"through_id": first}).status_code == 200
        assert authenticated_client.get(url).data["unread_count"] == 1
        authenticated_client.post(url + "read/", {"through_id": second})
        authenticated_client.post(url + "read/", {"through_id": first})
        assert authenticated_client.get(url).data["unread_count"] == 0
        assert authenticated_client.post(url + "resolve/").status_code == 403
        assert staff_api.post(url + "resolve/").data["status"] == "resolved"
        assert (
            authenticated_client.post(
                url + "messages/", {"body": "Ainda tenho uma dúvida."}
            ).status_code
            == 201
        )
        assert authenticated_client.get(url).data["status"] == "awaiting_team"
        assert PortalNotification.objects.filter(recipient=client_user).count() == 2

    def test_validation_and_authentication(self, authenticated_client, client_user):
        assert APIClient().get(BASE).status_code == 401
        assert authenticated_client.post(BASE, {"subject": " ", "body": "Oi"}).status_code == 400
        assert authenticated_client.post(BASE, {"subject": "Teste", "body": " "}).status_code == 400
        conversation = SupportConversation.objects.create(client=client_user, subject="Ajuda")
        other = SupportConversation.objects.create(client=client_user, subject="Outro")
        message = SupportMessage.objects.create(conversation=other, sender=client_user, body="Oi")
        assert (
            authenticated_client.post(
                f"{BASE}{conversation.pk}/read/", {"through_id": message.pk}
            ).status_code
            == 400
        )
