from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image

from apps.catalog.models import Product, ProductVariant


def image_upload(name="image.png"):
    buffer = BytesIO()
    Image.new("RGB", (1, 1), color=(0, 128, 0)).save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


@pytest.mark.django_db
class TestCatalogImages:
    def test_product_upload_is_persisted_as_data_url(self, staff_client, category):
        response = staff_client.post(
            reverse("product-list"),
            {
                "name": "Vinil Teste",
                "slug": "vinil-teste",
                "category_id": category.id,
                "description": "Imagem persistente",
                "base_price": "100.00",
                "image": image_upload(),
            },
            format="multipart",
        )

        assert response.status_code == 201, response.json()
        assert response.json()["image"].startswith("data:image/png;base64,")

        product = Product.objects.get(slug="vinil-teste")
        assert product.image_data_url.startswith("data:image/png;base64,")
        assert not product.image.name

    def test_variant_upload_is_persisted_as_data_url(self, staff_client, product):
        response = staff_client.post(
            reverse("variant-list"),
            {
                "product": product.id,
                "name": "A4",
                "price": "150.00",
                "image": image_upload("variant.png"),
            },
            format="multipart",
        )

        assert response.status_code == 201, response.json()
        assert response.json()["image"].startswith("data:image/png;base64,")

        variant = ProductVariant.objects.get(name="A4")
        assert variant.image_data_url.startswith("data:image/png;base64,")
        assert not variant.image.name
