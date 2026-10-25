import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('quotes', '0027_request_library_origin')]

    operations = [
        migrations.CreateModel(
            name='ArtworkProofFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_name', models.CharField(max_length=160)),
                ('mime_type', models.CharField(max_length=100)),
                ('private_content', models.BinaryField()),
                ('proof', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='quotes.artworkproofversion')),
            ],
        ),
    ]
