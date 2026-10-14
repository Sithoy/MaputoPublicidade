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

    def test_private_upload_survives_missing_local_file(self, authenticated_client, client_user):
        content = b"\x89PNG\r\n\x1a\nbrand-logo"
        response = authenticated_client.post(
            reverse("brand-asset-list"),
            {
                "name": "Logo",
                "kind": "logo",
                "file": SimpleUploadedFile("logo.png", content, content_type="image/png"),
            },
            format="multipart",
        )
        assert response.status_code == 201
        data = response.json()
        asset = BrandAsset.objects.get(pk=data["id"])
        assert bytes(asset.private_content) == content
        assert not asset.file.storage.exists(asset.file.name)
        assert "private_content" not in data
        assert data["file_name"] == "logo.png"
        result = authenticated_client.get(data["file"])
        assert result.status_code == 200
        assert b"".join(result.streaming_content) == content
        assert result["Content-Type"] == "image/png"
        assert result["Cache-Control"] == "private, no-store"
        assert result["X-Content-Type-Options"] == "nosniff"

    def test_private_file_owner_checks(self, authenticated_client, staff_client, staff_user):
        from rest_framework.test import APIClient

        asset = BrandAsset.objects.create(
            user=staff_user,
            name="Private",
            file="private/brand_assets/example",
            private_content=b"private",
            file_name="example.pdf",
            file_mime_type="application/pdf",
        )
        url = reverse("brand-asset-file", kwargs={"pk": asset.pk})
        assert authenticated_client.get(url).status_code == 404
        assert APIClient().get(url).status_code == 401
        response = staff_client.get(url)
        assert response.status_code == 200
        assert response["Content-Disposition"].startswith("attachment;")
        response.close()

    def test_legacy_missing_file_is_clear_404(self, authenticated_client, client_user):
        asset = BrandAsset.objects.create(
            user=client_user, name="Lost", file="uploads/brand_assets/not-present.png"
        )
        response = authenticated_client.get(reverse("brand-asset-file", kwargs={"pk": asset.pk}))
        assert response.status_code == 404

    def test_legacy_file_still_downloads(
        self, authenticated_client, client_user, tmp_path, settings
    ):
        settings.MEDIA_ROOT = tmp_path
        asset = BrandAsset.objects.create(
            user=client_user,
            name="Legacy",
            file=SimpleUploadedFile("legacy.png", b"legacy-bytes", content_type="image/png"),
        )
        response = authenticated_client.get(reverse("brand-asset-file", kwargs={"pk": asset.pk}))
        assert response.status_code == 200
        assert b"".join(response.streaming_content) == b"legacy-bytes"

    def test_upload_limit(self, authenticated_client):
        response = authenticated_client.post(
            reverse("brand-asset-list"),
            {
                "name": "Too big",
                "file": SimpleUploadedFile("big.png", b"x" * (10 * 1024 * 1024 + 1)),
            },
            format="multipart",
        )
        assert response.status_code == 400
