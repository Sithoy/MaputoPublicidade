import pytest
from allauth.account.models import EmailAddress
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient


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
