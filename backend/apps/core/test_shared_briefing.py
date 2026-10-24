import json
from io import BytesIO
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.quotes.models import QuoteRequest, QuoteRequestAttachment

from .reception_briefing import reception_briefing
from .test_production import assert_no_finance


@pytest.fixture(autouse=True)
def isolated_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def technical_client(db):
    user = User.objects.create_user('shared-briefing-studio', is_staff=True)
    user.profile.staff_role = StaffRole.PRODUCTION
    user.profile.save()
    api = APIClient()
    api.force_authenticate(user)
    return api


def logo():
    buffer = BytesIO()
    Image.new('RGB', (4, 4), 'green').save(buffer, format='PNG')
    return SimpleUploadedFile('logo.png', buffer.getvalue(), content_type='image/png')


@pytest.mark.django_db
def test_studio_uses_current_reception_briefing_without_original_or_internal_files(quoted_quote, technical_client):
    quote = quoted_quote
    quote.briefing = {'project_name': 'Original', 'notes': 'Logótipo na frente'}
    quote.reception_briefing = {'project_name': 'Campanha confirmada', 'description': 'Bordar no peito',
        'delivery_address': 'Maputo', '_original': {'budget': 'secret'}, 'internal_notes': 'Financeiro'}
    quote.save()
    quote.items.update(notes='Usar verde escuro')
    public = QuoteRequestAttachment.objects.create(quote=quote, name='logo.png', size=4, content=b'logo')
    internal = QuoteRequestAttachment.objects.create(quote=quote, name='interno.pdf', size=4, content=b'priv', is_internal=True)
    url = f'/api/production/{quote.reference}/'
    data = technical_client.get(url).data
    assert data['briefing'] == reception_briefing(quote)
    assert '_original' not in data['briefing'] and 'internal_notes' not in data['briefing']
    assert data['items'][0]['notes'] == 'Usar verde escuro'
    assert data['references'] == [{'id': public.pk, 'name': 'logo.png', 'size': 4}]
    assert_no_finance(data)
    quote.reception_briefing['description'] = 'Posição confirmada pelo cliente'
    quote.save()
    assert technical_client.get(url).data['briefing']['description'] == 'Posição confirmada pelo cliente'
    assert quote.briefing['project_name'] == 'Original'
    assert technical_client.get(f'{url}references/{internal.pk}/').status_code == 404


@pytest.mark.django_db
def test_private_logo_preview_is_scoped_and_requires_technical_access(quoted_quote, technical_client, authenticated_client):
    file = logo()
    attachment = QuoteRequestAttachment.objects.create(quote=quoted_quote, name=file.name, size=file.size, content=file.read())
    url = f'/api/production/{quoted_quote.reference}/references/{attachment.pk}/'
    response = technical_client.get(url + '?preview=1')
    assert response.status_code == 200 and response['Content-Type'] == 'image/png'
    assert response['Cache-Control'] == 'private, no-store'
    assert response['Content-Security-Policy'] == 'sandbox'
    assert b''.join(response.streaming_content).startswith(b'\x89PNG')
    assert APIClient().get(url).status_code == 401
    assert authenticated_client.get(url).status_code == 403
    other = QuoteRequest.objects.create(client_name='Outra empresa', status='quoted')
    assert technical_client.get(f'/api/production/{other.reference}/references/{attachment.pk}/').status_code == 404


@pytest.mark.django_db
def test_public_request_keeps_logo_private_and_json_compatible():
    api = APIClient()
    payload = {'client_name': 'Empresa', 'client_email': 'cliente@example.test', 'notes': 'Bordar o logótipo',
        'items': [{'description': 'Polos', 'quantity': 200, 'needs_design': True}]}
    with patch('apps.quotes.views.notify_quote_received'):
        response = api.post('/api/quotes/', {'payload': json.dumps(payload), 'files': [logo()]}, format='multipart')
        assert response.status_code == 201, response.data
        plain = api.post('/api/quotes/', payload, format='json')
        assert plain.status_code == 201
    quote = QuoteRequest.objects.get(reference=response.data['reference'])
    assert quote.request_attachments.get().name == 'logo.png'
    assert 'content' not in response.data['request_attachments'][0]
    assert api.get(f'/api/quotes/{quote.reference}/attachment/?id={quote.request_attachments.get().pk}').status_code == 401


@pytest.mark.django_db
def test_invalid_reference_rejects_public_request_before_creating_rows():
    response = APIClient().post('/api/quotes/', {'payload': json.dumps({'client_name': 'Empresa'}),
        'files': [SimpleUploadedFile('logo.svg', b'<svg/>')]}, format='multipart')
    assert response.status_code == 400
    assert not QuoteRequest.objects.exists()


@pytest.mark.django_db
def test_cart_upload_is_atomic_and_available_to_studio(authenticated_client, cart_item, technical_client):
    payload = json.dumps({'client_name': 'Empresa', 'client_email': 'cliente@example.test'})
    url = '/api/cart/convert-to-quote/'
    invalid = authenticated_client.post(url, {'payload': payload, 'files': [SimpleUploadedFile('logo.png', b'not an image')]}, format='multipart')
    assert invalid.status_code == 400
    assert cart_item.cart.items.count() == 1 and not QuoteRequest.objects.exists()
    response = authenticated_client.post(url, {'payload': payload, 'files': [logo()]}, format='multipart')
    assert response.status_code == 201, response.data
    quote = QuoteRequest.objects.get(reference=response.data['reference'])
    assert quote.request_attachments.get().name == 'logo.png'
    assert cart_item.cart.items.count() == 0
    quote.status = 'quoted'
    quote.save()
    assert technical_client.get(f'/api/production/{quote.reference}/').data['references'][0]['name'] == 'logo.png'
