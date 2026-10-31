from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('quotes', '0022_reception_follow_up')]

    operations = [
        migrations.AlterField(
            model_name='quoteitem', name='description',
            field=models.CharField('descrição', max_length=510, blank=True),
        ),
    ]
