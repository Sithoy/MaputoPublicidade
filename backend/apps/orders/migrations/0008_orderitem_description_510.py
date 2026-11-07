from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('orders', '0007_apparel_configuration')]

    operations = [
        migrations.AlterField(
            model_name='orderitem', name='description',
            field=models.CharField('descrição', max_length=510, blank=True),
        ),
    ]
