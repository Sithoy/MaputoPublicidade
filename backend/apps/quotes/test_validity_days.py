from datetime import datetime, timedelta
from datetime import timezone as dt_timezone
from io import BytesIO
from unittest.mock import patch

import pytest
from django.core import signing
from django.utils import timezone
from pypdf import PdfReader
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.core.documents import build_quote_pdf

from .client_proposal import LEGACY_MAX_AGE, SALT, fingerprint, review_link
from .proposal_workflow import document_snapshot, prepare, transition
from .serializers import ManualQuoteCreateSerializer


@pytest.mark.django_db
@pytest.mark.parametrize('days', [7, 15, 30, 60])
def test_validity_starts_at_publication_not_draft_creation(quote, staff_user, days):
    quote.final_price = 100
    quote.validity_days = days
    quote.save()
    prepare(quote, staff_user)
    transition(quote, staff_user, 'save', 0, '')
    assert quote.valid_until is None
    draft_pdf = PdfReader(BytesIO(build_quote_pdf(quote)))
    assert f'{days} dias após envio' in '\n'.join(page.extract_text() for page in draft_pdf.pages)
    sent = datetime(2026, 10, 24, 23, 30, tzinfo=dt_timezone.utc)
    with patch('apps.quotes.proposal_workflow.timezone.now', return_value=sent):
        transition(quote, staff_user, 'send', 1, '')
    assert quote.valid_until == timezone.localdate(sent) + timedelta(days=days)
    assert quote.proposal_history[-1]['snapshot']['valid_until'] == str(quote.valid_until)
    assert quote.proposal_history[-1]['snapshot']['validity_days'] == str(days)
    previous_expiry = quote.valid_until
    with pytest.raises(ValidationError):
        transition(quote, staff_user, 'send', 1, '')
    quote.refresh_from_db()
    assert quote.valid_until == previous_expiry
    prepare(quote, staff_user)
    assert quote.valid_until is None
    assert quote.validity_days == days
    later = sent + timedelta(days=10)
    with patch('apps.quotes.proposal_workflow.timezone.now', return_value=later):
        transition(quote, staff_user, 'send', 1, '')
    assert quote.valid_until == previous_expiry + timedelta(days=10)
    assert quote.proposal_version == 2


@pytest.mark.django_db
def test_existing_dates_and_fingerprints_are_preserved(quote, staff_user):
    quote.final_price = 100
    quote.valid_until = timezone.localdate() + timedelta(days=20)
    quote.save()
    assert 'validity_days' not in document_snapshot(quote)
    prepare(quote, staff_user)
    expiry = quote.valid_until
    transition(quote, staff_user, 'send', 0, '')
    assert quote.valid_until == expiry


@pytest.mark.django_db
def test_duration_api_validation_and_default():
    fields = {'client_name': 'Empresa', 'client_email': 'compras@example.test', 'estimated_delivery_days': 5,
              'items': [{'description': 'Cadernos', 'quantity': 200, 'unit_price': 10}]}
    for days in [0, 8, 365]:
        serializer = ManualQuoteCreateSerializer(data={**fields, 'validity_days': days})
        assert not serializer.is_valid()
        assert 'validity_days' in serializer.errors
    serializer = ManualQuoteCreateSerializer(data=fields)
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data['validity_days'] == 15


@pytest.mark.django_db
def test_long_validity_links_survive_seven_days_but_legacy_links_do_not(quote, staff_user):
    quote.final_price = 100
    quote.validity_days = 30
    quote.save()
    prepare(quote, staff_user)
    transition(quote, staff_user, 'send', 0, '')
    token = review_link(quote).split('#token=')[1]
    legacy = signing.dumps({'q': quote.pk, 'v': quote.proposal_version, 'f': fingerprint(quote)}, salt=SALT)
    client = APIClient()
    with patch('django.core.signing.time.time', return_value=timezone.now().timestamp() + LEGACY_MAX_AGE + 10):
        client.credentials(HTTP_X_MP_PROPOSAL_TOKEN=token)
        assert client.post('/api/proposal-review/', {'action': 'view'}, format='json').status_code == 200
        client.credentials(HTTP_X_MP_PROPOSAL_TOKEN=legacy)
        assert client.post('/api/proposal-review/', {'action': 'view'}, format='json').status_code == 403
