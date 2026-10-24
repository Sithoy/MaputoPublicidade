import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('assets', '0002_private_brand_files'), ('quotes', '0026_studio_artwork_requirements')]
    operations = [
        migrations.AddField(model_name='brandasset', name='source_proof', field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='library_asset', to='quotes.artworkproofversion')),
        migrations.AddField(model_name='brandasset', name='approval_record', field=models.JSONField(blank=True, default=dict, editable=False)),
        migrations.AlterField(model_name='brandasset', name='kind', field=models.CharField(choices=[('logo', 'Logótipo'), ('artwork', 'Arte / ficheiro gráfico'), ('template', 'Modelo reutilizável'), ('guide', 'Guia de marca'), ('document', 'Documento'), ('other', 'Outro')], default='other', max_length=20, verbose_name='tipo')),
    ]
