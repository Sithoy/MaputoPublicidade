import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.activity import record_activity
from apps.core.models import PortalNotification


@pytest.mark.django_db
class TestPortalNotifications:
    def test_client_decision_notifies_staff_with_access(self, quote, client_user, staff_user):
        record_activity(action="price_approved", actor=client_user, quote=quote)
        notice = PortalNotification.objects.get(recipient=staff_user)
        assert notice.href == f"/admin/orcamentos/{quote.reference}"
        assert not PortalNotification.objects.filter(recipient=client_user).exists()

    def test_staff_update_notifies_client_but_internal_event_does_not(self, quote, client_user, staff_user):
        record_activity(action="artwork_proof_uploaded", actor=staff_user, quote=quote)
        notice = PortalNotification.objects.get(recipient=client_user)
        assert notice.href == f"/area-cliente/orcamentos/{quote.reference}"
        record_activity(action="created", actor=staff_user, quote=quote, is_internal=True)
        assert PortalNotification.objects.filter(recipient=client_user).count() == 1

    def test_staff_without_quote_access_receives_no_notice(self, quote, client_user, staff_user):
        staff_user.profile.staff_role = StaffRole.CONTENT
        staff_user.profile.save(update_fields=["staff_role"])
        record_activity(action="price_approved", actor=client_user, quote=quote)
        assert not PortalNotification.objects.filter(recipient=staff_user).exists()

    def test_notifications_and_read_state_are_private(self, authenticated_client, client_user, staff_user):
        own = PortalNotification.objects.create(recipient=client_user, title="O meu aviso", href="/area-cliente")
        other = PortalNotification.objects.create(recipient=staff_user, title="Privado", href="/admin/orcamentos/MP-0001")
        response = authenticated_client.get(reverse("notification-list"))
        assert response.status_code == 200
        assert [row["id"] for row in response.json()["results"]] == [own.id]
        assert authenticated_client.get(reverse("notification-unread-count")).json()["count"] == 1
        assert authenticated_client.post(reverse("notification-read", kwargs={"pk": other.id})).status_code == 404
        assert authenticated_client.post(reverse("notification-read", kwargs={"pk": own.id})).status_code == 200
        assert authenticated_client.get(reverse("notification-unread-count")).json()["count"] == 0
        other.refresh_from_db()
        assert other.read_at is None

    def test_read_all_does_not_change_other_recipients(self, authenticated_client, client_user, staff_user):
        own = PortalNotification.objects.create(recipient=client_user, title="O meu aviso", href="/area-cliente")
        other = PortalNotification.objects.create(recipient=staff_user, title="Privado", href="/admin")
        assert authenticated_client.post(reverse("notification-read-all")).status_code == 200
        own.refresh_from_db()
        other.refresh_from_db()
        assert own.read_at is not None
        assert other.read_at is None

    def test_anonymous_cannot_read_notices(self):
        assert APIClient().get(reverse("notification-list")).status_code == 401

    def test_role_change_hides_notices_for_removed_access(self, staff_client, staff_user):
        PortalNotification.objects.create(recipient=staff_user, title="Privado", href="/admin/orcamentos/MP-0001")
        staff_user.profile.staff_role = StaffRole.CONTENT
        staff_user.profile.save(update_fields=["staff_role"])
        assert staff_client.get(reverse("notification-list")).json()["results"] == []
