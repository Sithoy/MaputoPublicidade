from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("assets", "0001_initial")]
    operations = [
        migrations.AddField(
            model_name="brandasset",
            name="private_content",
            field=models.BinaryField(editable=False, null=True),
        ),
        migrations.AddField(
            model_name="brandasset",
            name="file_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="brandasset",
            name="file_mime_type",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="brandasset", name="file_size", field=models.PositiveIntegerField(default=0)
        ),
    ]
