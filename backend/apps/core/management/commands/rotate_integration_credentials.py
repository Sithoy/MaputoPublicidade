"""Dry-run by default; rewrap encrypted settings atomically without sending mail."""

import json
from uuid import uuid4

from cryptography.fernet import InvalidToken
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.core.integration_crypto import integration_cipher, primary_cipher
from apps.core.models import EmailConnection, WhatsAppConnection


def create_backup(plan):
    config = settings.STORAGES['default']
    options = config.get('OPTIONS', {})
    if (config['BACKEND'] != 'storages.backends.gcloud.GoogleCloudStorage'
            or options.get('default_acl') is not None or options.get('querystring_auth') is not True):
        raise CommandError('Applying rotation requires the configured private Google storage backup.')
    rows = [{'model': row._meta.label, 'pk': row.pk,
             'fields': {field: getattr(row, field) for field in updates}}
            for row, updates in plan if updates]
    # Only ciphertext is backed up, never plaintext/root keys. Storage policy
    # prohibits public access; object names contain no customer identifiers.
    content = ContentFile(json.dumps({'version': 1, 'rows': rows}).encode())
    return default_storage.save(f'private/security/credential-rotation/{uuid4().hex}.json', content)


class Command(BaseCommand):
    help = 'Validate or atomically re-encrypt integration settings; never prints secrets.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')
        parser.add_argument('--verify-current-only', action='store_true')

    def handle(self, *args, **options):
        if not settings.INTEGRATION_ENCRYPTION_KEY:
            raise CommandError('Configure a dedicated INTEGRATION_ENCRYPTION_KEY first.')
        if options['apply'] and options['verify_current_only']:
            raise CommandError('Choose apply or verify-current-only, not both.')
        result = {'configured_entries': 0, 'current_entries': 0, 'legacy_entries': 0, 'updated_entries': 0}
        plan = []
        backup_object = None
        # Lock configuration rows only during an explicit apply. Parse every entry
        # before writing anything; any failure rolls back the entire operation.
        with transaction.atomic():
            for model, fields, domain in [
                (EmailConnection, ('credentials', 'oauth_secret', 'oauth_refresh'), 'email'),
                (WhatsAppConnection, ('credentials',), 'whatsapp'),
            ]:
                current = primary_cipher(domain)
                compatible = integration_cipher(domain)
                rows = model.objects.only('pk', *fields)
                if options['apply']:
                    rows = rows.select_for_update()
                for row in rows.order_by('pk'):
                    updates = {}
                    for field in fields:
                        value = getattr(row, field)
                        if not value:
                            continue
                        result['configured_entries'] += 1
                        try:
                            current.decrypt(value.encode())
                            result['current_entries'] += 1
                        except InvalidToken:
                            if options['verify_current_only']:
                                raise CommandError('Some encrypted entries do not use the current key.') from None
                            try:
                                plaintext = compatible.decrypt(value.encode())
                            except (InvalidToken, ValueError):
                                raise CommandError('An encrypted entry cannot be read; no changes were committed.') from None
                            result['legacy_entries'] += 1
                            updates[field] = current.encrypt(plaintext).decode()
                    plan.append((row, updates))
            if options['apply']:
                if any(updates for _, updates in plan):
                    try:
                        backup_object = create_backup(plan)
                    except CommandError:
                        raise
                    except Exception:
                        raise CommandError('Private backup failed; no integration settings were changed.') from None
                for row, updates in plan:
                    if updates:
                        for field, value in updates.items():
                            setattr(row, field, value)
                        row.save(update_fields=list(updates))
                        result['updated_entries'] += len(updates)
        self.stdout.write(json.dumps({'integration_rotation': result, 'applied': options['apply'],
                                     'backup_object': backup_object}))
