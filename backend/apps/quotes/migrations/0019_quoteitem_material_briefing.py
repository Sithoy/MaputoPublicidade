from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("quotes", "0018_quoterequest_billing_address_and_more")]
    operations = [
        migrations.AddField(
            model_name="quoteitem", name="material_briefing",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
