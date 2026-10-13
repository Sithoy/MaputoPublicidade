import hashlib
from datetime import timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.roles import StaffRole
from apps.core.models import EmailConnection
from apps.core.zoho_oauth import CALLBACK, decrypt

BASE = '/api/integrations/email/oauth/'
VALUES = {'client_id': '1000.example', 'client_secret': 'private-client-secret'}


@pytest.fixture(autouse=True)
def clear_oauth_cache():
    cache.clear()
    yield
    cache.clear()


def state_for(client):
    response = client.post(BASE + 'start/', {}, format='json')
    assert response.status_code == 200
    return parse_qs(urlparse(response.data['url']).query)['state'][0]


def responses(mailbox='atendimento@maputopublicidade.com'):
    return [
        {'access_token': 'private-access', 'refresh_token': 'private-refresh'},
        {'status': {'code': 200}, 'data': [{'primaryEmailAddress': mailbox, 'accountId': '12345'}]},
    ]


def test_email_credentials_and_callback_excluded_from_telemetry():
    from apps.core.email_telemetry import filter_email_event
    assert filter_email_event({'request': {'url': 'https://mp.test/api/integrations/email/oauth/callback/?code=private'}}, {}) is None
    assert filter_email_event({'transaction': '/api/integrations/email/oauth/'}, {}) is None
    event = {'request': {'url': 'https://mp.test/api/catalog/'}}
    assert filter_email_event(event, {}) == event


@pytest.mark.django_db
class TestZohoOAuth:
    def test_secrets_encrypted_write_only_and_blank_preserves(self, staff_client):
        response = staff_client.patch(BASE, VALUES, format='json')
        assert response.status_code == 200
        assert response.data['secret_configured']
        assert 'private' not in str(response.data)
        assert 'no-store' in response['Cache-Control']
        config = EmailConnection.objects.get(pk=1)
        assert decrypt(config.oauth_secret) == VALUES['client_secret']
        assert VALUES['client_secret'] not in config.oauth_secret
        staff_client.patch(BASE, {**VALUES, 'client_secret': ''}, format='json')
        assert decrypt(EmailConnection.objects.get(pk=1).oauth_secret) == VALUES['client_secret']

    def test_only_integrations_admins_can_configure_and_start(self, authenticated_client, staff_client):
        assert APIClient().get(BASE).status_code == 401
        assert APIClient().patch(BASE + 'callback/', VALUES, format='json').status_code == 405
        assert APIClient().post(BASE + 'callback/', VALUES, format='json').status_code == 405
        assert authenticated_client.patch(BASE, VALUES, format='json').status_code == 403
        assert authenticated_client.post(BASE + 'start/').status_code == 403
        assert staff_client.patch(BASE, {**VALUES, 'host': 'localhost'}, format='json').status_code == 400

    def test_state_is_bound_single_use_and_token_encrypted(self, staff_client):
        staff_client.patch(BASE, VALUES, format='json')
        state = state_for(staff_client)
        assert EmailConnection.objects.get(pk=1).oauth_state_hash == hashlib.sha256(state.encode()).hexdigest()
        with patch('apps.core.zoho_oauth.provider', side_effect=responses()) as api:
            response = APIClient().get(BASE + 'callback/', {'state': state, 'code': 'private-code', 'location': 'us'})
            assert '?zoho=connected#email' in response['Location']
            assert response['Referrer-Policy'] == 'no-referrer'
            assert api.call_args_list[0].kwargs['data']['redirect_uri'] == CALLBACK
        config = EmailConnection.objects.get(pk=1)
        assert decrypt(config.oauth_refresh) == 'private-refresh'
        assert not config.oauth_state_hash
        with patch('apps.core.zoho_oauth.provider') as api:
            assert 'failed' in APIClient().get(BASE + 'callback/', {'state': state, 'code': 'private-code'})['Location']
            api.assert_not_called()
        assert 'private' not in str(staff_client.get(BASE).data)

    def test_wrong_state_expired_and_revoked_actor_are_rejected(self, staff_client, staff_user):
        staff_client.patch(BASE, VALUES, format='json')
        state = state_for(staff_client)
        with patch('apps.core.zoho_oauth.provider') as api:
            assert 'failed' in APIClient().get(BASE + 'callback/', {'state': 'wrong', 'code': 'private'})['Location']
            assert EmailConnection.objects.get(pk=1).oauth_state_hash
            EmailConnection.objects.filter(pk=1).update(oauth_state_expires=timezone.now() - timedelta(seconds=1))
            assert 'failed' in APIClient().get(BASE + 'callback/', {'state': state, 'code': 'private'})['Location']
            api.assert_not_called()
        state = state_for(staff_client)
        staff_user.profile.staff_role = StaffRole.RECEPTIONIST
        staff_user.profile.save(update_fields=['staff_role'])
        with patch('apps.core.zoho_oauth.provider') as api:
            assert 'failed' in APIClient().get(BASE + 'callback/', {'state': state, 'code': 'private'})['Location']
            api.assert_not_called()

    def test_other_mailbox_is_not_connected(self, staff_client):
        staff_client.patch(BASE, VALUES, format='json')
        state = state_for(staff_client)
        with patch('apps.core.zoho_oauth.provider', side_effect=responses('admin@example.test')):
            response = APIClient().get(BASE + 'callback/', {'state': state, 'code': 'private-code'})
        assert 'failed' in response['Location']
        assert not EmailConnection.objects.get(pk=1).oauth_refresh

    def test_api_refresh_works_without_smtp(self, staff_client):
        staff_client.patch(BASE, VALUES, format='json')
        state = state_for(staff_client)
        with patch('apps.core.zoho_oauth.provider', side_effect=responses()):
            APIClient().get(BASE + 'callback/', {'state': state, 'code': 'private-code'})
        with patch('apps.core.zoho_oauth.provider', side_effect=responses()), patch('smtplib.SMTP') as smtp:
            result = staff_client.post(BASE + 'test/', {}, format='json')
        assert result.status_code == 200
        assert result.data['connected']
        assert not result.data['sending_active'] and not result.data['receiving_active']
        smtp.assert_not_called()

    def test_provider_failure_never_leaks_secrets(self, staff_client):
        from apps.core.email_connection import cipher
        staff_client.patch(BASE, VALUES, format='json')
        EmailConnection.objects.filter(pk=1).update(oauth_refresh=cipher().encrypt(b'private-refresh').decode())
        with patch('apps.core.zoho_oauth.requests.request', side_effect=RuntimeError('private-secret')):
            result = staff_client.post(BASE + 'test/', {}, format='json')
        assert result.status_code == 400
        assert 'private' not in str(result.data)
