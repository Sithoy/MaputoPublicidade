import pytest
from rest_framework.exceptions import ValidationError

from apps.catalog.apparel import require_apparel_ready
from apps.catalog.models import Product
from apps.catalog.serializers import ProductSerializer
from apps.quotes.models import QuoteItem, QuoteRequest
from apps.quotes.serializers import ManualQuoteCreateSerializer, QuoteItemCreateSerializer
from apps.quotes.views import create_order_from_quote

OPTIONS = {'models': ['Masculino', 'Feminino'], 'colors': ['Verde'], 'sizes': ['M', 'L'], 'techniques': ['Bordado'], 'placements': ['Peito']}
ROWS = [{'model': 'Masculino', 'color': 'Verde', 'size': 'M', 'quantity': 100}, {'model': 'Feminino', 'color': 'Verde', 'size': 'L', 'quantity': 100}]


@pytest.fixture
def polo(db):
    return Product.objects.create(name='Polo campanha', slug='polo-campanha', order_template='apparel', apparel_options=OPTIONS)


def item(polo, **changes):
    return {'product_slug': polo.slug, 'description': polo.name, 'quantity': 200, 'material_briefing': {'work_type': 'apparel', 'apparel': {'pending': False, 'rows': ROWS}}, **changes}


@pytest.mark.django_db
class TestApparel:
    def test_pdf_distribution_is_paginated_and_visible(self, tmp_path):
        from apps.core.documents import build_quote_pdf
        quote = QuoteRequest.objects.create(client_name='Campanha Exemplo', final_price=90000, estimated_delivery_days=7, proposal_stage='sent')
        rows = [{'model': model, 'color': color, 'size': size, 'quantity': 25} for model in ['Masculino', 'Feminino'] for color in ['Verde', 'Branco'] for size in ['M', 'L']]
        line = QuoteItem.objects.create(quote=quote, description='Polos personalizados para campanha', quantity=200, unit_price=450, material_briefing={'apparel': {'pending': False, 'rows': rows, 'technique': 'Bordado', 'placement': 'Peito esquerdo'}})
        content = build_quote_pdf(quote)
        assert content.startswith(b'%PDF')
        import os
        if os.environ.get('MP_APPAREL_PDF_PREVIEW') == '1':
            from pathlib import Path
            Path('../output/pdf/maputo-apparel-proposal-preview.pdf').write_bytes(content)
        line.material_briefing['apparel']['rows'] = [{'model': f'Modelo {model}', 'color': f'Cor {color}', 'size': f'Tamanho {size}', 'quantity': 1} for model in range(3) for color in range(12) for size in range(12)]
        line.quantity = 432
        line.save()
        assert build_quote_pdf(quote).startswith(b'%PDF')

    def test_product_options_are_explicit_and_bounded(self, polo):
        assert ProductSerializer(polo).data['apparel_options'] == OPTIONS
        serializer = ProductSerializer(polo, data={'apparel_options': {**OPTIONS, 'colors': ['Verde', 'verde']}}, partial=True)
        assert not serializer.is_valid()
        assert Product.objects.create(name='Legacy', slug='legacy').order_template == 'standard'

    def test_counts_available_options_duplicates_and_price_injection(self, polo):
        assert QuoteItemCreateSerializer(data=item(polo)).is_valid()
        for rows in [ROWS[:1], [*ROWS, ROWS[0]], [{**ROWS[0], 'quantity': 200, 'color': 'Roxo'}], [{**ROWS[0], 'quantity': 200, 'unit_price': 1}], [{**ROWS[0], 'quantity': 1.5}]]:
            serializer = QuoteItemCreateSerializer(data=item(polo, material_briefing={'apparel': {'pending': False, 'rows': rows}}))
            assert not serializer.is_valid(), rows
        serializer = QuoteItemCreateSerializer(data=item(polo, material_briefing={'apparel': {'pending': True, 'rows': ROWS[:1]}}))
        assert serializer.is_valid()

    def test_cart_to_quote_and_order_preserve_distribution(self, authenticated_client, client_user, polo):
        response = authenticated_client.post('/api/cart/items/', item(polo), format='json')
        assert response.status_code == 201
        response = authenticated_client.post('/api/cart/convert-to-quote/', {'client_name': 'Empresa ABC', 'client_email': client_user.email}, format='json')
        assert response.status_code == 201
        quote = QuoteRequest.objects.get(reference=response.data['reference'])
        assert quote.items.get().material_briefing['apparel']['rows'] == ROWS
        order = create_order_from_quote(quote)
        assert order.items.get().material_briefing == quote.items.get().material_briefing

    def test_pending_is_quotable_but_not_production_ready(self, polo):
        serializer = QuoteItemCreateSerializer(data=item(polo, material_briefing={}))
        assert serializer.is_valid()
        assert serializer.validated_data['material_briefing']['apparel']['pending']
        quote = QuoteRequest.objects.create(client_name='ABC')
        line = QuoteItem.objects.create(quote=quote, quantity=200, material_briefing=serializer.validated_data['material_briefing'])
        with pytest.raises(ValidationError):
            require_apparel_ready(quote)
        line.material_briefing = {'apparel': {'pending': False, 'rows': ROWS}}
        line.save()
        require_apparel_ready(quote)

    def test_late_confirmation_is_scoped_audited_and_price_neutral(self, polo, staff_client, authenticated_client):
        quote = QuoteRequest.objects.create(client_name='ABC', final_price=20000, proposal_stage='sent')
        line = QuoteItem.objects.create(quote=quote, description='Polos', quantity=200, unit_price=100, material_briefing={'apparel': {'pending': True, 'rows': []}})
        order = create_order_from_quote(quote)
        endpoint = f'/api/quotes/{quote.reference}/apparel-distribution/'
        body = {'item_id': line.pk, 'apparel': {'pending': False, 'rows': ROWS}}
        assert authenticated_client.patch(endpoint, body, format='json').status_code == 403
        response = staff_client.patch(endpoint, body, format='json')
        assert response.status_code == 200
        quote.refresh_from_db()
        assert quote.final_price == 20000 and quote.proposal_stage == 'sent'
        assert order.items.get().material_briefing['apparel']['rows'] == ROWS
        order.status = 'in_production'
        order.save()
        assert staff_client.patch(endpoint, body, format='json').status_code == 400

    def test_commercial_pricing_preserves_existing_map(self, polo):
        quote = QuoteRequest.objects.create(client_name='ABC')
        line = QuoteItem.objects.create(quote=quote, quantity=200, description='Polos', material_briefing={'apparel': {'pending': False, 'rows': ROWS}})
        serializer = ManualQuoteCreateSerializer(instance=quote)
        with pytest.raises(ValidationError):
            serializer.update(quote, {'items': [{'item_id': line.pk, 'description': 'Polos', 'quantity': 100, 'unit_price': 100}], 'discount_type': 'fixed', 'discount_amount': 0, 'discount_percentage': 0, 'tax_rate': 0})
