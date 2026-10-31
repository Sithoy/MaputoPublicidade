from unittest.mock import patch

import pytest
from django.core import signing
from django.core.cache import cache
from rest_framework.test import APIClient

from .client_proposal import SALT, fingerprint, review_link
from .proposal_workflow import prepare, transition


@pytest.fixture(autouse=True)
def isolated_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def published_quote(quote, staff_user):
    quote.final_price = 100
    quote.validity_days = 15
    quote.save()
    prepare(quote, staff_user)
    transition(quote, staff_user, 'send', 0, '')
    return quote


def view(token):
    client = APIClient()
    client.credentials(HTTP_X_MP_PROPOSAL_TOKEN=token)
    return client.post('/api/proposal-review/', {'action': 'view'}, format='json')


@pytest.mark.django_db
def test_compact_link_is_private_short_and_version_bound(published_quote):
    link = review_link(published_quote)
    assert len(link) < 115
    assert '?' not in link and '/proposta#token=p1.' in link
    token = link.split('#token=')[1]
    assert view(token).status_code == 200
    assert published_quote.client_email not in token
    assert view(token[:-1] + ('A' if token[-1] != 'A' else 'B')).status_code == 403
    published_quote.terms = 'Novas condições'
    published_quote.save()
    assert view(token).status_code == 403


@pytest.mark.django_db
def test_old_signed_links_continue_working(published_quote):
    legacy = signing.dumps({'q': published_quote.pk, 'v': published_quote.proposal_version,
        'f': fingerprint(published_quote), 'ttl': 15 * 86400}, salt=SALT)
    assert view(legacy).status_code == 200


@pytest.mark.django_db
def test_compact_link_expiry_cannot_be_extended_by_tampering(published_quote):
    with patch('apps.quotes.client_proposal.time.time', return_value=1800000000):
        token = review_link(published_quote).split('#token=')[1]
    with patch('apps.quotes.client_proposal.time.time', return_value=1800000000 + 15 * 86400 + 1):
        expired = view(token)
        assert expired.status_code == 410
        assert expired.data['code'] == 'link_expired'
        assert set(expired.data) == {'code', 'detail'}  # renewal prompt, never document access
    with patch('apps.quotes.client_proposal.time.time', return_value=1800000000 - 100):
        assert view(token).status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize('token', ['p1.', 'p1.' + 'z' * 200, 'p1.1.1.1:no', 'p1.0.0.0:' + 'x' * 43])
def test_malformed_compact_links_are_rejected_without_errors(token):
    assert view(token).status_code == 403
