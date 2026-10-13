"""Bounded category templates and immutable technical selections (never prices)."""
from rest_framework import serializers

FIELDS = {
    'standard': {},
    'apparel': {},
    'electronics': {'model': 'Modelo', 'capacity': 'Capacidade', 'color': 'Cor', 'branding_area': 'Área de personalização'},
    'banner': {'format': 'Formato / dimensões', 'material': 'Material', 'finishing': 'Acabamento'},
    'stationery': {'format': 'Formato', 'paper': 'Papel', 'pages': 'Número de páginas', 'finishing': 'Acabamento'},
}


def validate_options(template, options):
    if not isinstance(options, dict) or set(options) - set(FIELDS.get(template, {})):
        raise serializers.ValidationError({'configuration_options': 'Opções não permitidas para este modelo.'})
    for values in options.values():
        if not isinstance(values, list) or len(values) > 20 or any(not isinstance(v, str) or not v.strip() or len(v) > 80 for v in values):
            raise serializers.ValidationError({'configuration_options': 'Use até 20 opções por campo, com 80 caracteres cada.'})
        if len({v.strip().casefold() for v in values}) != len(values):
            raise serializers.ValidationError({'configuration_options': 'Não repita opções.'})
    return {key: [v.strip() for v in values] for key, values in options.items()}


class ConfigurationSelectionSerializer(serializers.Serializer):
    key = serializers.CharField(max_length=40)
    label = serializers.CharField(max_length=80)
    value = serializers.CharField(max_length=80)


class CatalogueConfigurationSerializer(serializers.Serializer):
    template = serializers.ChoiceField(choices=list(FIELDS))
    category = serializers.CharField(max_length=200, required=False, allow_blank=True)
    selections = ConfigurationSelectionSerializer(many=True, max_length=8)

    def validate(self, values):
        rows = values['selections']
        if len({row['key'] for row in rows}) != len(rows) or any(row['key'] not in FIELDS[values['template']] for row in rows):
            raise serializers.ValidationError('Campos inválidos ou repetidos na configuração do produto.')
        for row in rows:
            row['label'] = FIELDS[values['template']][row['key']]
        return values


def validate_catalogue_configuration(values, instance=None, catalogue=False):
    briefing = values.get('material_briefing', getattr(instance, 'material_briefing', {})) or {}
    snapshot = briefing.get('catalogue_configuration')
    if not snapshot:
        return values
    serializer = CatalogueConfigurationSerializer(data=snapshot)
    serializer.is_valid(raise_exception=True)
    snapshot = serializer.validated_data
    product = values.get('product', getattr(instance, 'product', None))
    if catalogue:
        if not product or snapshot['template'] != product.configuration_template:
            raise serializers.ValidationError('Modelo de configuração indisponível neste produto.')
        for row in snapshot['selections']:
            if row['value'] not in product.configuration_options.get(row['key'], []):
                raise serializers.ValidationError('A opção selecionada não está disponível neste produto.')
        snapshot['category'] = product.product_category.name if product.product_category else ''
    values['material_briefing'] = {**briefing, 'catalogue_configuration': snapshot}
    return values
