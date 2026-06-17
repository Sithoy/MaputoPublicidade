# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("quotes", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="quoterequest",
            name="internal_notes",
            field=models.TextField(blank=True, verbose_name="notas internas"),
        ),
    ]
