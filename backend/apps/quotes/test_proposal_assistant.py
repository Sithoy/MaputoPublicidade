from io import BytesIO
from unittest.mock import Mock, patch

import pytest
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from openpyxl import Workbook
from rest_framework.exceptions import ValidationError

from .models import ProposalPreparation, QuoteRequest
from .proposal_assistant import (
    AssistantUnavailable,
    RequestNeedsSplitting,
    extract_draft,
    prepare_sources,
)


def draft():
    return {
        "client_name": "Ana",
        "client_email": "ana@example.com",
        "client_phone": "",
        "client_company": "Empresa",
        "summary": "Cartões para evento",
        "requested_deadline": "",
        "questions": [],
        "items": [
            {
                "description": "Cartões",
                "quantity": None,
                "specifications": "Papel mate",
                "source": "mensagem: cartões mate",
            }
        ],
    }


@pytest.fixture(autouse=True)
def reset_cache():
    cache.clear()
    yield
    cache.clear()


def test_source_limits_and_spreadsheet_rows():
    workbook = Workbook()
    workbook.active.append(["Produto", "Quantidade"])
    workbook.active.append(["Cartões", 200])
    buffer = BytesIO()
    workbook.save(buffer)
    parts, originals = prepare_sources(
        "Pedido por email", [SimpleUploadedFile("pedido.xlsx", buffer.getvalue())]
    )
    assert "linha 2: Cartões | 200" in parts[-1]["text"]
    assert originals[0]["name"] == "pedido.xlsx"
    assert originals[0]["data"]
    with pytest.raises(ValidationError):
        prepare_sources("", [])
    with pytest.raises(ValidationError):
        prepare_sources("x" * 20001, [])
    with pytest.raises(ValidationError):
        prepare_sources("Pedido", [SimpleUploadedFile("bad.pdf", b"not a PDF")])
    with pytest.raises(ValidationError):
        prepare_sources("Pedido", [SimpleUploadedFile("excess.csv", b"a,b\n" * 501)])
    with pytest.raises(ValidationError):
        prepare_sources("Pedido", [SimpleUploadedFile("huge.txt", b"a" * (2 * 1024 * 1024 + 1))])


def test_gateway_not_configured(settings):
    settings.AI_GATEWAY_API_KEY = ""
    with patch("apps.quotes.proposal_assistant.requests.post") as call:
        with pytest.raises(AssistantUnavailable):
            extract_draft([])
        call.assert_not_called()


def test_large_request_requires_splitting(settings):
    import json

    settings.AI_GATEWAY_API_KEY = "test-only"
    data = draft()
    data["requires_split"] = True
    response = Mock()
    response.json.return_value = {
        "choices": [{"finish_reason": "stop", "message": {"content": json.dumps(data)}}]
    }
    with patch("apps.quotes.proposal_assistant.requests.post", return_value=response):
        with pytest.raises(RequestNeedsSplitting):
            extract_draft([])


def test_extract_preserves_unknown_quantity_and_discards_model_prices(settings):
    import json

    settings.AI_GATEWAY_API_KEY = "test-only"
    data = draft()
    data["requires_split"] = False
    data["items"][0]["unit_price"] = 500
    response = Mock()
    response.json.return_value = {
        "choices": [{"finish_reason": "stop", "message": {"content": json.dumps(data)}}]
    }
    with patch("apps.quotes.proposal_assistant.requests.post", return_value=response) as call:
        result = extract_draft([])
        assert call.call_args.kwargs["timeout"] == (5, 45)
    assert result["items"][0]["quantity"] is None
    assert "unit_price" not in result["items"][0]
    assert "Confirmar quantidade do item 1." in result["questions"]


@pytest.mark.parametrize("quantity", [True, 1.5, -1])
def test_unsafe_model_quantity_is_rejected(settings, quantity):
    import json

    settings.AI_GATEWAY_API_KEY = "test-only"
    data = draft()
    data["requires_split"] = False
    data["items"][0]["quantity"] = quantity
    response = Mock()
    response.json.return_value = {
        "choices": [{"finish_reason": "stop", "message": {"content": json.dumps(data)}}]
    }
    with patch("apps.quotes.proposal_assistant.requests.post", return_value=response):
        with pytest.raises(AssistantUnavailable):
            extract_draft([])


@pytest.mark.django_db
def test_prepare_requires_commercial_permission(authenticated_client, staff_client, staff_user):
    assert (
        authenticated_client.post(reverse("quote-prepare"), {"text": "200 cartões"}).status_code
        == 403
    )
    with (
        patch("apps.quotes.views.extract_draft", return_value=draft()),
        patch("apps.quotes.views.notify_quote_ready") as notify,
    ):
        response = staff_client.post(
            reverse("quote-prepare"),
            {"text": "200 cartões", "source_channel": "whatsapp"},
            format="multipart",
        )
        assert response.status_code == 201
        preparation = ProposalPreparation.objects.get(pk=response.data["id"])
        assert preparation.created_by == staff_user
        assert preparation.quote_id is None
        assert QuoteRequest.objects.count() == 0
        notify.assert_not_called()


@pytest.mark.django_db
def test_review_linking_retry_and_private_sources(staff_client, staff_user, authenticated_client):
    preparation = ProposalPreparation.objects.create(
        created_by=staff_user,
        source_text="Pedido privado",
        source_channel="email",
        draft=draft(),
        source_files=[{"name": "pedido.txt", "data": "cGVkaWRv"}],
    )
    data = {
        "preparation_id": preparation.pk,
        "client_name": "Ana",
        "client_email": "ana@example.com",
        "estimated_delivery_days": 5,
        "payment_option": "deposit_50",
        "items": [
            {"description": "Cartões", "quantity": 200, "unit_price": "2.50", "notes": "Papel mate"}
        ],
    }
    assert staff_client.post(reverse("quote-manual"), data, format="json").status_code == 400
    data["ai_reviewed"] = True
    with patch("apps.quotes.views.notify_quote_ready") as notify:
        created = staff_client.post(reverse("quote-manual"), data, format="json")
        assert created.status_code == 201
        retried = staff_client.post(reverse("quote-manual"), data, format="json")
        assert retried.status_code == 200
        assert retried.data["reference"] == created.data["reference"]
        assert notify.call_count == 0  # Publishing waits for internal approval and send.
    preparation.refresh_from_db()
    assert preparation.quote.final_price == 500
    assert preparation.quote.items.first().notes == "Papel mate"
    url = reverse("quote-source", args=[created.data["reference"]])
    assert authenticated_client.get(url).status_code == 403
    assert "Pedido privado" not in str(created.data)
    sources = staff_client.get(url)
    assert sources.data["source"]["files"] == ["pedido.txt"]
    assert "data" not in sources.data["source"]
    file = staff_client.get(url, {"file": 0})
    assert b"".join(file.streaming_content) == b"pedido"
    assert staff_client.get(url, {"file": 9}).status_code == 400


@pytest.mark.django_db
def test_preparation_cannot_be_taken_from_another_staff(staff_client, client_user):
    preparation = ProposalPreparation.objects.create(
        created_by=client_user, source_channel="email", draft=draft()
    )
    response = staff_client.post(
        reverse("quote-manual"),
        {"preparation_id": preparation.pk, "ai_reviewed": True},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_prepare_rate_limit(staff_client):
    with patch("apps.quotes.views.extract_draft", return_value=draft()):
        responses = [
            staff_client.post(reverse("quote-prepare"), {"text": "200 cartões"}, format="json")
            for _ in range(6)
        ]
    assert [response.status_code for response in responses] == [201] * 5 + [429]
