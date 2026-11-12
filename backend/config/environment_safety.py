"""Fail closed if staging is accidentally wired to live data or file storage."""
from urllib.parse import parse_qs, urlsplit

from django.core.exceptions import ImproperlyConfigured


def validate_staging_environment(env):
    if env.get('MP_ENVIRONMENT') != 'staging':
        return
    database = urlsplit(env.get('DATABASE_URL', ''))
    expected_host = env.get('STAGING_DATABASE_HOST', '')
    if (not expected_host or database.scheme not in {'postgres', 'postgresql'}
            or (database.hostname or '').replace('-pooler.', '.') != expected_host
            or database.path != '/mp_staging'
            or database.username not in {'mp_staging_owner', 'mp_staging_runtime'}
            or parse_qs(database.query).get('sslmode', [''])[0] not in {'require', 'verify-full'}):
        raise ImproperlyConfigured('Staging requires its dedicated TLS database and staging role.')
    if env.get('GS_BUCKET_NAME') != 'maputo-publicidade-gcp-staging-media-654913531299':
        raise ImproperlyConfigured('Staging requires its dedicated media bucket.')
