from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("quotes", "0021_artworkproofversion_decision_source_and_more")]
    operations = [
        migrations.AddField(
            model_name="quoterequest", name="reception_follow_up_date",
            field=models.DateField(blank=True, null=True, db_index=True),
        ),
        migrations.AddField(
            model_name="quoterequest", name="reception_follow_up_note",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
