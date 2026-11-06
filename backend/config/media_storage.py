"""Storage selection without credentials, network calls or public bucket ACLs."""

from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured


def media_storage_config(env):
    google_bucket = env.get('GS_BUCKET_NAME', '').strip()
    if google_bucket and env.get('AWS_STORAGE_BUCKET_NAME', '').strip():
        raise ImproperlyConfigured('Configure only one media storage provider')
    if google_bucket:
        return {
            'BACKEND': 'storages.backends.gcloud.GoogleCloudStorage',
            'OPTIONS': {
                'bucket_name': google_bucket,
                'project_id': env.get('GS_PROJECT_ID') or env.get('GOOGLE_CLOUD_PROJECT'),
                'default_acl': None,
                'querystring_auth': True,
                'iam_sign_blob': True,
                'sa_email': env.get('GS_SA_EMAIL') or None,
                'file_overwrite': False,
                'expiration': timedelta(minutes=15),
                'max_memory_size': 5 * 1024 * 1024,
                'object_parameters': {'cache_control': 'private, max-age=0, no-store'},
            },
        }
    if env.get('AWS_STORAGE_BUCKET_NAME'):
        return {'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage'}
    return {'BACKEND': 'django.core.files.storage.FileSystemStorage'}
