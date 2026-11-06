"""Separate integration encryption from authentication signing during rotation."""

import base64
import hashlib

from cryptography.fernet import Fernet, MultiFernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

PREFIXES = {'email': 'mp-email-credentials-v1:', 'whatsapp': 'mp-whatsapp-credentials-v1:'}


def primary_cipher(domain):
    root = getattr(settings, 'INTEGRATION_ENCRYPTION_KEY', '') or settings.SECRET_KEY
    if getattr(settings, 'INTEGRATION_ENCRYPTION_KEY', '') and len(root) < 32:
        raise ImproperlyConfigured('INTEGRATION_ENCRYPTION_KEY must contain at least 32 characters')
    return _cipher(domain, root)


def _cipher(domain, root):
    key = hashlib.sha256((PREFIXES[domain] + root).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def integration_cipher(domain):
    keys = [primary_cipher(domain)]
    fallback = getattr(settings, 'INTEGRATION_ENCRYPTION_KEY_FALLBACK', '')
    if fallback:
        if not getattr(settings, 'INTEGRATION_ENCRYPTION_KEY', ''):
            raise ImproperlyConfigured('An integration encryption fallback requires a dedicated current key')
        keys.append(_cipher(domain, fallback))
    # Fallback is ONLY for decrypting integration records, never auth/link signing.
    # MultiFernet encrypts using the first key and can read either during rollout.
    return MultiFernet(keys)
