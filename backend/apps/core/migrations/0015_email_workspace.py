import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def set_email_stages(apps, schema_editor):
    conversation = apps.get_model('core', 'SupportConversation')
    conversation.objects.filter(channel='email', status='awaiting_client').update(email_stage='waiting')
    conversation.objects.filter(channel='email', status='resolved').update(email_stage='resolved')


class Migration(migrations.Migration):
    dependencies = [('core', '0014_email_transport'), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.AddField(model_name='supportconversation', name='email_stage', field=models.CharField(max_length=20, default='new', choices=[('new', 'Por tratar'), ('preparing', 'Em preparação'), ('waiting', 'A aguardar cliente'), ('resolved', 'Resolvido')])),
        migrations.AddField(model_name='supportmessage', name='email_subject', field=models.CharField(max_length=255, blank=True)),
        migrations.AddField(model_name='supportmessage', name='email_headers', field=models.JSONField(default=dict, blank=True)),
        migrations.AlterField(model_name='supportmessage', name='body', field=models.TextField(max_length=100000)),
        migrations.CreateModel(name='EmailDraft', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('subject', models.CharField(max_length=255)), ('body', models.TextField(blank=True, max_length=4000)),
            ('template_key', models.CharField(max_length=40, blank=True)), ('version', models.PositiveIntegerField(default=0)),
            ('request_id', models.UUIDField(default=uuid.uuid4)), ('send_state', models.CharField(max_length=20, default='idle')),
            ('updated_at', models.DateTimeField(auto_now=True)),
            ('conversation', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='email_draft', to='core.supportconversation')),
            ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
        ]),
        migrations.RunPython(set_email_stages, migrations.RunPython.noop),
    ]
