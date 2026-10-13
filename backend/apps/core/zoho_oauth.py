"""Zoho US-datacenter OAuth connection, restricted to the Atendimento mailbox."""
import hashlib
import secrets
from datetime import timedelta
from urllib.parse import urlencode

import requests
from cryptography.fernet import InvalidToken
from django.db import transaction
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .email_connection import EmailSettingsView, cipher
from .models import EmailConnection

CALLBACK = 'https://maputo-publicidade-backend-4ppp.onrender.com/api/integrations/email/oauth/callback/'
RETURN = 'https://maputopublicidade.com/admin/definicoes'
SCOPES = 'ZohoMail.accounts.READ,ZohoMail.messages.READ,ZohoMail.messages.CREATE'


def decrypt(value):
    try:
        return cipher().decrypt(value.encode()).decode() if value else ''
    except InvalidToken:
        raise ValidationError('Não foi possível ler a configuração OAuth. Guarde novamente o segredo.') from None


def provider(method, url, **kwargs):
    # URLs are constants, never taken from callback/query/provider responses.
    try:
        result = requests.request(method, url, timeout=10, allow_redirects=False, **kwargs)
        result.raise_for_status()
        value = result.json()
        if not isinstance(value, dict) or value.get('error') or value.get('status', {}).get('code', 200) != 200:
            raise ValueError
        return value
    except Exception:
        raise ValidationError('O Zoho não confirmou a ligação API. Verifique a autorização e tente novamente.') from None


def account(access_token):
    result = provider('GET', 'https://mail.zoho.com/api/accounts', headers={'Authorization': 'Zoho-oauthtoken ' + access_token})
    for entry in result.get('data', []):
        if entry.get('primaryEmailAddress', '').lower() == 'atendimento@maputopublicidade.com':
            account_id = str(entry.get('accountId', ''))
            if account_id.isdigit():
                return account_id
    raise ValidationError('Autorize com a conta atendimento@maputopublicidade.com, não com outra conta Zoho.')


def oauth_data(config):
    return {'client_id': config.oauth_client_id, 'secret_configured': bool(config.oauth_secret),
            'connected': bool(config.oauth_refresh and config.oauth_account_id), 'tested_at': config.tested_at,
            'sending_active': False, 'receiving_active': False, 'callback_url': CALLBACK}


class OAuthInput(serializers.Serializer):
    client_id = serializers.RegexField(r'^1000\.[A-Za-z0-9]+$', max_length=200)
    client_secret = serializers.CharField(required=False, allow_blank=True, max_length=255, write_only=True)

    def validate(self, values):
        if set(self.initial_data) - set(self.fields):
            raise ValidationError('Campos desconhecidos.')
        return values


class ZohoOAuthSettings(EmailSettingsView):
    def get(self, request):
        return Response(oauth_data(EmailConnection.objects.get_or_create(pk=1)[0]))

    @transaction.atomic
    def patch(self, request):
        values = OAuthInput(data=request.data)
        values.is_valid(raise_exception=True)
        EmailConnection.objects.get_or_create(pk=1)
        config = EmailConnection.objects.select_for_update().get(pk=1)
        secret = values.validated_data.get('client_secret', '')
        changed = config.oauth_client_id != values.validated_data['client_id'] or bool(secret)
        if config.oauth_client_id != values.validated_data['client_id'] and not secret:
            raise ValidationError('Introduza o segredo do novo cliente OAuth.')
        config.oauth_client_id = values.validated_data['client_id']
        if secret:
            config.oauth_secret = cipher().encrypt(secret.encode()).decode()
        if changed:
            config.oauth_refresh = config.oauth_account_id = config.oauth_state_hash = ''
            config.oauth_state_expires = config.tested_at = None
            config.oauth_actor = None
        config.save()
        return Response(oauth_data(config))


class ZohoOAuthStart(EmailSettingsView):
    @transaction.atomic
    def post(self, request):
        EmailConnection.objects.get_or_create(pk=1)
        config = EmailConnection.objects.select_for_update().get(pk=1)
        if not config.oauth_client_id or not config.oauth_secret:
            raise ValidationError('Guarde o Client ID e o Client Secret antes de autorizar.')
        state = secrets.token_urlsafe(32)
        config.oauth_state_hash = hashlib.sha256(state.encode()).hexdigest()
        config.oauth_state_expires = timezone.now() + timedelta(minutes=10)
        config.oauth_actor = request.user
        config.save()
        return Response({'url': 'https://accounts.zoho.com/oauth/v2/auth?' + urlencode({
            'client_id': config.oauth_client_id, 'response_type': 'code', 'redirect_uri': CALLBACK,
            'scope': SCOPES, 'access_type': 'offline', 'prompt': 'consent', 'state': state,
        })})


