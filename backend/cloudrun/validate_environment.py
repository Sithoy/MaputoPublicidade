"""Fail closed before serving; report configuration names, never values."""

import os
from collections.abc import Mapping
from urllib.parse import urlsplit


def configuration_errors(env: Mapping[str, str]) -> list[str]:
    errors = []
    if env.get('DEBUG', '').lower() not in {'false', '0', 'no'}:
        errors.append('DEBUG must explicitly be disabled')
    if len(env.get('SECRET_KEY', '')) < 32:
        errors.append('SECRET_KEY must preserve the existing production key (minimum 32 characters)')
    try:
        database = urlsplit(env.get('DATABASE_URL', ''))
        valid_database = database.scheme in {'postgres', 'postgresql'} and bool(database.hostname and database.path.strip('/'))
    except ValueError:
        valid_database = False
    if not valid_database:
        errors.append('DATABASE_URL must explicitly identify the production PostgreSQL database')
    if env.get('DATABASE_SSL_REQUIRE', 'true').lower() not in {'true', '1', 'yes'}:
        errors.append('DATABASE_SSL_REQUIRE must remain enabled')
    hosts = [host.strip() for host in env.get('ALLOWED_HOSTS', '').split(',') if host.strip()]
    if not hosts or '*' in hosts:
        errors.append('ALLOWED_HOSTS must list the intended service hosts, not a global wildcard')
    google_bucket = bool(env.get('GS_BUCKET_NAME', '').strip())
    aws_bucket = bool(env.get('AWS_STORAGE_BUCKET_NAME', '').strip())
    if not google_bucket and not aws_bucket:
        errors.append('GS_BUCKET_NAME or AWS_STORAGE_BUCKET_NAME must configure durable media storage')
    if google_bucket and aws_bucket:
        errors.append('Configure only one media storage provider')
    if google_bucket and not env.get('GS_SA_EMAIL', '').strip():
        errors.append('GS_SA_EMAIL must identify the keyless media signing service account')
    return errors


if __name__ == '__main__':
    failures = configuration_errors(os.environ)
    if failures:
        raise SystemExit('Cloud Run configuration rejected: ' + '; '.join(failures))
