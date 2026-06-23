import pytest
from django.urls import reverse


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

    def test_toggle_staff(self, staff_client, client_user):
        url = reverse("user-toggle-staff", kwargs={"pk": client_user.pk})
        response = staff_client.post(url)
        assert response.status_code == 200
        assert response.json()["is_staff"] is True
