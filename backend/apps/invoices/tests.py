import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.invoices.models import Invoice


@pytest.mark.django_db
class TestInvoiceApi:
    def test_finance_creates_standalone_invoice(self):
        finance = User.objects.create_user(
            username="finance",
            email="finance@example.com",
            password="testpass123",
            is_staff=True,
        )
        finance.profile.staff_role = StaffRole.FINANCE
        finance.profile.save(update_fields=["staff_role"])
        client = APIClient()
        client.force_authenticate(finance)

        response = client.post(
            reverse("invoice-list"),
            {
                "client_name": "Empresa Exemplo",
                "client_email": "contas@example.com",
                "client_nuit": "400123456",
                "issue_date": "2026-08-26",
                "due_date": "2026-09-10",
                "tax_rate": "16.00",
                "items": [
                    {
                        "description": "Produção de material publicitário",
                        "quantity": "2.00",
                        "unit_price": "1000.00",
                    }
                ],
            },
            format="json",
        )

        assert response.status_code == 201, response.json()
        assert response.json()["reference"] == "FT-2026-0001"
        assert response.json()["subtotal"] == 2000.0
        assert response.json()["tax_amount"] == 320.0
        assert response.json()["total"] == 2320.0

    def test_invoice_from_order_snapshots_billable_total(self, staff_client, order):
        response = staff_client.post(
            reverse("invoice-list"),
            {"order_reference": order.reference},
            format="json",
        )

        assert response.status_code == 201, response.json()
        invoice = Invoice.objects.get(order=order)
        order.refresh_from_db()
        assert invoice.client_name == "Cliente Teste"
        assert invoice.items.count() == 1
        assert invoice.total == order.final_price

    def test_invoice_due_date_cannot_precede_issue_date(self, staff_client):
        response = staff_client.post(
            reverse("invoice-list"),
            {
                "client_name": "Cliente",
                "issue_date": "2026-08-26",
                "due_date": "2026-08-25",
                "items": [
                    {"description": "Serviço", "quantity": 1, "unit_price": 100}
                ],
            },
            format="json",
        )
        assert response.status_code == 400
        assert "due_date" in response.json()

    def test_client_cannot_access_invoices(self, authenticated_client):
        response = authenticated_client.get(reverse("invoice-list"))
        assert response.status_code == 403

    def test_commercial_can_view_but_not_create_invoice(self):
        commercial = User.objects.create_user(
            username="commercial",
            email="commercial@example.com",
            password="testpass123",
            is_staff=True,
        )
        commercial.profile.staff_role = StaffRole.COMMERCIAL
        commercial.profile.save(update_fields=["staff_role"])
        client = APIClient()
        client.force_authenticate(commercial)

        assert client.get(reverse("invoice-list")).status_code == 200
        response = client.post(
            reverse("invoice-list"),
            {
                "client_name": "Cliente",
                "items": [
                    {"description": "Serviço", "quantity": 1, "unit_price": 100}
                ],
            },
            format="json",
        )
        assert response.status_code == 403

    def test_status_workflow(self, staff_client):
        invoice = Invoice.objects.create(client_name="Cliente")
        url = reverse("invoice-set-status", kwargs={"reference": invoice.reference})

        assert staff_client.post(url, {"status": "paid"}, format="json").status_code == 400
        assert staff_client.post(url, {"status": "issued"}, format="json").status_code == 200
        assert staff_client.post(url, {"status": "paid"}, format="json").status_code == 200
        invoice.refresh_from_db()
        assert invoice.amount_paid == invoice.total
        assert invoice.balance_due == 0


@pytest.mark.django_db
def test_document_client_options(staff_client, client_user):
    response = staff_client.get(reverse("client-options"))
    assert response.status_code == 200
    assert response.json()[0]["email"] == client_user.email
