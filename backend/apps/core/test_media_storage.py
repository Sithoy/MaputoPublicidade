import json
from datetime import timedelta
from io import StringIO
from unittest.mock import patch

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.assets.models import BrandAsset
from apps.catalog.models import ServiceCategory
from config.media_storage import media_storage_config


def test_existing_storage_selection_is_preserved():
    assert media_storage_config({})['BACKEND'].endswith('FileSystemStorage')
    assert media_storage_config({'AWS_STORAGE_BUCKET_NAME': 'existing'})['BACKEND'].endswith('S3Boto3Storage')


def test_google_storage_is_private_non_overwriting_and_keyless():
    config = media_storage_config({'GS_BUCKET_NAME': 'private-media', 'GS_SA_EMAIL': 'runtime@example.com'})
    assert config['BACKEND'] == 'storages.backends.gcloud.GoogleCloudStorage'
    options = config['OPTIONS']
    assert options['bucket_name'] == 'private-media'
    assert options['default_acl'] is None
    assert options['querystring_auth'] is True
    assert options['iam_sign_blob'] is True
    assert options['sa_email'] == 'runtime@example.com'
    assert options['file_overwrite'] is False
    assert options['expiration'] == timedelta(minutes=15)
    assert options['object_parameters']['cache_control'] == 'private, max-age=0, no-store'
    assert 'credentials' not in options


def test_ambiguous_storage_configuration_is_rejected():
    with pytest.raises(ImproperlyConfigured):
        media_storage_config({'GS_BUCKET_NAME': 'one', 'AWS_STORAGE_BUCKET_NAME': 'two'})


def test_google_backend_accepts_options_without_network_or_key_file():
    from google.auth.credentials import AnonymousCredentials
    from storages.backends.gcloud import GoogleCloudStorage

    config = media_storage_config({'GS_BUCKET_NAME': 'private-media', 'GS_SA_EMAIL': 'runtime@example.com'})
    storage = GoogleCloudStorage(**config['OPTIONS'], credentials=AnonymousCredentials())
    assert storage.bucket_name == 'private-media'
    assert storage.iam_sign_blob is True
    assert storage.querystring_auth is True
    assert storage.default_acl is None


@pytest.mark.django_db
def test_audit_distinguishes_database_files_missing_files_and_errors(client_user):
    ServiceCategory.objects.create(name='Embedded', slug='embedded', image_data_url='data:image/png;base64,YQ==')
    present = ServiceCategory.objects.create(name='Present', slug='present', image='categories/present.png')
    ServiceCategory.objects.create(name='Missing', slug='missing', image='categories/missing.png')
    ServiceCategory.objects.create(name='Error', slug='error', image='categories/error.png')
    BrandAsset.objects.create(user=client_user, name='Private', file='private/not-on-disk', private_content=b'private bytes')
    output = StringIO()

    def exists(name):
        if name.endswith('error.png'):
            raise OSError('sensitive provider error')
        return name == present.image.name

    with patch.object(ServiceCategory._meta.get_field('image').storage, 'exists', side_effect=exists):
        with pytest.raises(CommandError, match='cutover must wait'):
            call_command('audit_media_storage', fail_on_missing=True, stdout=output)
    report = json.loads(output.getvalue())
    assert report['file_fields']['catalog.ServiceCategory.image'] == {
        'database_backed': 1, 'storage_present': 1, 'storage_missing': 1, 'storage_errors': 1, 'empty': 0,
    }
    assert report['file_fields']['assets.BrandAsset.file']['database_backed'] == 1
    assert report['database_attachment_fields']['assets.BrandAsset.private_content'] == 1
    for private in ['private bytes', 'sensitive provider error', 'categories/', 'private/not-on-disk']:
        assert private not in output.getvalue()
    assert ServiceCategory.objects.count() == 4
    assert bytes(BrandAsset.objects.get().private_content) == b'private bytes'


@pytest.mark.django_db
def test_audit_empty_database_passes():
    output = StringIO()
    call_command('audit_media_storage', fail_on_missing=True, stdout=output)
    assert all(not any(row.values()) for row in json.loads(output.getvalue())['file_fields'].values())
