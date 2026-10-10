import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import PortalNotification, SupportConversation, SupportMessage
from apps.invoices.models import Invoice

BASE = "/api/support-conversations/"


@pytest.mark.django_db
class TestSupport:
    def test_context_choices_are_scoped_searchable_and_hide_draft_invoices(
        self, authenticated_client, client_user, quote, order
    ):
        other = User.objects.create_user("context-other")
        issued = Invoice.objects.create(user=client_user, client_name="ABC", status="issued")
        Invoice.objects.create(user=client_user, client_name="Private draft")
        Invoice.objects.create(user=other, client_name="Other", status="issued")
        for kind, target in (("quote", quote), ("order", order), ("invoice", issued)):
            response = authenticated_client.get(
                BASE + "contexts/", {"kind": kind, "reference": target.reference}
            )
            assert response.status_code == 200
            assert [row["reference"] for row in response.data["results"]] == [target.reference]
        rows = authenticated_client.get(BASE + "contexts/", {"kind": "invoice"}).data["results"]
        assert [row["reference"] for row in rows] == [issued.reference]
        assert authenticated_client.get(BASE + "contexts/", {"kind": "invalid"}).status_code == 400
        assert APIClient().get(BASE + "contexts/").status_code == 401

    def test_invoice_link_respects_staff_role_and_no_duplicate_context(
        self, authenticated_client, client_user, staff_user, quote
    ):
        invoice = Invoice.objects.create(user=client_user, client_name="ABC", status="issued")
        response = authenticated_client.post(
            BASE,
            {"subject": "Pagamento", "body": "Uma dúvida", "invoice_reference": invoice.reference},
            format="json",
        )
        assert response.status_code == 201
        assert response.data["context"]["reference"] == invoice.reference
        assert response.data["context"]["kind"] == "invoice"
        conversation = SupportConversation.objects.get(pk=response.data["id"])
        assert conversation.invoice == invoice
        api = APIClient()
        api.force_authenticate(staff_user)
        staff_user.profile.staff_role = StaffRole.RECEPTIONIST
        staff_user.profile.save(update_fields=["staff_role"])
        assert api.get(f"{BASE}{conversation.pk}/").data["context"] == {
            "kind": "invoice",
            "available": False,
        }
        assert (
            api.post(f"{BASE}{conversation.pk}/messages/", {"body": "Vamos verificar."}).status_code
            == 201
        )
        staff_user.profile.staff_role = StaffRole.COMMERCIAL
        staff_user.profile.save(update_fields=["staff_role"])
        assert (
            api.get(f"{BASE}{conversation.pk}/").data["context"]["reference"] == invoice.reference
        )
        assert api.get(BASE + "contexts/").status_code == 403
        count = SupportConversation.objects.count()
        assert (
            authenticated_client.post(
                BASE,
                {
                    "subject": "Teste",
                    "body": "Oi",
                    "invoice_reference": invoice.reference,
                    "quote_reference": quote.reference,
                },
            ).status_code
            == 400
        )
        assert SupportConversation.objects.count() == count

    def test_draft_other_account_and_transferred_context_are_unavailable(
        self, authenticated_client, client_user, quote
    ):
        other = User.objects.create_user("invoice-context-other")
        draft = Invoice.objects.create(user=client_user, client_name="Draft")
        foreign = Invoice.objects.create(user=other, client_name="Other", status="issued")
        for invoice in (draft, foreign):
            assert (
                authenticated_client.post(
                    BASE, {"subject": "Ajuda", "body": "Oi", "invoice_reference": invoice.reference}
                ).status_code
                == 400
            )
        conversation = SupportConversation.objects.create(
            client=client_user, quote=quote, subject="Original"
        )
        quote.user = other
        quote.save(update_fields=["user"])
        response = authenticated_client.get(f"{BASE}{conversation.pk}/").data
        assert response["context"] == {"kind": "quote", "available": False}
        assert response["quote_reference"] == ""

    def test_portal_reads_do_not_consume_support_write_limit(self, authenticated_client):
        for _ in range(35):
            assert authenticated_client.get("/api/notifications/unread_count/").status_code == 200
        response = authenticated_client.post(BASE, {"subject": "Ajuda", "body": "Olá"})
        assert response.status_code == 201

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
