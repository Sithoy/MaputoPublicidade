import json

import pytest
from django.urls import reverse

from apps.catalog.models import Product, ProductVariant
from apps.catalog.serializers import ProductVariantSerializer
from apps.catalog.tests import image_upload


@pytest.mark.django_db
class TestUnifiedProductEditor:
    def test_dedicated_editor_endpoint_requires_the_complete_payload(self, staff_client):
        url = reverse('product-editor-create')
        response = staff_client.post(url, {'name': 'Missing', 'slug': 'missing-editor'}, format='json')
        assert response.status_code == 400
        response = staff_client.post(url, {'name': 'Editor', 'slug': 'dedicated-editor', 'variant_config': []}, format='json')
        assert response.status_code == 201, response.data
        response = staff_client.patch(reverse('product-editor-update', args=['dedicated-editor']), {
            'name': 'Updated', 'variant_config': [{'name': 'V1', 'price': '100'}],
        }, format='json')
        assert response.status_code == 200, response.data
        assert response.data['name'] == 'Updated'
        assert len(response.data['variants']) == 1

    def test_creates_product_and_versions_with_images_together(self, staff_client, category):
        response = staff_client.post(reverse('product-list'), {
            'name': 'Polo Premium', 'slug': 'polo-premium', 'category_id': category.id,
            'base_price': '', 'variant_config': json.dumps([{'name': 'Algodão', 'price': '100'}]),
            'variant_image_0': image_upload(),
        }, format='multipart')
        assert response.status_code == 201, response.data
        assert response.data['category_id'] == category.id
        assert response.data['base_price'] is None
        assert len(response.data['variants']) == 1
        assert response.data['variants'][0]['image'].startswith('data:image/png;base64,')

    def test_invalid_version_does_not_save_product(self, staff_client):
        response = staff_client.post(reverse('product-list'), {
            'name': 'Inválido', 'slug': 'invalid-editor',
            'variant_config': [{'name': 'Sem preço'}],
        }, format='json')
        assert response.status_code == 400
        assert not Product.objects.filter(slug='invalid-editor').exists()

    def test_failure_inside_save_rolls_back_everything(self, staff_client, monkeypatch):
        def fail(*args, **kwargs):
            raise RuntimeError('Simulated persistence failure')
        monkeypatch.setattr(ProductVariantSerializer, 'create', fail)
        with pytest.raises(RuntimeError):
            staff_client.post(reverse('product-list'), {
                'name': 'Rollback', 'slug': 'rollback-editor',
                'variant_config': [{'name': 'V1', 'price': '100'}],
            }, format='json')
        assert not Product.objects.filter(slug='rollback-editor').exists()

    def test_updates_and_deactivates_removed_versions_without_losing_references(self, staff_client, product):
        kept = ProductVariant.objects.create(product=product, name='Original', price=100)
        removed = ProductVariant.objects.create(product=product, name='Antiga', price=90)
        response = staff_client.patch(reverse('product-detail', args=[product.slug]), {
            'name': 'Produto revisto',
            'variant_config': [{'id': kept.id, 'name': 'Premium', 'price': '150', 'is_active': True}],
        }, format='json')
        assert response.status_code == 200, response.data
        kept.refresh_from_db()
        removed.refresh_from_db()
        assert kept.name == 'Premium'
        assert not removed.is_active
        assert kept.id in [row['id'] for row in response.data['variants']]

    def test_rejects_foreign_or_duplicate_version_ids(self, staff_client, product):
        other = Product.objects.create(name='Outro', slug='outro-editor')
        variant = ProductVariant.objects.create(product=other, name='Outra', price=100)
        response = staff_client.patch(reverse('product-detail', args=[product.slug]), {
            'name': 'Não guardar', 'variant_config': [{'id': variant.id, 'name': 'X', 'price': '100'}],
        }, format='json')
        assert response.status_code == 400
        product.refresh_from_db()
        assert product.name != 'Não guardar'
        own = ProductVariant.objects.create(product=product, name='Própria', price=100)
        row = {'id': own.id, 'name': 'X', 'price': '100'}
        response = staff_client.patch(reverse('product-detail', args=[product.slug]), {'variant_config': [row, row]}, format='json')
        assert response.status_code == 400

    def test_legacy_patch_leaves_versions_untouched_and_can_clear_image(self, staff_client, product):
        variant = ProductVariant.objects.create(product=product, name='Existente', price=100)
        product.image_data_url = 'data:image/png;base64,old'
        product.save()
        response = staff_client.patch(reverse('product-detail', args=[product.slug]), {'clear_image': True}, format='json')
        assert response.status_code == 200
        assert response.data['image'] is None
        variant.refresh_from_db()
        assert variant.is_active

    def test_clients_cannot_write_editor_payload(self, authenticated_client, product):
        response = authenticated_client.patch(reverse('product-detail', args=[product.slug]), {'variant_config': []}, format='json')
        assert response.status_code == 403
