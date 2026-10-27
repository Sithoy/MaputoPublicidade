from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('core', '0016_correspondence_files_signatures')]
    operations = [migrations.CreateModel(name='TrafficEvent', fields=[
        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
        ('event_id', models.UUIDField(unique=True)),
        ('visitor_key', models.CharField(max_length=64)),
        ('session_key', models.CharField(max_length=64)),
        ('kind', models.CharField(max_length=24)),
        ('path', models.CharField(max_length=180)),
        ('source', models.CharField(max_length=20)),
        ('device', models.CharField(max_length=10)),
        ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
    ])]
