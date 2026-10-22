import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import PortalNotification
from apps.core.testing import ReceptionEditorClient


def staff_api(name, role):
    user = User.objects.create_user(name, is_staff=True)
    user.profile.staff_role = role
    user.profile.save()
    api = ReceptionEditorClient() if role == StaffRole.RECEPTIONIST else APIClient()
    api.force_authenticate(user)
    return api, user


@pytest.fixture
def reception(db):
    return staff_api("workflow-reception", StaffRole.RECEPTIONIST)


@pytest.mark.django_db
class TestProposalWorkflow:
    def command(self, api, quote, action, version=0, comment=""):
        return api.post(f"/api/quotes/{quote.reference}/proposal-workflow/",
                        {"action": action, "version": version, "comment": comment}, format="json")

    def draft(self, reception, quote):
        api, _ = reception
        assert api.post(f"/api/quotes/{quote.reference}/set-price/", {"final_price": "1000"}, format="json").status_code == 200
        quote.refresh_from_db()
        assert quote.proposal_stage == "draft" and quote.status == "reviewing"

    def test_reception_sends_directly_and_client_accepts_only_after_send(self, reception, quote, authenticated_client):
        api, owner = reception
        self.draft(reception, quote)
        assert authenticated_client.post(f"/api/quotes/{quote.reference}/approve-price/", {}, format="json").status_code == 400
        assert self.command(api, quote, "send").status_code == 200
        quote.refresh_from_db()
        assert quote.proposal_stage == "sent" and quote.proposal_version == 1
        assert quote.reception_owner_id == owner.pk and quote.proposal_prepared_by_id == owner.pk
        assert quote.proposal_reviewed_by_id is None and quote.price_approved_at is None
        assert quote.proposal_history[-1]["snapshot"]["final_price"] == "1000.00"
        assert quote.proposal_history[-1]["actor_id"] == owner.pk
        assert authenticated_client.post(f"/api/quotes/{quote.reference}/approve-price/", {}, format="json").status_code == 200

    def test_save_is_private_and_can_be_sent_later_without_another_reviewer(self, reception, quote, authenticated_client):
        api, _ = reception
        self.draft(reception, quote)
        assert self.command(api, quote, "save", comment="Condições confirmadas").status_code == 200
        quote.refresh_from_db()
        assert quote.proposal_version == 1 and quote.proposal_stage == "approved"
        assert quote.get_proposal_stage_display() == "Pronta para enviar"
        assert quote.proposal_sent_at is None and quote.proposal_reviewed_at is None
        response = authenticated_client.get(f"/api/quotes/{quote.reference}/")
        assert response.data["final_price"] is None and response.data["proposal_workflow"] is None
        assert response.data["items"][0]["unit_price"] is None
        assert authenticated_client.get(f"/api/quotes/{quote.reference}/pdf/").status_code == 400
        assert not PortalNotification.objects.filter(title__contains=quote.reference).exists()
        assert self.command(api, quote, "send", 1).status_code == 200
        quote.refresh_from_db()
        assert quote.proposal_version == 1 and quote.proposal_sent_at

    def test_edits_after_save_require_a_new_snapshot_not_internal_approval(self, reception, quote):
        api, _ = reception
        self.draft(reception, quote)
        self.command(api, quote, "save")
        assert api.patch(f"/api/quotes/{quote.reference}/", {"estimated_delivery_days": 12}, format="json").status_code == 200
        quote.refresh_from_db()
        assert quote.proposal_stage == "draft"
        assert self.command(api, quote, "send", 0).status_code == 400
        assert self.command(api, quote, "send", 1).status_code == 200
        quote.refresh_from_db()
        assert quote.proposal_version == 2
        assert quote.proposal_history[-1]["snapshot"]["estimated_delivery_days"] == "12"
        assert quote.proposal_history[1]["snapshot"]["estimated_delivery_days"] != "12"

    @pytest.mark.parametrize("stage", ["review", "returned", "approved"])
    def test_old_internal_workflow_does_not_block_sending(self, reception, quote, stage):
        api, _ = reception
        self.draft(reception, quote)
        quote.proposal_stage = stage
        quote.proposal_version = 1
        quote.save()
        assert self.command(api, quote, "send", 1).status_code == 200

    @pytest.mark.parametrize("action", ["submit", "approve", "return"])
    def test_internal_approval_actions_are_retired(self, reception, quote, action):
        api, _ = reception
        self.draft(reception, quote)
        assert self.command(api, quote, action).status_code == 400

    @pytest.mark.parametrize("action", ["save", "send"])
    def test_client_and_production_cannot_save_or_send(self, reception, quote, authenticated_client, action):
        self.draft(reception, quote)
        production, _ = staff_api("production-workflow", StaffRole.PRODUCTION)
        assert self.command(production, quote, action).status_code == 403
        assert self.command(authenticated_client, quote, action).status_code == 403

    @pytest.mark.parametrize("action", ["save", "send"])
    def test_missing_price_or_items_block_actions(self, reception, quote, action):
        api, _ = reception
        quote.final_price = None
        quote.save()
        assert self.command(api, quote, action).status_code == 400
        self.draft(reception, quote)
        quote.items.all().delete()
        assert self.command(api, quote, action).status_code == 400

    def test_duplicate_sending_and_changes_after_acceptance_are_blocked(self, reception, quote, authenticated_client):
        api, _ = reception
        self.draft(reception, quote)
        self.command(api, quote, "send")
        assert self.command(api, quote, "send", 1).status_code == 400
        assert authenticated_client.post(f"/api/quotes/{quote.reference}/approve-price/", {}, format="json").status_code == 200
        assert self.command(api, quote, "save", 1).status_code == 400
        assert api.patch(f"/api/quotes/{quote.reference}/", {"final_price": "2000"}, format="json").status_code == 400

    def test_cannot_bypass_client_acceptance_or_send_using_status(self, reception, quote):
        api, _ = reception
        self.draft(reception, quote)
        for path, data in [("set-status", {"status": "quoted"}), ("approve-price", {}), ("convert-to-order", {})]:
            assert api.post(f"/api/quotes/{quote.reference}/{path}/", data, format="json").status_code == 400

    def test_waiting_queue_is_only_waiting_for_the_client(self, reception, quote):
        api, _ = reception
        quote.proposal_stage = "review"
        quote.save()
        assert api.get("/api/quotes/", {"operational_state": "waiting"}).data["count"] == 0
        assert api.get("/api/quotes/", {"hq": "1", "task": "send"}).data["count"] == 1
        quote.proposal_stage = "sent"
        quote.save()
        assert api.get("/api/quotes/", {"operational_state": "waiting"}).data["count"] == 1

    def test_legacy_quotes_remain_compatible_until_revision(self, reception, quote):
        api, _ = reception
        quote.status = "quoted"
        quote.final_price = 1000
        quote.save()
        assert quote.proposal_stage == "legacy"
        assert api.post(f"/api/quotes/{quote.reference}/approve-price/", {}, format="json").status_code == 200
        assert api.patch(f"/api/quotes/{quote.reference}/", {"final_price": "2000"}, format="json").status_code == 400
