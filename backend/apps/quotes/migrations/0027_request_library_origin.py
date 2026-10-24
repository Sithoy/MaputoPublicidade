from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('quotes', '0026_studio_artwork_requirements')]
    operations = [migrations.AddField(model_name='quoterequestattachment', name='library_origin', field=models.JSONField(default=dict, blank=True))]
