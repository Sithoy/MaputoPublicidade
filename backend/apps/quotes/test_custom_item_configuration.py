from decimal import Decimal

import pytest

from apps.catalog.apparel import require_apparel_ready
from apps.quotes.serializers import ManualQuoteCreateSerializer, ReceptionIntakeSerializer
from apps.quotes.views import create_order_from_quote


@pytest.mark.django_db
@pytest.mark.parametrize('template,selections,apparel', [
    ('apparel', [{'key': 'material', 'label': 'Material', 'value': 'Algodão'}], {
        'pending': False,
        'rows': [
            {'model': 'Masculino', 'color': 'Verde', 'size': 'M', 'quantity': 120},
            {'model': 'Feminino', 'color': 'Verde', 'size': 'L', 'quantity': 80},
        ],
        'technique': 'Bordado', 'placement': 'Peito',
    }),
    ('electronics', [{'key': 'capacity', 'label': 'Capacidade', 'value': '20000 mAh'}], None),
    ('banner', [{'key': 'format', 'label': 'Formato / dimensões', 'value': '2 × 1 m'}], None),
    ('stationery', [{'key': 'paper', 'label': 'Papel', 'value': 'Couché'}], None),
])
def test_custom_configuration_survives_intake_pricing_and_order(template, selections, apparel):
    briefing = {'catalogue_configuration': {'template': template, 'selections': selections}}
    if apparel:
        briefing.update(work_type='apparel', apparel=apparel)
    intake = ReceptionIntakeSerializer(data={
        'client_name': 'Campanha de teste', 'client_phone': '+258840000000',
        'contact_source': 'walk_in', 'outcome': 'quote',
        'items': [{'description': 'Item personalizado', 'quantity': 200, 'material_briefing': briefing}],
    })
    assert intake.is_valid(), intake.errors
    quote = intake.save()
    item = quote.items.get()
    assert item.product_id is None
    assert item.material_briefing['catalogue_configuration'] == briefing['catalogue_configuration']
    if apparel:
        assert item.material_briefing['apparel']['rows'] == apparel['rows']
    snapshot = item.material_briefing
    # Pricing an existing custom line must preserve its technical briefing.
    ManualQuoteCreateSerializer(instance=quote).update(quote, {
        'items': [{'item_id': item.pk, 'description': item.description, 'quantity': 200, 'unit_price': Decimal('450')}],
        'discount_type': 'fixed', 'discount_amount': 0, 'discount_percentage': 0, 'tax_rate': 0,
    })
    item.refresh_from_db()
    assert item.material_briefing == snapshot
    require_apparel_ready(quote)
    assert create_order_from_quote(quote).items.get().material_briefing == snapshot


@pytest.mark.django_db
def test_custom_apparel_still_requires_correct_total_when_confirmed():
    intake = ReceptionIntakeSerializer(data={
        'client_name': 'Campanha de teste', 'client_phone': '+258840000000',
        'contact_source': 'phone', 'outcome': 'quote',
        'items': [{'description': 'Polos', 'quantity': 200, 'material_briefing': {
            'work_type': 'apparel', 'apparel': {'pending': False, 'rows': [
                {'model': 'Unissexo', 'color': 'Verde', 'size': 'M', 'quantity': 100},
            ]},
        }}],
    })
    assert not intake.is_valid()
    assert 'items' in intake.errors
    intake.initial_data['items'][0]['material_briefing']['apparel']['pending'] = True
    pending = ReceptionIntakeSerializer(data=intake.initial_data)
    assert pending.is_valid(), pending.errors
