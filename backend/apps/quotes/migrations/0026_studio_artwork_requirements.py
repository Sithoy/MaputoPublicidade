from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('quotes', '0025_quote_validity_days')]
    operations = [
        migrations.AddField(model_name='quoteitem', name='artwork_requirement', field=models.CharField(max_length=10, null=True, blank=True, choices=[('none', 'Sem arte'), ('client', 'Arte do cliente'), ('studio', 'Criar ou adaptar no Studio')])),
        migrations.AddField(model_name='artworkproofversion', name='technical_fingerprint', field=models.CharField(max_length=64, blank=True)),
    ]
