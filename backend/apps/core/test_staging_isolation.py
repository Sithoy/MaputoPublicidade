from unittest.mock import patch

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings
from rest_framework.exceptions import ValidationError

from config.environment_safety import validate_staging_environment

from .email_connection import EmailTestView
from .integration_safety import require_live_integrations
from .whatsapp import graph
from .zoho_oauth import ZohoOAuthStart, provider


@override_settings(MP_ENVIRONMENT='staging')
@pytest.mark.parametrize('operation', [
    lambda: provider('POST', 'https://accounts.zoho.com/oauth/v2/token'),
    lambda: graph(None, 'POST', 'messages'),
    lambda: EmailTestView().post(None),
    lambda: ZohoOAuthStart().post(None),
])
def test_staging_blocks_live_integrations_before_credentials_or_network(operation):
    with patch('requests.request') as request, patch('smtplib.SMTP') as smtp:
        with pytest.raises(ValidationError, match='ambiente de testes'):
            operation()
        request.assert_not_called()
        smtp.assert_not_called()


@override_settings(MP_ENVIRONMENT='production')
def test_production_integration_guard_is_unchanged():
    require_live_integrations()


def test_staging_requires_its_own_database_and_bucket():
    env = {
        'MP_ENVIRONMENT': 'staging',
        'DATABASE_URL': 'postgresql://mp_staging_runtime@ep-test-pooler.neon.tech/mp_staging?sslmode=require',
        'STAGING_DATABASE_HOST': 'ep-test.neon.tech',
        'GS_BUCKET_NAME': 'maputo-publicidade-gcp-staging-media-654913531299',
    }
    validate_staging_environment(env)
    for field, value in [
        ('DATABASE_URL', 'postgresql://mp_runtime@ep-production.neon.tech/neondb?sslmode=require'),
        ('STAGING_DATABASE_HOST', ''),
        ('GS_BUCKET_NAME', 'maputo-publicidade-gcp-media-654913531299'),
    ]:
        with pytest.raises(ImproperlyConfigured):
            validate_staging_environment({**env, field: value})


def test_staging_validation_does_not_change_production():
    validate_staging_environment({'MP_ENVIRONMENT': 'production'})
