from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('quotes', '0024_quote_vat_exemption')]
    operations = [migrations.AddField(
        model_name='quoterequest', name='validity_days',
        field=models.PositiveSmallIntegerField(blank=True, null=True,
            choices=[(7, '7 dias'), (15, '15 dias'), (30, '30 dias'), (60, '60 dias')],
            verbose_name='validade após envio (dias)'),
    )]
