from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image

from apps.portfolio.models import PortfolioItem


@pytest.mark.django_db
class TestPortfolioImages:
    def test_portfolio_upload_is_persisted_as_data_url(self, staff_client, category):
        buffer = BytesIO()
        Image.new("RGB", (1, 1), color=(0, 128, 0)).save(buffer, format="PNG")
        image = SimpleUploadedFile(
            "portfolio.png", buffer.getvalue(), content_type="image/png"
        )

        response = staff_client.post(
            reverse("portfolio-list"),
            {
                "title": "Portfolio Teste",
                "slug": "portfolio-teste",
                "category": category.id,
                "description": "Imagem persistente",
                "image": image,
            },
            format="multipart",
        )

        assert response.status_code == 201, response.json()
        assert response.json()["image"].startswith("data:image/png;base64,")

        item = PortfolioItem.objects.get(slug="portfolio-teste")
        assert item.image_data_url.startswith("data:image/png;base64,")
        assert not item.image.name
