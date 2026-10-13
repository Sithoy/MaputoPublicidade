"""Bounded apparel options and quantity distributions; no client-supplied pricing."""
from rest_framework import serializers


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if isinstance(data, dict) and set(data) - set(self.fields):
            raise serializers.ValidationError('Campo desconhecido na configuração de vestuário.')
        return super().to_internal_value(data)


class ApparelOptionsSerializer(StrictSerializer):
    models = serializers.ListField(child=serializers.CharField(max_length=40), min_length=1, max_length=3)
    colors = serializers.ListField(child=serializers.CharField(max_length=40), min_length=1, max_length=12)
    sizes = serializers.ListField(child=serializers.CharField(max_length=20), min_length=1, max_length=12)
    techniques = serializers.ListField(child=serializers.CharField(max_length=60), max_length=8, default=list)
    placements = serializers.ListField(child=serializers.CharField(max_length=60), max_length=8, default=list)

    def validate(self, values):
        for options in values.values():
            if len({value.casefold() for value in options}) != len(options):
                raise serializers.ValidationError('Não repita opções na mesma lista.')
        return values


class ApparelRowSerializer(StrictSerializer):
    model = serializers.CharField(max_length=40)
    color = serializers.CharField(max_length=40)
    size = serializers.CharField(max_length=20)
    quantity = serializers.IntegerField(min_value=1, max_value=1000000)


class ApparelDistributionSerializer(StrictSerializer):
    pending = serializers.BooleanField(default=False)
    rows = ApparelRowSerializer(many=True, max_length=432, default=list)
    technique = serializers.CharField(max_length=60, allow_blank=True, default='')
    placement = serializers.CharField(max_length=60, allow_blank=True, default='')
    notes = serializers.CharField(max_length=2000, allow_blank=True, default='')

    def validate(self, values):
        keys = [(row['model'].casefold(), row['color'].casefold(), row['size'].casefold()) for row in values['rows']]
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError('Combinação de modelo, cor e tamanho repetida.')
        if any(len({row[key].casefold() for row in values['rows']}) > limit for key, limit in [('model', 6), ('color', 12), ('size', 12)]):
            raise serializers.ValidationError('O mapa admite até 6 modelos, 12 cores e 12 tamanhos.')
        return values


def validate_distribution(values, instance=None, catalogue=False):
    briefing = values.get('material_briefing', getattr(instance, 'material_briefing', {})) or {}
    distribution = briefing.get('apparel')
    product = values.get('product', getattr(instance, 'product', None))
    variant = values.get('product_variant', getattr(instance, 'product_variant', None))
    if catalogue and variant and (not variant.is_active or not product or variant.product_id != product.pk):
        raise serializers.ValidationError('Variante indisponível neste produto.')
    if distribution is None:
        if briefing.get('work_type') == 'apparel' or (product and product.order_template == 'apparel'):
            values['material_briefing'] = {**briefing, 'work_type': 'apparel', 'apparel': {'pending': True, 'rows': []}}
        return values
    quantity = values.get('quantity', getattr(instance, 'quantity', 1))
    total = sum(row['quantity'] for row in distribution.get('rows', []))
    if total > quantity or (not distribution.get('pending') and total != quantity):
        raise serializers.ValidationError({'material_briefing': f'A distribuição deve totalizar {quantity} unidades. Para uma distribuição incompleta, marque “por confirmar”.'})
    if catalogue and product and product.order_template == 'apparel':
        options = product.apparel_options
        for row in distribution['rows']:
            if any(row[field] not in options[key] for field, key in [('model', 'models'), ('color', 'colors'), ('size', 'sizes')]):
                raise serializers.ValidationError('A combinação selecionada não está disponível neste produto.')
        for field, key in [('technique', 'techniques'), ('placement', 'placements')]:
            if distribution.get(field) and distribution[field] not in options.get(key, []):
                raise serializers.ValidationError('Personalização não disponível neste produto.')
    return values


def apparel_lines(briefing):
    value = (briefing or {}).get('apparel')
    if not value:
        return []
    lines = ['Distribuição por confirmar' if value.get('pending') else 'Distribuição de vestuário']
    lines.extend(f"{row['model']} · {row['color']} · {row['size']}: {row['quantity']}" for row in value.get('rows', []))
    lines.extend(value[key] for key in ['technique', 'placement', 'notes'] if value.get(key))
    return lines


def require_apparel_ready(quote):
    for item in quote.items.all():
        value = (item.material_briefing or {}).get('apparel')
        if value and (value.get('pending') or sum(row['quantity'] for row in value.get('rows', [])) != item.quantity):
            raise serializers.ValidationError('Confirme a distribuição de vestuário antes de iniciar a produção.')
