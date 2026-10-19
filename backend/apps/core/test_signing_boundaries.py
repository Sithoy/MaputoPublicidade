"""Public signing namespaces are not authentication secrets."""

import secrets
from types import SimpleNamespace

import pytest
from django.core import signing
from django.test import override_settings

from apps.core import production_views, tracking_views


@pytest.mark.parametrize("kind", ["art", "tracking"])
def test_customer_tokens_require_the_server_secret_not_just_the_public_namespace(kind):
    subject = SimpleNamespace(pk=17, share_nonce=secrets.token_hex(16), client_email="client@example.test")
    module = production_views if kind == "art" else tracking_views
    create_token = module.share_token if kind == "art" else module.tracking_token
    with override_settings(SECRET_KEY=secrets.token_urlsafe(48), SECRET_KEY_FALLBACKS=[]):
        token = create_token(subject)
        assert signing.loads(token, salt=module.SALT, max_age=7 * 86400)
        with pytest.raises(signing.BadSignature):
            signing.loads(token + "tampered", salt=module.SALT, max_age=7 * 86400)
        other = tracking_views.SALT if kind == "art" else production_views.SALT
        with pytest.raises(signing.BadSignature):
            signing.loads(token, salt=other, max_age=7 * 86400)
    with override_settings(SECRET_KEY=secrets.token_urlsafe(48), SECRET_KEY_FALLBACKS=[]):
        with pytest.raises(signing.BadSignature):
            signing.loads(token, salt=module.SALT, max_age=7 * 86400)
