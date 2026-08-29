import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient

from apps.core.adapter import HeadlessAdapter
from apps.orders.models import Order

from .roles import StaffCapability, StaffRole, has_staff_capability


@pytest.fixture
def superuser(db):
    return User.objects.create_superuser(
        username="rootadmin",
        email="root@example.com",
        password="R00t-Admin-2026!",
    )


@pytest.fixture
def superuser_client(superuser):
    client = APIClient()
    client.force_authenticate(user=superuser)
    return client


@pytest.mark.django_db
class TestMeView:
    def test_get_me_requires_auth(self):
        from rest_framework.test import APIClient

        client = APIClient()
        response = client.get(reverse("me"))
        assert response.status_code == 401

    def test_get_me_returns_user(self, authenticated_client, client_user):
        response = authenticated_client.get(reverse("me"))
        assert response.status_code == 200
        assert response.json()["email"] == client_user.email

    def test_patch_me_updates_name(self, authenticated_client):
        response = authenticated_client.patch(
            reverse("me"),
            {"first_name": "Novo", "last_name": "Nome"},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["first_name"] == "Novo"
        assert response.json()["last_name"] == "Nome"


@pytest.mark.django_db
class TestClientSelfRegistration:
    signup_url = "/_allauth/app/v1/auth/signup"

    def test_client_can_create_account_and_company_profile(self):
        client = APIClient()
        response = client.post(
            self.signup_url,
            {
                "email": "dario@empresa.co.mz",
                "password": "BrandDesk-Cliente-2026!",
                "password_confirm": "BrandDesk-Cliente-2026!",
                "first_name": "Dario",
                "last_name": "Nhampossa",
                "company": "Empresa Moçambicana",
                "phone": "+258 84 123 4567",
                "nuit": "400123456",
                "accept_terms": True,
                "is_staff": True,
            },
            format="json",
            secure=True,
        )

        assert response.status_code == 200
        assert response.json()["meta"]["is_authenticated"] is True
        assert response.json()["meta"]["access_token"]

        user = User.objects.get(email="dario@empresa.co.mz")
        assert user.first_name == "Dario"
        assert user.last_name == "Nhampossa"
        assert user.is_staff is False
        assert user.is_superuser is False
        assert user.profile.company == "Empresa Moçambicana"
        assert user.profile.phone == "+258 84 123 4567"
        assert user.profile.nuit == "400123456"

    def test_registration_requires_terms_acceptance(self):
        response = APIClient().post(
            self.signup_url,
            {
                "email": "sem-termos@example.com",
                "password": "BrandDesk-Cliente-2026!",
                "password_confirm": "BrandDesk-Cliente-2026!",
                "first_name": "Ana",
                "last_name": "Mussa",
                "accept_terms": False,
            },
            format="json",
            secure=True,
        )

        assert response.status_code == 400
        assert not User.objects.filter(email="sem-termos@example.com").exists()

    def test_registration_rejects_different_passwords(self):
        response = APIClient().post(
            self.signup_url,
            {
                "email": "senhas@example.com",
                "password": "BrandDesk-Cliente-2026!",
                "password_confirm": "Outra-Password-2026!",
                "first_name": "Ana",
                "last_name": "Mussa",
                "accept_terms": True,
            },
            format="json",
            secure=True,
        )

        assert response.status_code == 400
        assert not User.objects.filter(email="senhas@example.com").exists()


@pytest.mark.django_db
class TestUserManagement:
    def test_user_list_requires_staff(self, authenticated_client, staff_client):
        response = authenticated_client.get(reverse("user-list"))
        assert response.status_code == 403

        response = staff_client.get(reverse("user-list"))
        assert response.status_code == 200
        assert "results" in response.json()

    def test_toggle_staff(self, superuser_client, client_user):
        url = reverse("user-toggle-staff", kwargs={"pk": client_user.pk})
        response = superuser_client.post(url)
        assert response.status_code == 200
        assert response.json()["is_staff"] is True

    def test_regular_admin_cannot_promote_user(self, staff_client, client_user):
        url = reverse("user-toggle-staff", kwargs={"pk": client_user.pk})
        response = staff_client.post(url)
        assert response.status_code == 403

    def test_regular_admin_can_create_client(self, staff_client):
        response = staff_client.post(
            reverse("user-list"),
            {
                "email": "cliente.novo@example.com",
                "first_name": "Cliente",
                "last_name": "Novo",
                "is_staff": False,
                "is_active": True,
                "password": "N3w-Cl!ent-Temp-2026",
                "password_confirm": "N3w-Cl!ent-Temp-2026",
                "profile": {
                    "company": "Empresa Nova",
                    "phone": "+258 84 000 0000",
                    "nuit": "400000001",
                    "address": "Maputo",
                    "billing_address": "Maputo",
                },
            },
            format="json",
        )

        assert response.status_code == 201
        user = User.objects.get(email="cliente.novo@example.com")
        assert user.check_password("N3w-Cl!ent-Temp-2026")
        assert user.profile.company == "Empresa Nova"
        email = EmailAddress.objects.get(user=user)
        assert email.verified is True
        assert email.primary is True

    def test_regular_admin_cannot_create_admin(self, staff_client):
        response = staff_client.post(
            reverse("user-list"),
            {
                "email": "admin.novo@example.com",
                "is_staff": True,
                "is_active": True,
                "password": "N3w-Admin-Temp-2026!",
                "password_confirm": "N3w-Admin-Temp-2026!",
            },
            format="json",
        )
        assert response.status_code == 403

    def test_duplicate_email_is_rejected(self, staff_client, client_user):
        response = staff_client.post(
            reverse("user-list"),
            {
                "email": client_user.email.upper(),
                "is_staff": False,
                "is_active": True,
                "password": "N3w-Cl!ent-Temp-2026",
                "password_confirm": "N3w-Cl!ent-Temp-2026",
            },
            format="json",
        )
        assert response.status_code == 400
        assert "email" in response.json()

    def test_admin_can_reset_client_password(self, staff_client, client_user):
        response = staff_client.post(
            reverse("user-set-password", kwargs={"pk": client_user.pk}),
            {
                "new_password": "N3w-Secure-Pass-2026!",
                "confirm_password": "N3w-Secure-Pass-2026!",
            },
            format="json",
        )
        assert response.status_code == 200
        client_user.refresh_from_db()
        assert client_user.check_password("N3w-Secure-Pass-2026!")

    def test_regular_admin_cannot_reset_another_admin_password(self, staff_client, db):
        other_admin = User.objects.create_user(
            username="otheradmin",
            email="otheradmin@example.com",
            password="Other-Admin-2026!",
            is_staff=True,
        )
        response = staff_client.post(
            reverse("user-set-password", kwargs={"pk": other_admin.pk}),
            {
                "new_password": "N3w-Secure-Pass-2026!",
                "confirm_password": "N3w-Secure-Pass-2026!",
            },
            format="json",
        )
        assert response.status_code == 403

    def test_admin_cannot_deactivate_self(self, superuser_client, superuser):
        response = superuser_client.post(reverse("user-toggle-active", kwargs={"pk": superuser.pk}))
        assert response.status_code == 400

    def test_admin_cannot_demote_self(self, superuser_client, superuser):
        response = superuser_client.post(reverse("user-toggle-staff", kwargs={"pk": superuser.pk}))
        assert response.status_code == 400

    def test_user_summary(self, staff_client, staff_user, client_user):
        response = staff_client.get(reverse("user-summary"))
        assert response.status_code == 200
        payload = response.json()
        assert payload["total"] == User.objects.count()
        assert payload["active"] == User.objects.filter(is_active=True).count()
        assert payload["inactive"] == User.objects.filter(is_active=False).count()
        assert payload["staff"] == User.objects.filter(is_staff=True).count()
        assert payload["clients"] == User.objects.filter(is_staff=False).count()

    def test_user_deletion_is_not_available(self, staff_client, client_user):
        response = staff_client.delete(reverse("user-detail", kwargs={"pk": client_user.pk}))
        assert response.status_code == 405


@pytest.mark.django_db
class TestStaffRbac:
    @staticmethod
    def staff_client(role, suffix):
        user = User.objects.create_user(
            username=f"{role}-{suffix}",
            email=f"{role}-{suffix}@example.com",
            password="Role-Test-2026!",
            is_staff=True,
        )
        user.profile.staff_role = role
        user.profile.save(update_fields=["staff_role"])
        client = APIClient()
        client.force_authenticate(user=user)
        return user, client

    def test_me_exposes_role_and_capabilities(self):
        user, client = self.staff_client(StaffRole.COMMERCIAL, "me")
        response = client.get(reverse("me"))

        assert response.status_code == 200
        assert response.json()["role"] == StaffRole.COMMERCIAL
        assert StaffCapability.MANAGE_QUOTES in response.json()["capabilities"]
        assert StaffCapability.MANAGE_PAYMENTS not in response.json()["capabilities"]
        assert has_staff_capability(user, StaffCapability.VIEW_DASHBOARD)

        session_user = HeadlessAdapter().serialize_user(user)
        assert session_user["role"] == StaffRole.COMMERCIAL
        assert StaffCapability.MANAGE_QUOTES in session_user["capabilities"]

    def test_commercial_can_manage_quotes_but_not_catalog(self, quote):
        _user, client = self.staff_client(StaffRole.COMMERCIAL, "quote")

        quote_response = client.post(
            reverse("quote-set-price", kwargs={"reference": quote.reference}),
            {"final_price": "1200.00"},
            format="json",
        )
        catalog_response = client.post(
            reverse("category-list"),
            {"name": "Restrita", "slug": "restrita"},
            format="json",
        )

        assert quote_response.status_code == 200
        assert catalog_response.status_code == 403

    def test_production_can_advance_order_but_not_record_payment(self, order):
        _user, client = self.staff_client(StaffRole.PRODUCTION, "order")
        status_url = reverse("order-set-status", kwargs={"reference": order.reference})
        payment_url = reverse("order-set-payment", kwargs={"reference": order.reference})

        status_response = client.post(
            status_url, {"status": "in_production"}, format="json"
        )
        payment_response = client.post(
            payment_url,
            {"payment_status": "partial", "amount_paid": "100.00"},
            format="json",
        )

        assert status_response.status_code == 200
        assert payment_response.status_code == 403

    def test_production_cannot_cancel_an_order(self, order):
        _user, client = self.staff_client(StaffRole.PRODUCTION, "cancel")
        response = client.post(
            reverse("order-set-status", kwargs={"reference": order.reference}),
            {"status": "cancelled"},
            format="json",
        )

        assert response.status_code == 403
        order.refresh_from_db()
        assert order.status == Order.STATUS_APPROVED

    def test_finance_can_record_payment_but_not_advance_order(self, order):
        _user, client = self.staff_client(StaffRole.FINANCE, "payment")
        payment_url = reverse("order-set-payment", kwargs={"reference": order.reference})
        status_url = reverse("order-set-status", kwargs={"reference": order.reference})

        payment_response = client.post(
            payment_url,
            {"payment_status": "partial", "amount_paid": "100.00"},
            format="json",
        )
        status_response = client.post(
            status_url, {"status": "in_production"}, format="json"
        )

        assert payment_response.status_code == 200
        assert status_response.status_code == 403

    def test_content_role_can_manage_catalog_but_not_orders(self):
        _user, client = self.staff_client(StaffRole.CONTENT, "content")

        catalog_response = client.post(
            reverse("category-list"),
            {"name": "Nova categoria", "slug": "nova-categoria"},
            format="json",
        )
        orders_response = client.get(reverse("order-list"))
        dashboard_response = client.get(reverse("admin-stats"))

        assert catalog_response.status_code == 201
        assert orders_response.status_code == 403
        assert dashboard_response.status_code == 403

    def test_receptionist_has_intake_access_without_commercial_management(self):
        user, client = self.staff_client(StaffRole.RECEPTIONIST, "intake")

        response = client.get(reverse("me"))

        assert response.status_code == 200
        assert StaffCapability.CREATE_INTAKE in response.json()["capabilities"]
        assert StaffCapability.VIEW_QUOTES in response.json()["capabilities"]
        assert StaffCapability.VIEW_ORDERS in response.json()["capabilities"]
        assert StaffCapability.MANAGE_QUOTES not in response.json()["capabilities"]
        assert StaffCapability.MANAGE_ORDERS not in response.json()["capabilities"]
        assert has_staff_capability(user, StaffCapability.CREATE_INTAKE)

    def test_owner_can_create_staff_with_specific_role(self, superuser_client):
        response = superuser_client.post(
            reverse("user-list"),
            {
                "email": "financeiro@example.com",
                "first_name": "Marta",
                "last_name": "Finanças",
                "is_staff": True,
                "staff_role": StaffRole.FINANCE,
                "is_active": True,
                "password": "Finance-Temp-2026!",
                "password_confirm": "Finance-Temp-2026!",
            },
            format="json",
        )

        assert response.status_code == 201
        assert response.json()["role"] == StaffRole.FINANCE
        created = User.objects.get(email="financeiro@example.com")
        assert created.profile.staff_role == StaffRole.FINANCE

    def test_only_owner_can_change_an_existing_staff_role(
        self, staff_client, superuser_client
    ):
        target, _client = self.staff_client(StaffRole.COMMERCIAL, "role-change")
        url = reverse("user-detail", kwargs={"pk": target.pk})

        denied = staff_client.patch(
            url, {"staff_role": StaffRole.FINANCE}, format="json"
        )
        allowed = superuser_client.patch(
            url, {"staff_role": StaffRole.FINANCE}, format="json"
        )

        assert denied.status_code == 403
        assert allowed.status_code == 200
        assert allowed.json()["role"] == StaffRole.FINANCE

    def test_finance_cannot_read_internal_order_notes(self, order):
        order.internal_notes = "Informação reservada da produção"
        order.save(update_fields=["internal_notes"])
        _finance, finance_client = self.staff_client(StaffRole.FINANCE, "notes")
        _production, production_client = self.staff_client(
            StaffRole.PRODUCTION, "notes"
        )
        url = reverse("order-detail", kwargs={"reference": order.reference})

        finance_response = finance_client.get(url)
        production_response = production_client.get(url)

        assert finance_response.status_code == 200
        assert finance_response.json()["internal_notes"] is None
        assert production_response.json()["internal_notes"] == order.internal_notes
