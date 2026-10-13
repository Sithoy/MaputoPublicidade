from django.db import migrations, models


def preserve_existing_configuration(apps, schema_editor):
    # Existing products keep their explicit configuration until an editor opts in.
    apps.get_model('catalog', 'Product').objects.using(schema_editor.connection.alias).update(inherit_category_configuration=False)


class Migration(migrations.Migration):
    dependencies = [('catalog', '0005_product_categories_and_templates')]
    operations = [
        migrations.AddField(model_name='productcategory', name='configuration_options', field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name='productcategory', name='apparel_options', field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name='product', name='inherit_category_configuration', field=models.BooleanField(default=True)),
        migrations.RunPython(preserve_existing_configuration, migrations.RunPython.noop),
    ]
