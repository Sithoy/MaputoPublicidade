import pytest
from django.urls import reverse

from apps.cart.serializers import CartItemCreateUpdateSerializer
from apps.catalog.apparel import validate_distribution
from apps.catalog.models import Product, ProductCategory
from apps.catalog.serializers import ProductCategorySerializer, ProductSerializer
from apps.quotes.models import QuoteItem, QuoteRequest
from apps.quotes.views import create_order_from_quote


@pytest.mark.django_db
class TestConfigurationInheritance:
    def test_legacy_editor_explicit_configuration_opts_out_but_quick_toggle_does_not(self):
        category = ProductCategory.objects.get(slug='electronica')
        product = Product.objects.create(name='Inherited', slug='inherited', product_category=category)
        toggle = ProductSerializer(product, data={'is_active': False}, partial=True)
        assert toggle.is_valid(), toggle.errors
        toggle.save()
        assert product.inherit_category_configuration is True
        edit = ProductSerializer(product, data={'configuration_template': 'electronics', 'configuration_options': {'capacity': ['5000 mAh']}}, partial=True)
        assert edit.is_valid(), edit.errors
        edit.save()
        assert product.inherit_category_configuration is False
        assert edit.data['configuration_options'] == {'capacity': ['5000 mAh']}

    def test_simple_product_inherits_materials_and_formats(self):
        category = ProductCategory.objects.get(slug='outros-produtos')
        category.configuration_options = {'material': ['Alumínio'], 'size': ['A4']}
        category.save()
        product = Product.objects.create(name='Display', slug='display', product_category=category, materials=['Old'])
        assert ProductSerializer(product).data['materials'] == ['Alumínio']
        assert ProductSerializer(product).data['sizes'] == ['A4']
        assert product.materials == ['Old']

    def test_category_editor_requires_complete_configuration_and_staff_permissions(self, staff_client, authenticated_client):
        category = ProductCategory.objects.get(slug='electronica')
        url = reverse('product-category-configuration-editor-update', args=[category.slug])
        payload = {'configuration_template': 'electronics', 'configuration_options': {'capacity': ['20000 mAh']}, 'apparel_options': {}}
        assert authenticated_client.patch(url, payload, format='json').status_code == 403
        assert staff_client.patch(url, {'name': 'Incomplete'}, format='json').status_code == 400
        response = staff_client.patch(url, payload, format='json')
        assert response.status_code == 200, response.data
        assert response.data['configuration_options'] == payload['configuration_options']

    def test_category_updates_flow_to_inheriting_products_only(self):
        category = ProductCategory.objects.get(slug='electronica')
        category.configuration_options = {'capacity': ['20000 mAh']}
        category.save()
        inherited = Product.objects.create(name='Inherited', slug='inherited', product_category=category)
        custom = Product.objects.create(name='Custom', slug='custom', product_category=category, inherit_category_configuration=False, configuration_template='electronics', configuration_options={'capacity': ['5000 mAh']})
        assert ProductSerializer(inherited).data['configuration_options'] == {'capacity': ['20000 mAh']}
        update = ProductCategorySerializer(category, data={'configuration_options': {'capacity': ['10000 mAh']}}, partial=True)
        assert update.is_valid(), update.errors
        update.save()
        inherited.refresh_from_db()
        custom.refresh_from_db()
        assert ProductSerializer(inherited).data['configuration_options'] == {'capacity': ['10000 mAh']}
        assert ProductSerializer(custom).data['configuration_options'] == {'capacity': ['5000 mAh']}
        assert inherited.configuration_options == {}

    def test_new_editor_inherits_without_copying_category_options(self, staff_client):
        category = ProductCategory.objects.get(slug='electronica')
        category.configuration_options = {'capacity': ['20000 mAh']}
        category.save()
        response = staff_client.post(reverse('product-inheritance-editor-create'), {
            'name': 'Inherited', 'slug': 'inherited', 'product_category_id': category.pk,
            'inherit_category_configuration': True, 'configuration_template': 'standard',
            'configuration_options': {}, 'available_service_ids': [], 'variant_config': [],
        }, format='json')
        assert response.status_code == 201, response.data
        assert response.data['configuration_template'] == 'electronics'
        assert response.data['configuration_options'] == category.configuration_options
        assert response.data['own_configuration_options'] == {}
        assert response.data['inherit_category_configuration'] is True

    def test_inherited_apparel_uses_category_grid_and_validates_choices(self):
        category = ProductCategory.objects.get(slug='vestuario')
        category.apparel_options = {'models': ['Unissexo'], 'colors': ['Verde'], 'sizes': ['M']}
        category.save()
        product = Product.objects.create(name='Polo', slug='polo', product_category=category)
        assert ProductSerializer(product).data['order_template'] == 'apparel'
        assert ProductSerializer(product).data['apparel_options'] == category.apparel_options
        payload = {'product_slug': product.slug, 'quantity': 20, 'description': 'Polo', 'material_briefing': {'apparel': {'pending': False, 'rows': [{'model': 'Unissexo', 'color': 'Verde', 'size': 'M', 'quantity': 20}]}}}
        serializer = CartItemCreateUpdateSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors
        payload['material_briefing']['apparel']['rows'][0]['size'] = 'XL'
        assert not CartItemCreateUpdateSerializer(data=payload).is_valid()

    def test_category_updates_never_change_existing_quote_and_order_selections(self):
        category = ProductCategory.objects.get(slug='electronica')
        category.configuration_options = {'capacity': ['20000 mAh']}
        category.save()
        product = Product.objects.create(name='Powerbank', slug='powerbank', product_category=category)
        payload = {'product_slug': product.slug, 'quantity': 10, 'description': 'Powerbank', 'material_briefing': {'catalogue_configuration': {'template': 'electronics', 'selections': [{'key': 'capacity', 'label': 'Capacidade', 'value': '20000 mAh'}]}}}
        validator = CartItemCreateUpdateSerializer(data=payload)
        assert validator.is_valid(), validator.errors
        briefing = validator.validated_data['material_briefing']
        quote = QuoteRequest.objects.create(client_name='Test')
        item = QuoteItem.objects.create(quote=quote, product=product, description='Powerbank', quantity=10, material_briefing=briefing)
        category.configuration_options = {'capacity': ['10000 mAh']}
        category.save()
        validate_distribution({'material_briefing': briefing}, instance=item, catalogue=False)
        assert create_order_from_quote(quote).items.get().material_briefing == briefing
        assert not CartItemCreateUpdateSerializer(data=payload).is_valid()

    def test_category_configuration_is_bounded_and_apparel_can_start_empty(self):
        for options in [{'capacity': ['x', 'X']}, {'capacity': ['x' * 81]}, {'sizes': ['M']}]:
            validator = ProductCategorySerializer(data={'name': 'Bad', 'slug': 'bad', 'configuration_template': 'electronics', 'configuration_options': options})
            assert not validator.is_valid()
        validator = ProductCategorySerializer(data={'name': 'Clothing', 'slug': 'clothing', 'configuration_template': 'apparel', 'apparel_options': {}})
        assert validator.is_valid(), validator.errors
        validator = ProductCategorySerializer(data={'name': 'Clothing', 'slug': 'clothing', 'configuration_template': 'apparel', 'apparel_options': {'colors': ['White']}})
        assert not validator.is_valid()

    def test_migration_preserves_explicit_existing_products(self):
        from importlib import import_module
        from types import SimpleNamespace

        from django.apps import apps
        from django.db import connection

        product = Product.objects.create(name='Existing', slug='existing', product_category=ProductCategory.objects.get(slug='electronica'), configuration_template='electronics', configuration_options={'capacity': ['5000 mAh']})
        import_module('apps.catalog.migrations.0006_category_configuration_inheritance').preserve_existing_configuration(apps, SimpleNamespace(connection=connection))
        product.refresh_from_db()
        assert product.inherit_category_configuration is False
        assert ProductSerializer(product).data['configuration_options'] == {'capacity': ['5000 mAh']}
