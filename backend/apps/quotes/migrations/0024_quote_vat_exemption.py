import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("quotes", "0023_direct_proposal_delivery"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.AddField(model_name="quoterequest", name="vat_exempt", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="quoterequest", name="vat_exemption_reason", field=models.CharField(blank=True, max_length=1000)),
        migrations.CreateModel(name="QuoteVatEvidence", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("name", models.CharField(max_length=255)),
            ("content", models.BinaryField()),
            ("mime_type", models.CharField(max_length=50)),
            ("checksum", models.CharField(max_length=64)),
            ("client_identity", models.CharField(max_length=64)),
            ("created_at", models.DateTimeField(auto_now_add=True)),
            ("quote", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="vat_evidence", to="quotes.quoterequest")),
            ("uploaded_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
        ]),
    ]
