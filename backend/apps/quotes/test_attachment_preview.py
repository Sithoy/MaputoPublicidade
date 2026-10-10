from io import BytesIO

import pytest
from PIL import Image
from rest_framework.test import APIClient

from apps.quotes.models import QuoteRequestAttachment


@pytest.mark.django_db
@pytest.mark.parametrize('image_format,mime', [('PNG', 'image/png'), ('JPEG', 'image/jpeg'), ('WEBP', 'image/webp')])
def test_preview_validates_bytes_and_preserves_download(authenticated_client, quote, image_format, mime):
    data = BytesIO()
    Image.new('RGB', (10, 10), 'green').save(data, format=image_format)
    attachment = QuoteRequestAttachment.objects.create(quote=quote, name='reference.png', size=len(data.getvalue()), content=data.getvalue())
    url = f'/api/quotes/{quote.reference}/attachment/?id={attachment.id}'
    preview = authenticated_client.get(url + '&preview=1')
    assert preview.status_code == 200
    assert preview['Content-Type'] == mime
    assert preview['Content-Disposition'].startswith('inline;')
    assert preview['Cache-Control'] == 'private, no-store'
    assert preview['X-Content-Type-Options'] == 'nosniff'
    assert b''.join(preview.streaming_content) == data.getvalue()
    download = authenticated_client.get(url)
    assert download.status_code == 200
    assert download['Content-Disposition'].startswith('attachment;')
    download.close()


@pytest.mark.django_db
@pytest.mark.parametrize('content', [b'<svg onload="alert(1)"></svg>', b'%PDF-1.4\n%%EOF', b'not a png'])
def test_preview_rejects_non_images(authenticated_client, quote, content):
    attachment = QuoteRequestAttachment.objects.create(quote=quote, name='fake.png', size=len(content), content=content)
    assert authenticated_client.get(f'/api/quotes/{quote.reference}/attachment/?id={attachment.id}&preview=1').status_code == 400


@pytest.mark.django_db
def test_preview_remains_private(authenticated_client, client_user, quote):
    attachment = QuoteRequestAttachment.objects.create(quote=quote, name='internal.png', size=3, content=b'png', is_internal=True)
    url = f'/api/quotes/{quote.reference}/attachment/?id={attachment.id}&preview=1'
    assert authenticated_client.get(url).status_code == 404
    assert APIClient().get(url).status_code == 401
    attachment.is_internal = False
    attachment.save(update_fields=['is_internal'])
    quote.user = None
    quote.save(update_fields=['user'])
    assert authenticated_client.get(url).status_code in {403, 404}
