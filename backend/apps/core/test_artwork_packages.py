import pytest
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.quotes.models import ArtworkProofVersion

from . import test_production
from .models import EmailDraft
from .test_production import publish


@pytest.fixture
def production_api(db):
    return test_production.production_api.__wrapped__(db)


def send(api, quote, contents):
    return api.post(f'/api/production/{quote.reference}/artwork/', {
        'files': [SimpleUploadedFile(f'arte-{index}.pdf', content) for index, content in enumerate(contents)],
    }, format='multipart')


@pytest.mark.django_db
def test_package_is_private_and_approved_as_one_version(production_api, quoted_quote, authenticated_client):
    cache.clear()
    response = send(production_api, quoted_quote, [b'%PDF-first', b'%PDF-second'])
    assert response.status_code == 201, response.data
    version = ArtworkProofVersion.objects.get(quote=quoted_quote)
    assert version.attachments.count() == 1
    files = response.data['versions'][0]['files']
    assert len(files) == 2
    assert authenticated_client.get(f'/api/artwork-files/{version.pk}/?attachment={version.attachments.get().pk}').status_code == 404
    result = publish(production_api, quoted_quote, version)
    token = result.data['review_path'].rsplit('/', 1)[-1]
    api = APIClient()
    url = f'/api/art-review/{token}/'
    review = api.get(url).data
    assert len(review['files']) == 2
    assert b''.join(api.get(review['files'][1]['url']).streaming_content) == b'%PDF-second'
    detail = authenticated_client.get(f'/api/quotes/{quoted_quote.reference}/').data
    assert len(detail['proof_versions'][0]['files']) == 2
    assert authenticated_client.get(detail['proof_versions'][0]['files'][1]['url']).status_code == 200
    assert api.post(url, {'decision': 'approved', 'name': 'Cliente'}, format='json').status_code == 200
    version.refresh_from_db()
    assert version.client_decision == 'approved'
    production_api.post(f'/api/production/{quoted_quote.reference}/revoke/{version.pk}/')
    assert api.get(review['files'][1]['url']).status_code == 404


@pytest.mark.django_db
def test_five_files_at_five_mb_are_allowed(production_api, quoted_quote):
    content = b'%PDF-' + b'x' * (5 * 1024 * 1024 - 5)
    response = send(production_api, quoted_quote, [content] * 5)
    assert response.status_code == 201, response.data
    assert ArtworkProofVersion.objects.get().attachments.count() == 4


@pytest.mark.django_db
@pytest.mark.parametrize('contents', [[], [b'%PDF-ok'] * 6, [b''], [b'%PDF-ok', b'invalid'], [b'%PDF-' + b'x' * (5 * 1024 * 1024)]])
def test_invalid_package_creates_no_partial_version(production_api, quoted_quote, contents):
    assert send(production_api, quoted_quote, contents).status_code == 400
    assert not ArtworkProofVersion.objects.exists()


@pytest.mark.django_db
def test_attachment_cannot_be_read_through_another_version(production_api, quoted_quote):
    send(production_api, quoted_quote, [b'%PDF-one', b'%PDF-two'])
    first = quoted_quote.proof_versions.first()
    send(production_api, quoted_quote, [b'%PDF-new'])
    latest = quoted_quote.proof_versions.first()
    path = f'/api/production/{quoted_quote.reference}/files/{latest.pk}/?attachment={first.attachments.get().pk}'
    assert production_api.get(path).status_code == 404


@pytest.mark.django_db
@pytest.mark.parametrize('size,expected', [(10, 2), (5 * 1024 * 1024, 0)])
def test_email_contains_all_files_or_link_without_partial_attachments(production_api, quoted_quote, size, expected):
    send(production_api, quoted_quote, [b'%PDF-' + b'x' * (size - 5)] * 2)
    version = quoted_quote.proof_versions.first()
    publish(production_api, quoted_quote, version)
    response = production_api.post(f'/api/production/{quoted_quote.reference}/email/{version.pk}/')
    assert response.status_code == 200, response.data
    draft = EmailDraft.objects.get(conversation_id=response.data['conversation_id'])
    assert len(draft.attachment_ids) == expected
    assert '/arte/rever/' in draft.body and '2 ficheiro(s)' in draft.body
