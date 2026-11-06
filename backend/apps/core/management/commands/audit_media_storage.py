"""Read-only, aggregate media inventory. Never print paths or file contents."""

import json

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import models


def audit_field(model, field):
    field_names = {item.name for item in model._meta.fields}
    backup = f'{field.name}_data_url'
    if backup not in field_names:
        backup = 'private_content' if 'private_content' in field_names else None
    has_backup = models.Q(pk__in=[])
    if backup:
        empty = b'' if isinstance(model._meta.get_field(backup), models.BinaryField) else ''
        has_backup = models.Q(**{f'{backup}__isnull': False}) & ~models.Q(**{backup: empty})
    rows = model._default_manager.annotate(
        media_in_database=models.Case(
            models.When(has_backup, then=models.Value(True)),
            default=models.Value(False), output_field=models.BooleanField(),
        ),
    ).values_list(field.name, 'media_in_database')
    counts = dict(database_backed=0, storage_present=0, storage_missing=0, storage_errors=0, empty=0)
    for name, database_backed in rows.iterator(chunk_size=200):
        if database_backed:
            counts['database_backed'] += 1
        elif not name:
            counts['empty'] += 1
        else:
            try:
                present = field.storage.exists(name)
            except Exception:
                # Provider exceptions may include private object names or request URLs.
                counts['storage_errors'] += 1
            else:
                counts['storage_present' if present else 'storage_missing'] += 1
    return counts


class Command(BaseCommand):
    help = 'Read-only media inventory: aggregate counts only, without file names or contents.'

    def add_arguments(self, parser):
        parser.add_argument('--fail-on-missing', action='store_true')

    def handle(self, *args, **options):
        report = {'file_fields': {}, 'database_attachment_fields': {}}
        for model in apps.get_models():
            if not model._meta.app_config.name.startswith('apps.'):
                continue
            for field in model._meta.fields:
                key = f'{model._meta.label}.{field.name}'
                if isinstance(field, models.FileField):
                    report['file_fields'][key] = audit_field(model, field)
                elif isinstance(field, models.BinaryField) and field.name in {'content', 'private_content'}:
                    report['database_attachment_fields'][key] = model._default_manager.filter(
                        **{f'{field.name}__isnull': False},
                    ).exclude(**{field.name: b''}).count()
        self.stdout.write(json.dumps(report, sort_keys=True))
        unresolved = sum(row['storage_missing'] + row['storage_errors'] for row in report['file_fields'].values())
        if options['fail_on_missing'] and unresolved:
            raise CommandError('Media inventory has missing or unreadable files; cutover must wait.')
