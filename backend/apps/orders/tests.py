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
