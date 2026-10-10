import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("quotes", "0014_quoterequest_client_nuit")]

    operations = [
        migrations.AddField(
            model_name="quoterequest",
            name="briefing",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.CreateModel(
            name="QuoteRequestAttachment",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("size", models.PositiveIntegerField()),
                ("content", models.BinaryField()),
                (
                    "quote",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="request_attachments",
                        to="quotes.quoterequest",
                    ),
                ),
            ],
        ),
    ]
