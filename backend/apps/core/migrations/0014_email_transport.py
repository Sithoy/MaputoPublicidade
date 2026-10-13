from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('core', '0013_emailconnection_oauth')]
    operations = [
        migrations.AddField(model_name='emailconnection', name='sending_enabled', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='emailconnection', name='receiving_enabled', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='emailconnection', name='receiving_since', field=models.DateTimeField(null=True, blank=True)),
        migrations.AddField(model_name='emailconnection', name='sync_start', field=models.PositiveIntegerField(default=1)),
        migrations.AddField(model_name='emailconnection', name='sync_lock_until', field=models.DateTimeField(null=True, blank=True)),
        migrations.AddField(model_name='emailconnection', name='last_synced_at', field=models.DateTimeField(null=True, blank=True)),
        migrations.AddField(model_name='supportconversation', name='email_thread_key', field=models.CharField(max_length=64, null=True, blank=True, unique=True)),
        migrations.AddField(model_name='supportconversation', name='contact_email', field=models.EmailField(blank=True, max_length=254)),
        migrations.AddField(model_name='supportmessage', name='email_id', field=models.CharField(max_length=160, null=True, blank=True, unique=True)),
        migrations.AddField(model_name='supportmessage', name='email_request_id', field=models.UUIDField(null=True, blank=True, unique=True)),
    ]
