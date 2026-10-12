import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import PortalNotification


def staff_api(name, role):
    user = User.objects.create_user(name, is_staff=True)
    user.profile.staff_role = role
    user.profile.save()
    api = APIClient()
    api.force_authenticate(user)
    return api, user


@pytest.fixture
def reception(db):
    return staff_api("workflow-reception", StaffRole.RECEPTIONIST)


@pytest.fixture
def commercial(db):
    return staff_api("workflow-commercial", StaffRole.COMMERCIAL)


@pytest.mark.django_db
class TestProposalWorkflow:
    def command(self, api, quote, command, version=0, comment=""):
        return api.post(
            f"/api/quotes/{quote.reference}/proposal-workflow/",
            {"action": command, "version": version, "comment": comment},
            format="json",
        )

    def draft(self, reception, quote):
        api, _ = reception
        assert (
            api.post(
                f"/api/quotes/{quote.reference}/set-price/", {"final_price": "1000"}, format="json"
            ).status_code
            == 200
        )
        quote.refresh_from_db()
        assert quote.proposal_stage == "draft" and quote.status == "reviewing"

    def test_full_flow_keeps_owner_and_separates_client_acceptance(
        self, reception, commercial, quote, authenticated_client
    ):
        api, owner = reception
        reviewer, user = commercial
        self.draft(reception, quote)
        assert self.command(api, quote, "send").status_code == 400
        assert self.command(api, quote, "submit").status_code == 200
        quote.refresh_from_db()
        assert quote.proposal_version == 1
        assert self.command(api, quote, "approve", 1).status_code == 403
        assert self.command(reviewer, quote, "approve", 1).status_code == 200
        quote.refresh_from_db()
        assert quote.proposal_stage == "approved" and not quote.price_approved_at
        assert quote.reception_owner_id == owner.pk and quote.proposal_reviewed_by_id == user.pk
        assert (
            authenticated_client.post(
                f"/api/quotes/{quote.reference}/approve-price/", {}, format="json"
            ).status_code
            == 400
        )
        assert self.command(api, quote, "send", 1).status_code == 200
        assert (
            authenticated_client.post(
                f"/api/quotes/{quote.reference}/approve-price/", {}, format="json"
            ).status_code
            == 200
        )
        quote.refresh_from_db()
        assert quote.price_approved_at and quote.proposal_stage == "sent"
        assert quote.proposal_history[1]["snapshot"]["final_price"] == "1000.00"

    def test_return_requires_reason_and_revision_requires_new_review(
        self, reception, commercial, quote
    ):
        api, _ = reception
        reviewer, _ = commercial
        self.draft(reception, quote)
        self.command(api, quote, "submit")
        assert self.command(reviewer, quote, "return", 1).status_code == 400
        assert (
            self.command(reviewer, quote, "return", 1, "Rever prazo de entrega").status_code == 200
        )
        assert self.command(api, quote, "send", 1).status_code == 400
        assert (
            api.patch(
                f"/api/quotes/{quote.reference}/", {"estimated_delivery_days": 12}, format="json"
            ).status_code
            == 200
        )
        assert self.command(api, quote, "submit", 1).status_code == 200
        quote.refresh_from_db()
        assert quote.proposal_version == 2 and quote.reception_owner_id
        assert self.command(reviewer, quote, "approve", 1).status_code == 400
        assert self.command(reviewer, quote, "approve", 2).status_code == 200

    def test_any_commercial_edit_invalidates_approval_and_blocks_bypasses(
        self, reception, commercial, quote
    ):
        api, _ = reception
        reviewer, _ = commercial
        self.draft(reception, quote)
        self.command(api, quote, "submit")
        self.command(reviewer, quote, "approve", 1)
        assert (
            api.patch(
                f"/api/quotes/{quote.reference}/", {"client_nuit": "400001234"}, format="json"
            ).status_code
            == 200
        )
        quote.refresh_from_db()
        assert quote.proposal_stage == "draft" and not quote.proposal_reviewed_at
        for path, data in (
            ("set-status", {"status": "quoted"}),
            ("approve-price", {}),
            ("convert-to-order", {}),
        ):
            assert (
                api.post(f"/api/quotes/{quote.reference}/{path}/", data, format="json").status_code
                == 400
            )
        assert self.command(api, quote, "send", 1).status_code == 400

    def test_self_approval_and_contributor_approval_are_forbidden(self, commercial, quote):
        api, _ = commercial
        self.draft(commercial, quote)
        self.command(api, quote, "submit")
        assert self.command(api, quote, "approve", 1).status_code == 400

    def test_draft_prices_history_and_pdf_are_not_published_to_client(
        self, reception, commercial, quote, authenticated_client
    ):
        self.draft(reception, quote)
        api, owner = reception
        reviewer, user = commercial
        response = authenticated_client.get(f"/api/quotes/{quote.reference}/")
        assert response.status_code == 200
        assert response.data["final_price"] is None and response.data["proposal_workflow"] is None
        assert response.data["items"][0]["unit_price"] is None
        assert authenticated_client.get(f"/api/quotes/{quote.reference}/pdf/").status_code == 400
        assert self.command(authenticated_client, quote, "submit").status_code == 403
        self.command(api, quote, "submit")
        assert PortalNotification.objects.filter(
            recipient=user, title__contains=quote.reference
        ).exists()
        rows = api.get("/api/quotes/", {"proposal_queue": "mine"}).data["results"]
        assert any(row["reference"] == quote.reference for row in rows)
        rows = reviewer.get("/api/quotes/", {"proposal_queue": "review"}).data["results"]
        assert any(row["reference"] == quote.reference for row in rows)
        other, _ = staff_api("other-reception", StaffRole.RECEPTIONIST)
        assert not other.get("/api/quotes/", {"proposal_queue": "mine"}).data["results"]

    def test_legacy_quotes_remain_compatible_until_revision(self, reception, quote):
        api, _ = reception
        quote.status = "quoted"
        quote.final_price = 1000
        quote.save()
        assert quote.proposal_stage == "legacy"
        assert (
            api.post(f"/api/quotes/{quote.reference}/approve-price/", {}, format="json").status_code
            == 200
        )
        assert (
            api.patch(
                f"/api/quotes/{quote.reference}/", {"final_price": "2000"}, format="json"
            ).status_code
            == 400
        )
