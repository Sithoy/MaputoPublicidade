from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("portfolio", "0002_partner"),
    ]

    operations = [
        migrations.AddField(
            model_name="partner",
            name="logo_data_url",
            field=models.TextField(blank=True, verbose_name="logotipo embutido"),
        ),
    ]
