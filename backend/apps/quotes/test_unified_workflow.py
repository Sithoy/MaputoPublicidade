from decimal import Decimal
from unittest.mock import patch

import pytest
from django.urls import reverse

from apps.accounts.roles import StaffRole

from .models import QuoteRequest


def proposal_data(quote):
    return {
        'client_name': quote.client_name, 'client_phone': '841234567',
        'client_email': '', 'estimated_delivery_days': 7,
        'items': [{'item_id': item.id, 'description': item.description,
                   'quantity': item.quantity, 'unit_price': '25.00'} for item in quote.items.all()],
    }


@pytest.mark.django_db
def test_prepare_existing_retains_reference_items_and_sources(staff_client, quote):
    item = quote.items.first()
    item.size = 'A3'
    item.material = 'Vinil'
    item.artwork_file = 'quotes/original.pdf'
    item.save()
    quote.contact_source = 'phone'
    quote.client_email = ''
    quote.save()
    reference, count = quote.reference, QuoteRequest.objects.count()
    with patch('apps.quotes.views.notify_quote_ready'):
        response = staff_client.post(reverse('quote-proposal', args=[reference]), proposal_data(quote), format='json')
    assert response.status_code == 200, response.data
    quote.refresh_from_db()
    item.refresh_from_db()
    assert QuoteRequest.objects.count() == count
    assert quote.reference == reference and quote.contact_source == 'phone'
    assert quote.status == 'reviewing' and quote.final_price == Decimal('58.00')
    assert quote.tax_rate == 16
    assert quote.proposal_stage == 'draft'
    assert item.size == 'A3' and item.material == 'Vinil'
    assert item.artwork_file.name == 'quotes/original.pdf'
    assert quote.activity_events.filter(action='status_changed').exists()


@pytest.mark.django_db
@pytest.mark.parametrize('invalid', ['foreign_id', 'duplicate_id', 'remove_attachment', 'missing_price'])
def test_invalid_proposal_is_atomic(staff_client, quote, invalid):
    item = quote.items.first()
    item.artwork_file = 'quotes/original.pdf'
    item.save()
    data = proposal_data(quote)
    if invalid == 'foreign_id':
        data['items'][0]['item_id'] = 999999
    elif invalid == 'duplicate_id':
        data['items'].append(dict(data['items'][0]))
    elif invalid == 'remove_attachment':
        del data['items'][0]['item_id']
    else:
        del data['items'][0]['unit_price']
    response = staff_client.post(reverse('quote-proposal', args=[quote.reference]), data, format='json')
    assert response.status_code == 400
    quote.refresh_from_db()
    item.refresh_from_db()
    assert quote.status == 'received' and item.unit_price is None
    assert item.artwork_file.name == 'quotes/original.pdf'


@pytest.mark.django_db
def test_preparation_rejects_approved_and_client_access(staff_client, authenticated_client, order):
    quote = order.quote
    url = reverse('quote-proposal', args=[quote.reference])
    assert authenticated_client.post(url, proposal_data(quote), format='json').status_code == 403
    assert staff_client.post(url, proposal_data(quote), format='json').status_code == 400


@pytest.mark.django_db
def test_commercial_can_register_phone_request_but_not_confirm_intake(staff_client, staff_user):
    staff_user.profile.staff_role = StaffRole.COMMERCIAL
    staff_user.profile.save()
    data = {'client_name': 'Empresa Horizonte', 'client_nuit': '400123456',
            'client_company': '', 'client_phone': '841234567', 'contact_source': 'phone',
            'outcome': 'quote', 'items': [{'description': 'Cartões', 'quantity': 100}]}
    with patch('apps.quotes.views.notify_quote_received'):
        response = staff_client.post(reverse('quote-intake'), data, format='json')
    assert response.status_code == 201, response.data
    assert response.data['quote']['client_nuit'] == '400123456'
    assert response.data['quote']['status'] == 'received'
    quote = QuoteRequest.objects.get(reference=response.data['quote_reference'])
    with patch('apps.quotes.views.notify_quote_ready'):
        assert staff_client.post(reverse('quote-proposal', args=[quote.reference]), proposal_data(quote), format='json').status_code == 200
    staff_user.profile.staff_role = StaffRole.RECEPTIONIST
    staff_user.profile.save()
    edit = staff_client.post(f'/api/reception/{quote.reference}/edit-session/', {'action': 'acquire'}, format='json')
    staff_client.credentials(HTTP_X_RECEPTION_EDIT_TOKEN=edit.data['token'])
    assert staff_client.post(reverse('quote-proposal', args=[quote.reference]), proposal_data(quote), format='json').status_code == 200
