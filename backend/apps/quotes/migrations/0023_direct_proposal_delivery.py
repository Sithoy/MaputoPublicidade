from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("quotes", "0022_reception_follow_up")]

    operations = [
        migrations.AlterField(
            model_name="quoterequest", name="proposal_stage",
            field=models.CharField(default="legacy", max_length=12, choices=[
                ("legacy", "Fluxo anterior"), ("draft", "Em preparação"),
                ("review", "Proposta guardada (fluxo anterior)"),
                ("returned", "Em preparação (fluxo anterior)"),
                ("approved", "Pronta para enviar"), ("sent", "Enviada ao cliente"),
            ]),
        ),
    ]
