"""Explicit owner-only initialization of the fresh staging database.

Never used by web startup. No production credentials or records are copied.
"""
import base64
import json
import os
import secrets
import sys
from urllib.parse import quote, urlsplit, urlunsplit

import google.auth
import psycopg2 as psycopg
from google.auth.transport.requests import AuthorizedSession
from psycopg2 import sql


def main():
    if os.environ.get('MP_ENVIRONMENT') != 'staging':
        raise ValueError('Staging only')
    database = urlsplit(os.environ['DATABASE_URL'])
    if database.path != '/mp_staging' or database.username != 'mp_staging_owner':
        raise ValueError('Dedicated staging owner connection required')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    import django
    django.setup()
    from django.contrib.auth import get_user_model
    from django.core.management import call_command

    from apps.catalog.models import Product, ServiceCategory
    from apps.core.models import EmailConnection, WhatsAppConnection
    from apps.orders.models import Order
    from apps.quotes.models import QuoteRequest

    call_command('migrate', interactive=False, verbosity=0)
    if Order.objects.exists() or QuoteRequest.objects.exists():
        raise ValueError('Initialization refuses a database containing work orders')
    user_model = get_user_model()
    admin, _ = user_model.objects.get_or_create(username='staging.admin@maputopublicidade.com', defaults={
        'email': 'staging.admin@maputopublicidade.com', 'first_name': 'Staging',
        'last_name': 'Administrator', 'is_staff': True, 'is_superuser': True,
    })
    admin.set_password(os.environ['STAGING_ADMIN_PASSWORD'])
    admin.save()
    category, _ = ServiceCategory.objects.get_or_create(name='Demonstração', slug='demonstracao')
    Product.objects.get_or_create(slug='polo-demonstracao', defaults={
        'name': 'Polo de demonstração', 'category': category, 'base_price': '100.00',
        'pricing_complexity': Product.PRICING_SIMPLE, 'is_active': True,
    })
    if EmailConnection.objects.exclude(credentials='', oauth_secret='', oauth_refresh='').exists():
        raise ValueError('Staging must not contain live email credentials')
    if WhatsAppConnection.objects.exclude(credentials='').exists():
        raise ValueError('Staging must not contain live WhatsApp credentials')

    password = secrets.token_urlsafe(48)
    with psycopg.connect(os.environ['DATABASE_URL']) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = 'mp_staging_runtime'")
            if cursor.fetchone():
                raise ValueError('Runtime role exists; review before rerunning bootstrap')
            cursor.execute(sql.SQL('CREATE ROLE mp_staging_runtime LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT').format(sql.Literal(password)))
            cursor.execute('REVOKE ALL ON SCHEMA public FROM PUBLIC')
            cursor.execute('GRANT CONNECT ON DATABASE mp_staging TO mp_staging_runtime')
            cursor.execute('GRANT USAGE ON SCHEMA public TO mp_staging_runtime')
            cursor.execute('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mp_staging_runtime')
            cursor.execute('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mp_staging_runtime')
            cursor.execute('ALTER DEFAULT PRIVILEGES FOR ROLE mp_staging_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mp_staging_runtime')
            cursor.execute('ALTER DEFAULT PRIVILEGES FOR ROLE mp_staging_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO mp_staging_runtime')
    host = database.hostname.replace('-pooler.', '.')
    runtime_host = host.replace('.', '-pooler.', 1)
    netloc = 'mp_staging_runtime:' + quote(password, safe='') + '@' + runtime_host
    uri = urlunsplit(database._replace(netloc=netloc))
    with psycopg.connect(uri) as connection:
        with connection.cursor() as cursor:
            cursor.execute('SELECT current_database(), current_user')
            if cursor.fetchone() != ('mp_staging', 'mp_staging_runtime'):
                raise ValueError('Runtime identity mismatch')
            cursor.execute("SELECT rolcreaterole OR rolcreatedb OR rolsuper FROM pg_roles WHERE rolname=current_user")
            if cursor.fetchone()[0]:
                raise ValueError('Runtime role must not be privileged')

    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
    session = AuthorizedSession(credentials)
    response = session.post(
        'https://secretmanager.googleapis.com/v1/projects/maputo-publicidade-gcp/secrets/mp-staging-runtime-db:addVersion',
        json={'payload': {'data': base64.b64encode(uri.encode()).decode()}}, timeout=30,
    )
    if not response.ok:
        raise RuntimeError('Unable to store staging runtime secret')
    print(json.dumps({'staging_bootstrap': 'passed', 'database': 'mp_staging',
                      'customers_copied': 0, 'orders': 0, 'quotes': 0,
                      'runtime_secret_version': response.json()['name'].rsplit('/', 1)[-1]}))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'staging_bootstrap': 'failed', 'error_type': type(exc).__name__}))
        sys.exit(1)
