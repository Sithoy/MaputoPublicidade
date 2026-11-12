"""Server-side staging guard; administrator UI settings cannot enable live traffic."""
from django.conf import settings
from rest_framework.exceptions import ValidationError


def require_live_integrations():
    if settings.MP_ENVIRONMENT == 'staging':
        raise ValidationError('Integrações externas desativadas no ambiente de testes.')
