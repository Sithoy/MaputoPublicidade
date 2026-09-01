import pytest
from django.urls import reverse

from apps.orders.models import Order


@pytest.mark.django_db
class TestOrderApi:
    def test_list_orders_requires_auth(self):
        from rest_framework.test import APIClient

        client = APIClient()
        response = client.get(reverse("order-list"))
        assert response.status_code == 401

    def test_client_sees_only_own_orders(self, authenticated_client, order, staff_user):
        Order.objects.create(user=staff_user, final_price="500.00")
        response = authenticated_client.get(reverse("order-list"))
        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) == 1
        assert results[0]["reference"] == order.reference

    def test_staff_sees_all_orders(self, staff_client, order, client_user):
        Order.objects.create(user=client_user, final_price="300.00")
        response = staff_client.get(reverse("order-list"))
        assert response.status_code == 200
        assert len(response.json()["results"]) == 2

    def test_set_status_staff_only(self, authenticated_client, staff_client, order):
        url = reverse("order-set-status", kwargs={"reference": order.reference})
        response = authenticated_client.post(url, {"status": "in_production"}, format="json")
        assert response.status_code == 403

        response = staff_client.post(url, {"status": "in_production"}, format="json")
        assert response.status_code == 200
        order.refresh_from_db()
        assert order.status == Order.STATUS_IN_PRODUCTION

    def test_create_payment_updates_order(self, staff_client, order):
        url = reverse("order-payments", kwargs={"reference": order.reference})
        response = staff_client.post(
            url,
            {"amount": "500.00", "method": "cash", "status": "completed"},
            format="json",
        )
        assert response.status_code == 201
        order.refresh_from_db()
        assert order.amount_paid == 500
        assert order.payment_status == Order.PAYMENT_PARTIAL

    def test_payment_above_amount_due_rejected(self, staff_client, order):
        url = reverse("order-payments", kwargs={"reference": order.reference})
        response = staff_client.post(
            url,
            {"amount": "1500.00", "method": "cash", "status": "completed"},
            format="json",
        )
        assert response.status_code == 400

    def test_invalid_order_status_transition_rejected(self, staff_client, order):
        url = reverse("order-set-status", kwargs={"reference": order.reference})
        response = staff_client.post(url, {"status": "delivered"}, format="json")
        assert response.status_code == 400
        order.refresh_from_db()
        assert order.status == Order.STATUS_APPROVED

    def test_set_status_records_activity(self, staff_client, order):
        url = reverse("order-set-status", kwargs={"reference": order.reference})
        staff_client.post(url, {"status": "in_production"}, format="json")
        event = order.activity_events.get(action="status_changed")
        assert event.from_status == "approved"
        assert event.to_status == "in_production"

    def test_staff_sets_delivery_details(self, staff_client, order, staff_user):
        url = reverse("order-set-delivery", kwargs={"reference": order.reference})
        response = staff_client.post(
            url,
            {
                "delivery_method": "delivery",
                "delivery_address": "Av. 25 de Setembro, Maputo",
                "scheduled_date": "2026-09-05T10:00:00+02:00",
                "installation_required": True,
                "delivery_responsible_id": staff_user.id,
            },
            format="json",
        )
        assert response.status_code == 200, response.json()
        order.refresh_from_db()
        assert order.installation_required is True
        assert order.delivery_responsible == staff_user
        assert order.activity_events.filter(action="delivery_updated").exists()

    def test_client_confirms_delivery_when_ready(self, authenticated_client, order, staff_client):
        order.status = Order.STATUS_READY
        order.save(update_fields=["status"])

        url = reverse("order-confirm-delivery", kwargs={"reference": order.reference})
        response = authenticated_client.post(url)
        assert response.status_code == 200, response.json()
        order.refresh_from_db()
        assert order.status == Order.STATUS_DELIVERED
        assert order.client_confirmed_at is not None
        assert order.activity_events.filter(action="delivery_confirmed").exists()

    def test_client_cannot_confirm_before_ready(self, authenticated_client, order):
        url = reverse("order-confirm-delivery", kwargs={"reference": order.reference})
        response = authenticated_client.post(url)
        assert response.status_code == 400
        order.refresh_from_db()
        assert order.status == Order.STATUS_APPROVED
