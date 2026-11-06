import base64
import hashlib
import json
import secrets
from io import StringIO
from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet, InvalidToken
from django.core import signing
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

from apps.core.integration_crypto import integration_cipher, primary_cipher
from apps.core.models import EmailConnection, WhatsAppConnection


def test_legacy_derivation_remains_compatible_without_configuration():
    root = secrets.token_urlsafe(48)
    expected = Fernet(base64.urlsafe_b64encode(hashlib.sha256(('mp-email-credentials-v1:' + root).encode()).digest()))
    payload = secrets.token_bytes(32)
    with override_settings(SECRET_KEY=root, INTEGRATION_ENCRYPTION_KEY='', INTEGRATION_ENCRYPTION_KEY_FALLBACK=''):
        assert integration_cipher('email').decrypt(expected.encrypt(payload)) == payload


def test_signing_rotation_does_not_break_dedicated_encryption_or_accept_old_signatures():
    old_signing = secrets.token_urlsafe(48)
    new_signing = secrets.token_urlsafe(48)
    root = secrets.token_urlsafe(48)
    payload = secrets.token_bytes(32)
    with override_settings(SECRET_KEY=old_signing, INTEGRATION_ENCRYPTION_KEY=root, INTEGRATION_ENCRYPTION_KEY_FALLBACK=''):
        encrypted = integration_cipher('email').encrypt(payload)
        token = signing.dumps({'purpose': 'synthetic-approval'})
    with override_settings(SECRET_KEY=new_signing, SECRET_KEY_FALLBACKS=[], INTEGRATION_ENCRYPTION_KEY=root,
                           INTEGRATION_ENCRYPTION_KEY_FALLBACK=old_signing):
        assert integration_cipher('email').decrypt(encrypted) == payload
        with pytest.raises(signing.BadSignature):
            signing.loads(token)


def test_domains_remain_separated_and_invalid_config_never_echoes_key():
    root = secrets.token_urlsafe(48)
    with override_settings(INTEGRATION_ENCRYPTION_KEY=root, INTEGRATION_ENCRYPTION_KEY_FALLBACK=''):
        token = integration_cipher('email').encrypt(secrets.token_bytes(32))
        with pytest.raises(InvalidToken):
            integration_cipher('whatsapp').decrypt(token)
    short = secrets.token_urlsafe(8)
    with override_settings(INTEGRATION_ENCRYPTION_KEY=short):
        with pytest.raises(ImproperlyConfigured) as exc:
            primary_cipher('email')
        assert short not in str(exc.value)
    with override_settings(INTEGRATION_ENCRYPTION_KEY='', INTEGRATION_ENCRYPTION_KEY_FALLBACK=root):
        with pytest.raises(ImproperlyConfigured):
            integration_cipher('email')


@pytest.fixture
def rotation_rows(db):
    legacy = secrets.token_urlsafe(48)
    current = secrets.token_urlsafe(48)
    plaintext = secrets.token_urlsafe(24).encode()
    with override_settings(INTEGRATION_ENCRYPTION_KEY=legacy, INTEGRATION_ENCRYPTION_KEY_FALLBACK=''):
        email = EmailConnection.objects.create(
            credentials=integration_cipher('email').encrypt(plaintext).decode(),
            oauth_secret=integration_cipher('email').encrypt(plaintext).decode(),
            oauth_refresh=integration_cipher('email').encrypt(plaintext).decode(),
        )
        whatsapp = WhatsAppConnection.objects.create(credentials=integration_cipher('whatsapp').encrypt(plaintext).decode())
    private_config = {'default': {'BACKEND': 'storages.backends.gcloud.GoogleCloudStorage',
                                 'OPTIONS': {'default_acl': None, 'querystring_auth': True}}}
    with override_settings(INTEGRATION_ENCRYPTION_KEY=current, INTEGRATION_ENCRYPTION_KEY_FALLBACK=legacy,
                           STORAGES=private_config):
        with patch('apps.core.management.commands.rotate_integration_credentials.default_storage') as storage:
            storage.save.return_value = 'private/security/synthetic-backup.json'
            yield email, whatsapp, plaintext


