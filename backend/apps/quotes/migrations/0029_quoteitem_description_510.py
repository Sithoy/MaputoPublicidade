from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("quotes", "0028_artworkprooffile")]

    operations = [
        migrations.AlterField(
            model_name="quoteitem",
            name="description",
            field=models.CharField(blank=True, max_length=510, verbose_name="descrição"),
        ),
    ]
