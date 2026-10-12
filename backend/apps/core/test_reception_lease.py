from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import ReceptionEditLease


def editor(name, role=StaffRole.RECEPTIONIST):
    user = User.objects.create_user(name, is_staff=True)
    user.profile.staff_role = role
    user.profile.save()
    api = APIClient()
    api.force_authenticate(user)
    return api, user


def reserve(api, quote, **data):
    response = api.post(f"/api/reception/{quote.reference}/edit-session/", {"action": "acquire", **data}, format="json")
    if response.status_code == 200:
        api.credentials(HTTP_X_RECEPTION_EDIT_TOKEN=response.data["token"])
    return response


@pytest.mark.django_db
class TestReceptionLease:
    def test_reading_does_not_reserve_and_any_colleague_can_continue(self, quote, staff_user):
        first, user = editor("desk-one")
        second, colleague = editor("desk-two")
        quote.reception_owner = staff_user  # Historical handler is not authority to edit.
        quote.save()
        path = f"/api/reception/{quote.reference}/edit-session/"
        assert first.get(path).data == {"session": None}
        assert not ReceptionEditLease.objects.exists()
        assert reserve(first, quote).status_code == 200
        assert second.get(f"/api/quotes/{quote.reference}/").status_code == 200
        assert reserve(second, quote).status_code == 409
        assert second.patch(f"/api/quotes/{quote.reference}/", {"notes": "Clash"}, format="json").status_code == 409
        assert first.post(path, {"action": "release"}, format="json").status_code == 200
        assert reserve(second, quote).status_code == 200
        assert second.patch(f"/api/reception/{quote.reference}/", {"reception_notes": "Continuado pelo colega"}, format="json").status_code == 200
        event = quote.activity_events.filter(action="reception_updated").first()
        assert event.actor_id == colleague.pk and "reception_notes" in event.comment
        assert quote.activity_events.filter(actor=user, action="reception_released").exists()

    def test_expiry_fences_old_tokens_and_requires_fresh_reservation(self, quote):
        first, _ = editor("expired")
        second, _ = editor("replacement")
        reserve(first, quote)
        lease = ReceptionEditLease.objects.get(quote=quote)
        lease.expires_at = timezone.now() - timedelta(seconds=1)
        lease.save()
        path = f"/api/reception/{quote.reference}/edit-session/"
        assert first.post(path, {"action": "heartbeat"}, format="json").status_code == 409
        assert reserve(second, quote).status_code == 200
        assert first.post(path, {"action": "release"}, format="json").status_code == 409
        assert first.patch(f"/api/quotes/{quote.reference}/", {"notes": "Stale draft"}, format="json").status_code == 409
        assert ReceptionEditLease.objects.get(quote=quote).editor_id != lease.editor_id

    def test_same_user_in_another_tab_is_not_the_same_edit_session(self, quote):
        api, user = editor("two-tabs")
        reserve(api, quote)
        other_tab = APIClient()
        other_tab.force_authenticate(user)
        assert reserve(other_tab, quote).status_code == 409
        response = other_tab.get(f"/api/quotes/{quote.reference}/")
        assert "token" not in str(response.data["workdesk"])

    def test_takeover_requires_supervision_reason_and_is_audited(self, quote, authenticated_client):
        first, _ = editor("current")
        second, _ = editor("peer")
        admin, supervisor = editor("supervisor", StaffRole.ADMINISTRATOR)
        reserve(first, quote)
        path = f"/api/reception/{quote.reference}/edit-session/"
        assert authenticated_client.get(path).status_code == 403
        assert second.post(path, {"action": "takeover", "reason": "Urgente"}, format="json").status_code == 403
        assert admin.post(path, {"action": "takeover", "reason": ""}, format="json").status_code == 400
        response = admin.post(path, {"action": "takeover", "reason": "Mudança de turno"}, format="json")
        assert response.status_code == 200
        assert quote.activity_events.filter(actor=supervisor, comment__contains="Mudança de turno").exists()
        assert first.post(path, {"action": "heartbeat"}, format="json").status_code == 409
