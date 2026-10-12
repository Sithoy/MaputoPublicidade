from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from .models import QuoteRequest, QuoteRequestAttachment


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_context_flows_from_branddesk_through_reception_to_commercial(authenticated_client, staff_client):
    context = {"work_type": "vehicle", "needs_installation": True, "installation_notes": "Logótipos nas portas"}
    with patch("apps.quotes.views.notify_quote_received"):
        response = authenticated_client.post(reverse("quote-brand-request"), {
            "payload": payload(fulfilment="delivery", delivery_address="Maputo",
                items=[{"description": "Cadernos", "quantity": 200, "material_briefing": {"work_type": "paper"}},
                       {"description": "Viatura", "quantity": 1, "material_briefing": context}])
        }, format="multipart")
    assert response.status_code == 201, response.data
    quote = QuoteRequest.objects.get(reference=response.data["reference"])
    url = f"/api/reception/{quote.reference}/"
    assert staff_client.post(url + "claim/").status_code == 200
    triage = staff_client.get(url).data
    assert triage["briefing"]["delivery_address"] == "Maputo"
    assert triage["items"][1]["material_briefing"] == context
    context = {**context, "needs_visit": True, "visit_notes": "Avaliar na MP"}
    edited = staff_client.patch(url, {"items": [
        {"id": item["id"], "description": item["description"], "quantity": item["quantity"],
         "material_briefing": context if index == 1 else item["material_briefing"]}
        for index, item in enumerate(triage["items"])
    ]}, format="json")
    assert edited.status_code == 200, edited.data
    assert staff_client.post(url + "handoff/").status_code == 200
    commercial = staff_client.get(reverse("quote-detail", args=[quote.reference])).data
    assert commercial["items"][1]["material_briefing"] == context
    with patch("apps.quotes.views.notify_quote_ready"):
        priced = staff_client.post(reverse("quote-proposal", args=[quote.reference]), {
            "client_name": quote.client_name, "client_email": quote.client_email,
            "estimated_delivery_days": 10, "payment_option": "deposit_50",
            "items": [{"item_id": item.id, "description": item.description,
                       "quantity": item.quantity, "unit_price": "20.00"} for item in quote.items.all()],
        }, format="json")
    assert priced.status_code == 200, priced.data
    assert quote.items.last().material_briefing == context
    quote.refresh_from_db()
    assert quote.reception_briefing["_original"]["items"][1]["material_briefing"]["installation_notes"] == "Logótipos nas portas"


@pytest.mark.django_db
@pytest.mark.parametrize("context", [{"work_type": "invalid"}, {"unit_price": 1}, {"visit_notes": "x" * 2001}])
def test_material_context_validated_before_creating_request(authenticated_client, context):
    response = authenticated_client.post(reverse("quote-brand-request"), {
        "payload": payload(items=[{"description": "Material", "quantity": 1, "material_briefing": context}])
    }, format="multipart")
    assert response.status_code == 400
    assert not QuoteRequest.objects.exists()


def payload(**changes):
    import json

    data = {
        "intent": "campaign",
        "project_name": "Conferência anual",
        "fulfilment": "installation",
        "notes": "Materiais para 200 participantes",
        "needs_design": True,
        "items": [
            {"description": "Rollups", "quantity": 2, "specifications": "85x200cm"},
            {"description": "Polos", "quantity": 50},
        ],
    }
    data.update(changes)
    return json.dumps(data)


@pytest.mark.django_db
def test_client_request_keeps_items_private_evidence_and_company(
    authenticated_client, client_user, staff_client
):
    client_user.profile.company = "Empresa Horizonte"
    client_user.profile.nuit = "400123456"
    client_user.profile.save()
    file = SimpleUploadedFile("briefing.pdf", b"%PDF-1.4\n%%EOF", content_type="application/pdf")
    with patch("apps.quotes.views.notify_quote_received"):
        response = authenticated_client.post(
            reverse("quote-brand-request"),
            {"payload": payload(), "files": [file]},
            format="multipart",
        )
    assert response.status_code == 201, response.data
    quote = QuoteRequest.objects.get(reference=response.data["reference"])
    assert quote.user == client_user and quote.client_name == "Empresa Horizonte"
    assert quote.client_nuit == "400123456" and quote.contact_source == "web"
    assert quote.status == "received" and quote.final_price is None
    assert list(quote.items.values_list("quantity", flat=True)) == [2, 50]
    assert quote.items.first().notes == "85x200cm"
    assert quote.briefing["project_name"] == "Conferência anual"
    evidence = response.data["request_attachments"][0]
    assert set(evidence) == {"id", "name", "size"}
    assert staff_client.get(reverse("quote-detail", args=[quote.reference])).data[
        "request_attachments"
    ] == [evidence]
    url = reverse("quote-attachment", args=[quote.reference]) + f"?id={evidence['id']}"
    download = authenticated_client.get(url)
    assert download.status_code == 200
    assert b"".join(download.streaming_content) == b"%PDF-1.4\n%%EOF"
    assert download["Cache-Control"] == "private, no-store"
    assert staff_client.get(url).status_code == 200


