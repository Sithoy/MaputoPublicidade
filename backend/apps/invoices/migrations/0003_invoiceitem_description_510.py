from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('invoices', '0002_invoice_discount_percentage_invoice_discount_type')]

    operations = [
        migrations.AlterField(
            model_name='invoiceitem', name='description',
            field=models.CharField('descrição', max_length=510),
        ),
    ]
