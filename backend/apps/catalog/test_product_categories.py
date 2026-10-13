import pytest
from django.urls import reverse
from rest_framework.exceptions import ValidationError

from apps.cart.serializers import CartItemCreateUpdateSerializer
from apps.catalog.apparel import validate_distribution
from apps.catalog.models import Product, ProductCategory, ServiceCategory
from apps.catalog.serializers import ProductSerializer
from apps.quotes.models import QuoteItem, QuoteRequest
from apps.quotes.views import create_order_from_quote


@pytest.mark.django_db
class TestProductCategories:
    def test_pdf_includes_category_specifications(self):
        from apps.core.documents import build_quote_pdf
        quote = QuoteRequest.objects.create(client_name='Empresa Exemplo - teste', estimated_delivery_days=7, proposal_stage='sent')
        for description, template, selections in [
            ('Powerbanks personalizados', 'electronics', [('capacity', 'Capacidade', '20000 mAh'), ('color', 'Cor', 'Preto')]),
            ('Banners de campanha', 'banner', [('format', 'Formato / dimensões', '2 x 1 m'), ('material', 'Material', 'Lona'), ('finishing', 'Acabamento', 'Ilhoses')]),
            ('Cadernos personalizados', 'stationery', [('format', 'Formato', 'A5'), ('paper', 'Papel', 'Offset'), ('pages', 'Número de páginas', '80')]),
        ]:
            QuoteItem.objects.create(quote=quote, description=description, quantity=20, unit_price=100, material_briefing={'catalogue_configuration': {'template': template, 'selections': [{'key': key, 'label': label, 'value': value} for key, label, value in selections]}})
        content = build_quote_pdf(quote)
        assert content.startswith(b'%PDF')
        import os
        if os.environ.get('MP_CATEGORY_PDF_PREVIEW') == '1':
            from pathlib import Path

            import pymupdf
            path = Path('../output/pdf/maputo-category-proposal-preview.pdf')
            path.write_bytes(content)
            document = pymupdf.open(path)
            assert '20000 mAh' in ''.join(page.get_text() for page in document)
            document[0].get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5)).save('../output/pdf/maputo-category-proposal-preview.png')

    def test_migration_preserves_known_services_and_does_not_guess_product_categories(self, category):
        from importlib import import_module
        from types import SimpleNamespace

        from django.apps import apps
        from django.db import connection

        product = Product.objects.create(name='Legacy polo', slug='legacy-polo', category=category, order_template='apparel', apparel_options={'models': ['Unissexo'], 'colors': ['Verde'], 'sizes': ['M']})
        original_options = product.apparel_options.copy()
        seed = import_module('apps.catalog.migrations.0005_product_categories_and_templates').seed_product_categories
        seed(apps, SimpleNamespace(connection=connection))
        seed(apps, SimpleNamespace(connection=connection))
        product.refresh_from_db()
        assert product.product_category_id is None
        assert product.configuration_template == 'apparel'
        assert product.apparel_options == original_options
        assert list(product.available_services.values_list('id', flat=True)) == [category.pk]

    def test_new_product_inherits_category_template_but_not_option_values(self):
        category = ProductCategory.objects.get(slug='electronica')
        serializer = ProductSerializer(data={'name': 'Default template', 'slug': 'default-template', 'product_category_id': category.pk})
        assert serializer.is_valid(), serializer.errors
        product = serializer.save()
        assert product.configuration_template == 'electronics'
        assert product.configuration_options == {}
    def test_seeded_categories_have_no_invented_product_options(self):
        assert set(ProductCategory.objects.values_list('configuration_template', flat=True)) == {'standard', 'apparel', 'electronics', 'banner', 'stationery'}

    def test_product_category_and_services_are_independent(self, staff_client, category):
        product_category = ProductCategory.objects.get(slug='electronica')
        response = staff_client.post(reverse('product-category-editor-create'), {
            'name': 'Powerbank', 'slug': 'powerbank-config', 'variant_config': [],
            'product_category_id': product_category.pk, 'configuration_template': 'electronics',
            'configuration_options': {'capacity': ['10000 mAh', '20000 mAh'], 'color': ['Preto']},
            'available_service_ids': [category.pk], 'base_price': None,
        }, format='json')
        assert response.status_code == 201, response.data
        assert response.data['product_category_name'] == 'Eletrónica'
        assert response.data['category_id'] is None
        assert response.data['available_service_ids'] == [category.pk]

    def test_options_are_bounded_by_template(self):
        for options in [{'sizes': ['M']}, {'capacity': ['100', '100']}, {'capacity': ['X' * 81]}, {'capacity': ['X'] * 21}]:
            serializer = ProductSerializer(data={'name': 'Bad', 'slug': 'bad', 'configuration_template': 'electronics', 'configuration_options': options})
            assert not serializer.is_valid()

    def test_changing_category_default_never_rewrites_existing_product(self, staff_client):
        category = ProductCategory.objects.get(slug='electronica')
        product = Product.objects.create(name='Existing', slug='existing', product_category=category, configuration_template='electronics', configuration_options={'capacity': ['10000 mAh']})
        response = staff_client.patch(reverse('product-category-detail', args=[category.slug]), {'configuration_template': 'stationery'}, format='json')
        assert response.status_code == 200
        product.refresh_from_db()
        assert product.configuration_template == 'electronics'
        assert product.configuration_options == {'capacity': ['10000 mAh']}

    def test_archiving_preserves_links_and_disallows_new_assignments(self, staff_client, client):
        category = ProductCategory.objects.get(slug='electronica')
        product = Product.objects.create(name='Linked', slug='linked', product_category=category)
        assert staff_client.patch(reverse('product-category-detail', args=[category.slug]), {'is_active': False}, format='json').status_code == 200
        assert client.get(reverse('product-category-detail', args=[category.slug])).status_code == 404
        serializer = ProductSerializer(data={'name': 'New', 'slug': 'new', 'product_category_id': category.pk})
        assert not serializer.is_valid()
        serializer = ProductSerializer(instance=product, data={'product_category_id': category.pk}, partial=True)
        assert serializer.is_valid(), serializer.errors
        assert staff_client.delete(reverse('product-category-detail', args=[category.slug])).status_code == 405

    def test_clients_cannot_edit_category_templates(self, authenticated_client):
        response = authenticated_client.post(reverse('product-category-list'), {'name': 'Unauthorized', 'slug': 'unauthorized'}, format='json')
        assert response.status_code == 403

    def test_client_selections_are_validated_then_snapshotted_through_production(self):
        category = ProductCategory.objects.get(slug='electronica')
        product = Product.objects.create(name='Powerbank', slug='powerbank', product_category=category, configuration_template='electronics', configuration_options={'capacity': ['20000 mAh'], 'color': ['Preto']})
        payload = {'product_slug': product.slug, 'quantity': 20, 'description': 'Powerbank', 'material_briefing': {'catalogue_configuration': {'template': 'electronics', 'category': 'Forged', 'selections': [{'key': 'capacity', 'label': 'Forged', 'value': '20000 mAh'}]}}}
        serializer = CartItemCreateUpdateSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors
        briefing = serializer.validated_data['material_briefing']
        assert briefing['catalogue_configuration']['category'] == 'Eletrónica'
        assert briefing['catalogue_configuration']['selections'][0]['label'] == 'Capacidade'
        quote = QuoteRequest.objects.create(client_name='Test')
        item = QuoteItem.objects.create(quote=quote, product=product, description='Powerbank', quantity=20, material_briefing=briefing)
        product.configuration_options = {'capacity': ['10000 mAh']}
        product.save()
        validate_distribution({'material_briefing': briefing}, instance=item, catalogue=False)
        order = create_order_from_quote(quote)
        assert order.items.get().material_briefing == briefing
        rejected = CartItemCreateUpdateSerializer(data=payload)
        assert not rejected.is_valid()
        with pytest.raises(ValidationError):
            validate_distribution({'product': product, 'material_briefing': briefing}, catalogue=True)

    def test_legacy_patch_keeps_service_link_and_configuration(self, category):
        product = Product.objects.create(name='Old', slug='old', category=category, order_template='apparel', configuration_template='apparel', apparel_options={'models': ['Unissexo'], 'colors': ['Branco'], 'sizes': ['M']})
        serializer = ProductSerializer(instance=product, data={'name': 'Renamed'}, partial=True)
        assert serializer.is_valid(), serializer.errors
        serializer.save()
        product.refresh_from_db()
        assert product.category_id == category.pk
        assert product.product_category_id is None
        assert product.configuration_template == 'apparel'
        assert ServiceCategory.objects.filter(pk=category.pk).exists()