def snapshot():
    email = EmailConnection.objects.get()
    return (email.credentials, email.oauth_secret, email.oauth_refresh, WhatsAppConnection.objects.get().credentials)


def test_rotation_defaults_to_dry_run_and_redacts_all_material(rotation_rows):
    before = snapshot()
    output = StringIO()
    call_command('rotate_integration_credentials', stdout=output)
    assert snapshot() == before
    result = json.loads(output.getvalue())
    assert result['applied'] is False
    assert result['integration_rotation'] == {'configured_entries': 4, 'current_entries': 0,
                                              'legacy_entries': 4, 'updated_entries': 0}
    assert rotation_rows[2].decode() not in output.getvalue()
    assert all(value not in output.getvalue() for value in before)


def test_apply_is_atomic_idempotent_and_removes_need_for_legacy_key(rotation_rows):
    _, _, plaintext = rotation_rows
    before = snapshot()
    output = StringIO()
    call_command('rotate_integration_credentials', apply=True, stdout=output)
    after = snapshot()
    assert after != before
    assert json.loads(output.getvalue())['integration_rotation']['updated_entries'] == 4
    with override_settings(INTEGRATION_ENCRYPTION_KEY_FALLBACK=''):
        call_command('rotate_integration_credentials', verify_current_only=True, stdout=StringIO())
        assert primary_cipher('email').decrypt(after[0].encode()) == plaintext
        assert primary_cipher('whatsapp').decrypt(after[3].encode()) == plaintext
    output = StringIO()
    call_command('rotate_integration_credentials', apply=True, stdout=output)
    assert snapshot() == after
    assert json.loads(output.getvalue())['integration_rotation']['updated_entries'] == 0


def test_invalid_entry_aborts_every_write(rotation_rows):
    WhatsAppConnection.objects.update(credentials='malformed-ciphertext')
    before = snapshot()
    with pytest.raises(CommandError, match='no changes were committed'):
        call_command('rotate_integration_credentials', apply=True, stdout=StringIO())
    assert snapshot() == before


def test_current_only_validation_rejects_unmigrated_entries(rotation_rows):
    before = snapshot()
    with pytest.raises(CommandError, match='current key'):
        call_command('rotate_integration_credentials', verify_current_only=True, stdout=StringIO())
    assert snapshot() == before


def test_backup_failure_prevents_all_database_changes(rotation_rows):
    before = snapshot()
    with patch('apps.core.management.commands.rotate_integration_credentials.create_backup', side_effect=OSError):
        with pytest.raises(CommandError, match='backup failed'):
            call_command('rotate_integration_credentials', apply=True)
    assert snapshot() == before


def test_backup_requires_private_storage_and_contains_only_original_ciphertext(rotation_rows):
    from apps.core.management.commands.rotate_integration_credentials import create_backup

    email, _, plaintext = rotation_rows
    with override_settings(STORAGES={'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'}}):
        with pytest.raises(CommandError, match='private Google storage'):
            create_backup([(email, {'credentials': 'unused-new-ciphertext'})])
    private_config = {'default': {'BACKEND': 'storages.backends.gcloud.GoogleCloudStorage',
                                 'OPTIONS': {'default_acl': None, 'querystring_auth': True}}}
    with override_settings(STORAGES=private_config):
        with patch('apps.core.management.commands.rotate_integration_credentials.default_storage') as storage:
            create_backup([(email, {'credentials': 'unused-new-ciphertext'})])
            object_name, content = storage.save.call_args.args
            assert object_name.startswith('private/security/credential-rotation/')
            backup = content.read()
            assert plaintext not in backup
            assert json.loads(backup)['rows'][0]['fields']['credentials'] == email.credentials


def test_command_rejects_missing_key_and_conflicting_modes():
    with override_settings(INTEGRATION_ENCRYPTION_KEY=''):
        with pytest.raises(CommandError, match='dedicated'):
            call_command('rotate_integration_credentials')
    with override_settings(INTEGRATION_ENCRYPTION_KEY=secrets.token_urlsafe(48)):
        with pytest.raises(CommandError, match='not both'):
            call_command('rotate_integration_credentials', apply=True, verify_current_only=True)
