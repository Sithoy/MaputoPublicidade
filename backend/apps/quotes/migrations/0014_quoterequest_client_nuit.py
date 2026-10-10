from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("quotes", "0013_proposalpreparation")]
    operations = [migrations.AddField(
        model_name="quoterequest", name="client_nuit",
        field=models.CharField("NUIT", max_length=50, blank=True),
    )]
