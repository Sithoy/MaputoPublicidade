import pytest
from django.utils import timezone


@pytest.mark.django_db
def test_workspace_can_schedule_and_clear_date_on_existing_order(staff_client, order):
    url = f'/api/orders/{order.reference}/set-delivery/'
    response = staff_client.post(url, {'scheduled_date': '2026-11-02T08:30:00Z'}, format='multipart')
    assert response.status_code == 200, response.data
    order.refresh_from_db()
    assert timezone.localtime(order.scheduled_date).hour == 10
    response = staff_client.post(url, {'scheduled_date': ''}, format='multipart')
    assert response.status_code == 200, response.data
    order.refresh_from_db()
    assert order.scheduled_date is None


@pytest.mark.django_db
def test_client_cannot_schedule_staff_delivery(authenticated_client, order):
    response = authenticated_client.post(f'/api/orders/{order.reference}/set-delivery/', {'scheduled_date': ''}, format='multipart')
    assert response.status_code == 403
