from unittest.mock import patch

import pytest
from django.core.exceptions import ValidationError as ModelValidationError
from django.urls import reverse
from rest_framework.exceptions import ValidationError

from apps.core.reception_views import ReceptionItemSerializer
from apps.invoices.models import InvoiceItem
from apps.invoices.serializers import InvoiceItemSerializer
from apps.orders.models import OrderItem
from apps.orders.serializers import OrderItemCreateSerializer
from apps.quotes.brand_requests import BrandItemSerializer
from apps.quotes.models import QuoteItem
from apps.quotes.proposal_assistant import DraftItemSerializer
from apps.quotes.serializers import (
    ManualQuoteItemSerializer,
    QuoteItemCreateSerializer,
    ReceptionIntakeItemSerializer,
)


@pytest.mark.django_db
@pytest.mark.parametrize("length, expected_status", [(256, 201), (510, 201), (511, 400)])
def test_create_proposal_description_boundary(staff_client, length, expected_status):
    description = "Á" * length
    with patch("apps.quotes.views.notify_quote_ready"):
        response = staff_client.post(reverse("quote-manual"), {
            "client_name": "Cliente Teste", "client_phone": "841234567",
            "estimated_delivery_days": 7,
            "items": [{"description": description, "quantity": 2, "unit_price": "500.00"}],
        }, format="json")
    assert response.status_code == expected_status, response.data
    if expected_status == 201:
        assert response.data["items"][0]["description"] == description
    else:
        assert "description" in response.data["items"][0]


@pytest.mark.parametrize("serializer_type", [
    QuoteItemCreateSerializer, ManualQuoteItemSerializer, ReceptionIntakeItemSerializer,
    ReceptionItemSerializer, BrandItemSerializer, DraftItemSerializer,
    OrderItemCreateSerializer, InvoiceItemSerializer,
])
@pytest.mark.parametrize("length", [255, 256, 510, 511])
def test_description_validation_boundary(serializer_type, length):
    field = serializer_type().fields["description"]
    description = "Á" * length
    if length > 510:
        with pytest.raises(ValidationError):
            field.run_validation(description)
    else:
        assert field.run_validation(description) == description


@pytest.mark.parametrize("model", [QuoteItem, OrderItem, InvoiceItem])
def test_description_model_boundary(model):
    field = model._meta.get_field("description")
    assert field.max_length == 510
    assert field.clean("Á" * 510, None) == "Á" * 510
    with pytest.raises(ModelValidationError):
        field.clean("Á" * 511, None)