@pytest.mark.django_db
def test_guidance_has_no_fabricated_items(authenticated_client):
    with patch("apps.quotes.views.notify_quote_received"):
        response = authenticated_client.post(
            reverse("quote-brand-request"),
            {"payload": payload(intent="guidance", items=[])},
            format="multipart",
        )
    assert response.status_code == 201
    quote = QuoteRequest.objects.get(reference=response.data["reference"])
    assert not quote.items.exists() and quote.estimated_price is None


@pytest.mark.django_db
@pytest.mark.parametrize(
    "changes",
    [
        {"items": [{"description": "Polos", "quantity": None}]},
        {"items": [{"description": "Polos", "quantity": 2.5}]},
        {"items": [{"description": "Polos", "quantity": 0}]},
        {"items": [], "notes": ""},
        {"deadline": "2020-01-01"},
    ],
)
def test_invalid_briefing_creates_nothing(authenticated_client, changes):
    response = authenticated_client.post(
        reverse("quote-brand-request"), {"payload": payload(**changes)}, format="multipart"
    )
    assert response.status_code == 400
    assert not QuoteRequest.objects.exists()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "name,content",
    [
        ("active.svg", b"<svg/>"),
        ("fake.pdf", b"not a pdf"),
        ("fake.png", b"not an image"),
        ("large.csv", b"a" * (2 * 1024 * 1024 + 1)),
    ],
    ids=["svg", "fake-pdf", "fake-image", "oversize"],
)
def test_invalid_upload_is_atomic(authenticated_client, name, content):
    file = SimpleUploadedFile(name, content)
    response = authenticated_client.post(
        reverse("quote-brand-request"), {"payload": payload(), "files": [file]}, format="multipart"
    )
    assert response.status_code == 400
    assert not QuoteRequest.objects.exists() and not QuoteRequestAttachment.objects.exists()


@pytest.mark.django_db
def test_attachment_is_scoped_to_owner_and_quote(authenticated_client, client_user, quote):
    other = QuoteRequest.objects.create(client_name="Outro cliente")
    file = QuoteRequestAttachment.objects.create(
        quote=other, name="private.pdf", size=5, content=b"test"
    )
    other_url = reverse("quote-attachment", args=[other.reference]) + f"?id={file.id}"
    own_url = reverse("quote-attachment", args=[quote.reference]) + f"?id={file.id}"
    assert authenticated_client.get(other_url).status_code in {403, 404}
    assert authenticated_client.get(own_url).status_code == 404
    assert APIClient().get(other_url).status_code == 401
    assert (
        APIClient()
        .post(reverse("quote-brand-request"), {"payload": payload()}, format="multipart")
        .status_code
        == 401
    )


@pytest.mark.django_db
def test_commercial_preparation_preserves_branddesk_briefing_and_attachments(authenticated_client, staff_client):
    file = SimpleUploadedFile("brief.pdf", b"%PDF-1.4\n%%EOF")
    with patch("apps.quotes.views.notify_quote_received"):
        created = authenticated_client.post(reverse("quote-brand-request"), {"payload": payload(), "files": [file]}, format="multipart")
    quote = QuoteRequest.objects.get(reference=created.data["reference"])
    briefing = quote.briefing
    attachment = quote.request_attachments.get()
    with patch("apps.quotes.views.notify_quote_ready"):
        prepared = staff_client.post(reverse("quote-proposal", args=[quote.reference]), {
            "client_name": quote.client_name, "client_email": quote.client_email,
            "estimated_delivery_days": 10, "payment_option": "deposit_50",
            "items": [{"item_id": item.id, "description": item.description,
                       "quantity": item.quantity, "unit_price": "20.00"} for item in quote.items.all()],
        }, format="json")
    assert prepared.status_code == 200, prepared.data
    quote.refresh_from_db()
    assert QuoteRequest.objects.count() == 1 and quote.status == "reviewing"
    assert quote.proposal_stage == "draft"
    assert quote.briefing == briefing
    assert quote.request_attachments.get().id == attachment.id
    assert quote.items.first().notes == "85x200cm"


@pytest.mark.django_db
def test_request_endpoint_is_rate_limited(authenticated_client):
    for _ in range(5):
        response = authenticated_client.post(reverse("quote-brand-request"), {"payload": "{}"}, format="multipart")
        assert response.status_code == 400
    response = authenticated_client.post(reverse("quote-brand-request"), {"payload": "{}"}, format="multipart")
    assert response.status_code == 429
    assert not QuoteRequest.objects.exists()
