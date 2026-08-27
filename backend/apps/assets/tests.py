import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from apps.assets.models import BrandAsset


@pytest.mark.django_db
class TestBrandAssetApi:
    def test_client_uploads_own_asset(self, authenticated_client):
        file = SimpleUploadedFile("logo.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        response = authenticated_client.post(
            reverse("brand-asset-list"),
            {"name": "Logótipo principal", "kind": "logo", "file": file},
            format="multipart",
        )
        assert response.status_code == 201, response.json()
        assert BrandAsset.objects.filter(name="Logótipo principal").exists()

    def test_client_sees_only_own_assets(self, authenticated_client, client_user, staff_user):
        BrandAsset.objects.create(user=client_user, name="O meu logo", kind="logo")
        BrandAsset.objects.create(user=staff_user, name="Logo de outrem", kind="logo")

        response = authenticated_client.get(reverse("brand-asset-list"))
        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) == 1
        assert results[0]["name"] == "O meu logo"

    def test_staff_sees_all_assets(self, staff_client, client_user):
        BrandAsset.objects.create(user=client_user, name="Logo do cliente", kind="logo")
        response = staff_client.get(reverse("brand-asset-list"))
        assert response.status_code == 200
        assert len(response.json()["results"]) == 1

    def test_client_cannot_delete_others_asset(self, authenticated_client, staff_user):
        asset = BrandAsset.objects.create(user=staff_user, name="Logo protegido", kind="logo")
        response = authenticated_client.delete(
            reverse("brand-asset-detail", kwargs={"pk": asset.pk})
        )
        assert response.status_code == 404
        assert BrandAsset.objects.filter(pk=asset.pk).exists()

    def test_anonymous_cannot_list_assets(self):
        from rest_framework.test import APIClient

        response = APIClient().get(reverse("brand-asset-list"))
        assert response.status_code == 401
