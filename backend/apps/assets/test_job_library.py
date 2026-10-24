import hashlib
import json
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.studio import readiness
from apps.core.test_production import publish, upload
from apps.quotes.models import ArtworkApproval, QuoteRequest

from .models import BrandAsset


@pytest.fixture(autouse=True)
def clean_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def studio_client(db):
    user = User.objects.create_user('library-studio', is_staff=True)
    user.profile.staff_role = StaffRole.PRODUCTION
    user.profile.save()
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def logo_asset(client_user):
    return BrandAsset.objects.create(user=client_user, name='Logótipo principal', kind='logo',
        file='private/logo', file_name='logo.pdf', file_size=14, file_mime_type='application/pdf', private_content=b'%PDF-1.4\nlogo')


def request(client, ids):
    with patch('apps.quotes.views.notify_quote_received'):
        return client.post('/api/quotes/brand-request/', {'payload': json.dumps({
            'intent': 'quote', 'project_name': 'Polos', 'fulfilment': 'pickup', 'needs_design': True,
            'items': [{'description': 'Polos', 'quantity': 200}], 'library_asset_ids': ids})}, format='multipart')


@pytest.mark.django_db
def test_library_selection_preserves_bytes_origin_and_account_scope(authenticated_client, client_user, logo_asset, studio_client):
    response = request(authenticated_client, [logo_asset.pk])
    assert response.status_code == 201, response.data
    quote = QuoteRequest.objects.get(reference=response.data['reference'])
    file = quote.request_attachments.get()
    assert bytes(file.content) == b'%PDF-1.4\nlogo'
    assert file.library_origin['sha256'] == hashlib.sha256(bytes(file.content)).hexdigest()
    assert response.data['request_attachments'][0]['library_origin']['name'] == logo_asset.name
    # A library label is not a job-specific artwork approval.
    assert quote.items.get().needs_design
    assert not readiness(quote)['art_ready']
    logo_asset.private_content = b'changed'
    logo_asset.save()
    logo_asset.delete()
    file.refresh_from_db()
    assert bytes(file.content) == b'%PDF-1.4\nlogo'
    quote.status = 'quoted'
    quote.save()
    technical = studio_client.get(f'/api/production/{quote.reference}/').data
    assert technical['references'][0]['library_origin'] == file.library_origin
    assert studio_client.get(f'/api/production/{quote.reference}/references/{file.pk}/').status_code == 200
    other = User.objects.create_user('other-library-owner')
    other_client = APIClient()
    other_client.force_authenticate(other)
    assert other_client.get(f'/api/quotes/{quote.reference}/attachment/?id={file.pk}').status_code == 404


@pytest.mark.django_db
def test_foreign_missing_repeated_and_excess_library_ids_rejected(authenticated_client, logo_asset, staff_user):
    foreign = BrandAsset.objects.create(user=staff_user, name='Confidencial', file='private/other', private_content=b'data')
    for ids in ([foreign.pk], [999999], [logo_asset.pk, logo_asset.pk], list(range(1, 7))):
        response = request(authenticated_client, ids)
        assert response.status_code == 400, response.data
        assert not QuoteRequest.objects.exists()


@pytest.mark.django_db
def test_missing_legacy_file_does_not_leave_partial_request(authenticated_client, logo_asset):
    logo_asset.private_content = None
    logo_asset.file = 'private/definitely-missing-library-file.pdf'
    logo_asset.save()
    response = request(authenticated_client, [logo_asset.pk])
    assert response.status_code == 400
    assert not QuoteRequest.objects.exists()


@pytest.mark.django_db
def test_archive_requires_current_approval_and_records_provenance(order, studio_client, authenticated_client, client_user):
    quote = order.quote
    quote.items.update(needs_design=True)
    upload(studio_client, quote)
    version = quote.proof_versions.first()
    publish(studio_client, quote, version)
    version.refresh_from_db()
    url = f'/api/artwork-files/{version.pk}/save-to-library/'
    assert APIClient().post(url).status_code == 401
    assert authenticated_client.post(url, {'confirmed': True}, format='json').status_code == 400
    other = User.objects.create_user('another-customer')
    other_api = APIClient()
    other_api.force_authenticate(other)
    assert other_api.post(url, {'confirmed': True}, format='json').status_code == 404
    version.client_decision, version.decision_source, version.reviewer_name = 'approved', 'shared_link', 'Contacto declarado'
    version.save()
    ArtworkApproval.objects.update_or_create(quote=quote, defaults={'status': 'approved', 'approved_at': timezone.now()})
    assert authenticated_client.post(url, {}, format='json').status_code == 400
    response = authenticated_client.post(url, {'confirmed': True}, format='json')
    assert response.status_code == 201, response.data
    asset = BrandAsset.objects.get(pk=response.data['id'])
    assert asset.user == client_user and asset.source_proof == version
    assert asset.approval_record['source'] == 'shared_link'
    assert asset.approval_record['reviewer_name'] == 'Contacto declarado'
    assert asset.approval_record['quote_reference'] == quote.reference
    assert asset.approval_record['approved_at']
    assert bytes(asset.private_content) == bytes(version.private_content)
    assert studio_client.post(url, {'confirmed': True}, format='json').status_code == 200
    assert BrandAsset.objects.filter(source_proof=version).count() == 1
    quote.user = None
    quote.save()
    assert studio_client.post(url, {'confirmed': True}, format='json').status_code == 400
    quote.user = client_user
    quote.save()
    upload(studio_client, quote)
    assert authenticated_client.post(url, {'confirmed': True}, format='json').status_code == 400


@pytest.mark.django_db
def test_manual_artwork_upload_cannot_forge_verified_approval(authenticated_client):
    response = authenticated_client.post('/api/brand-assets/', {'name': 'Arte do cliente', 'kind': 'artwork',
        'file': SimpleUploadedFile('arte.pdf', b'%PDF-1.4\n%%EOF'),
        'approval_record': json.dumps({'quote_reference': 'forged'})}, format='multipart')
    assert response.status_code == 201
    assert response.data['approval_record'] == {}


@pytest.mark.django_db
def test_library_selection_limits_actual_bytes_not_metadata(authenticated_client, logo_asset):
    logo_asset.private_content = b'x' * (10 * 1024 * 1024 + 1)
    logo_asset.file_size = 1
    logo_asset.save()
    response = request(authenticated_client, [logo_asset.pk])
    assert response.status_code == 400 and not QuoteRequest.objects.exists()


@pytest.mark.django_db
def test_staff_without_studio_permissions_cannot_archive(order):
    user = User.objects.create_user('content-no-art', is_staff=True)
    user.profile.staff_role = StaffRole.CONTENT
    user.profile.save()
    client = APIClient()
    client.force_authenticate(user)
    response = client.post('/api/artwork-files/999/save-to-library/', {'confirmed': True}, format='json')
    assert response.status_code == 403