class ZohoOAuthCallback(EmailSettingsView):
    authentication_classes = []
    permission_classes = [AllowAny]
    http_method_names = ['get', 'head', 'options']

    def get_permissions(self):
        return [AllowAny()]

    def get(self, request):
        outcome = 'failed'
        try:
            with transaction.atomic():
                config = EmailConnection.objects.select_for_update().get(pk=1)
                state = request.query_params.get('state', '')
                if not state or not config.oauth_state_hash or not config.oauth_state_expires or config.oauth_state_expires <= timezone.now():
                    raise ValidationError('Autorização expirada.')
                if not secrets.compare_digest(hashlib.sha256(state.encode()).hexdigest(), config.oauth_state_hash):
                    raise ValidationError('Autorização inválida.')
                actor = config.oauth_actor
                # Recheck access if the initiating administrator lost permissions.
                from apps.accounts.roles import StaffCapability, has_staff_capability
                if not actor or not actor.is_active or not has_staff_capability(actor, StaffCapability.MANAGE_INTEGRATIONS):
                    raise ValidationError('Acesso revogado.')
                config.oauth_state_hash = ''
                config.oauth_state_expires = None
                config.save(update_fields=['oauth_state_hash', 'oauth_state_expires'])
                snapshot = (config.oauth_client_id, config.oauth_secret)
            code = request.query_params.get('code', '')
            if not code or request.query_params.get('location', 'us') != 'us':
                raise ValidationError('Autorize na conta Zoho US.')
            token = provider('POST', 'https://accounts.zoho.com/oauth/v2/token', data={
                'grant_type': 'authorization_code', 'code': code, 'client_id': config.oauth_client_id,
                'client_secret': decrypt(config.oauth_secret), 'redirect_uri': CALLBACK,
            })
            if not token.get('refresh_token') or not token.get('access_token'):
                raise ValidationError('Autorize acesso offline.')
            account_id = account(token['access_token'])
            with transaction.atomic():
                current = EmailConnection.objects.select_for_update().get(pk=1)
                if snapshot != (current.oauth_client_id, current.oauth_secret):
                    raise ValidationError('Configuração alterada.')
                current.oauth_refresh = cipher().encrypt(token['refresh_token'].encode()).decode()
                current.oauth_account_id = account_id
                current.tested_at = timezone.now()
                current.save(update_fields=['oauth_refresh', 'oauth_account_id', 'tested_at'])
            outcome = 'connected'
        except Exception:
            # Never return/log authorization codes, token responses or provider errors.
            pass
        response = HttpResponseRedirect(RETURN + '?zoho=' + outcome + '#email')
        response['Referrer-Policy'] = 'no-referrer'
        return response


class ZohoOAuthTest(EmailSettingsView):
    def post(self, request):
        config = EmailConnection.objects.get_or_create(pk=1)[0]
        if not config.oauth_refresh:
            raise ValidationError('Autorize a conta Zoho antes de testar a API.')
        snapshot = (config.oauth_client_id, config.oauth_secret, config.oauth_refresh)
        token = provider('POST', 'https://accounts.zoho.com/oauth/v2/token', data={
            'grant_type': 'refresh_token', 'client_id': config.oauth_client_id,
            'client_secret': decrypt(config.oauth_secret), 'refresh_token': decrypt(config.oauth_refresh),
        })
        if not token.get('access_token'):
            raise ValidationError('Renove a autorização Zoho.')
        account_id = account(token['access_token'])
        with transaction.atomic():
            current = EmailConnection.objects.select_for_update().get(pk=1)
            if snapshot != (current.oauth_client_id, current.oauth_secret, current.oauth_refresh):
                raise ValidationError('Configuração alterada. Teste novamente.')
            current.oauth_account_id = account_id
            current.tested_at = timezone.now()
            current.save(update_fields=['oauth_account_id', 'tested_at'])
        return Response({**oauth_data(current), 'detail': 'API Zoho autenticada. Não foram enviados nem importados emails.'})
