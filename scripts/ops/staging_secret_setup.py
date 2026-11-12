"""Accept a NEW staging connection on stdin and store it without displaying it.

No .env files, credential files, production secrets, or production resources are read.
Only mp-staging-* Secret Manager resources are created/written.
"""
import json
import getpass
from pathlib import Path
import secrets
import subprocess
import sys
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit

PROJECT = 'maputo-publicidade-gcp'
ACCOUNT = 'sitoeosvaldo@gmail.com'
SDK = Path('C:/Users/Osvaldo Sitoe/AppData/Local/Google/Cloud SDK/google-cloud-sdk')


def cloud(*args, data=None, required=True):
    result = subprocess.run([
        str(SDK / 'platform/bundledpython/python.exe'), str(SDK / 'lib/gcloud.py'),
        *args, '--project=' + PROJECT, '--account=' + ACCOUNT, '--quiet',
    ], input=data, capture_output=True, timeout=90, check=False)
    if required and result.returncode:
        raise RuntimeError(' '.join(args[:3]))
    return result


def main():
    payload = (json.loads(getpass.getpass('READY_HIDDEN_STAGING_CONNECTION:'))
               if '--secure-input' in sys.argv else json.load(sys.stdin))
    url = urlsplit(payload['connection_uri'])
    if (payload['project_id'] != 'raspy-mountain-07187239' or url.path != '/mp_staging'
            or url.username != 'mp_staging_owner' or not url.password
            or not (url.hostname or '').endswith('.neon.tech')
            or (url.hostname or '').startswith('ep-fragrant-glitter')):
        raise ValueError('Only the newly created staging database is permitted')
    query = parse_qs(url.query)
    query['sslmode'] = ['require']
    uri = urlunsplit(url._replace(query=urlencode(query, doseq=True)))
    values = {
        'mp-staging-owner-db': uri,
        'mp-staging-signing': secrets.token_urlsafe(48),
        'mp-staging-integration-root': secrets.token_urlsafe(48),
        'mp-staging-initial-admin': secrets.token_urlsafe(32),
    }
    names = [*values, 'mp-staging-runtime-db']
    # Refuse to replace existing credentials on a repeated setup run.
    empty_existing = set()
    for name in names:
        existing = cloud('secrets', 'describe', name, required=False)
        if existing.returncode == 0:
            versions = cloud('secrets', 'versions', 'list', name, '--format=value(name)')
            if versions.stdout.strip():
                raise ValueError('Staging secret already has versions; review before retrying')
            empty_existing.add(name)
    for name in names:
        if name not in empty_existing:
            cloud('secrets', 'create', name, '--replication-policy=automatic',
                  '--labels=environment=staging,application=maputo-publicidade')
        if name in values:
            cloud('secrets', 'versions', 'add', name, '--data-file=-', data=values[name].encode())
    # Do not log any value derived from credential-bearing input, even a hostname
    # or a mapping key. Resource names are documented separately.
    print('STAGING_SECRETS_CREATED')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'failed': True, 'error_type': type(exc).__name__}))
        raise SystemExit(1) from None
