import importlib
from io import StringIO

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings


@pytest.mark.django_db
def test_existing_admin_password_is_not_reset_at_startup(monkeypatch):
    monkeypatch.setenv('ADMIN_EMAIL', 'bootstrap@example.test')
    monkeypatch.delenv('ADMIN_PASSWORD', raising=False)
    monkeypatch.delenv('ADMIN_RESET_PASSWORD', raising=False)
    user = get_user_model().objects.create_user(username='bootstrap', email='bootstrap@example.test')
    original = user.password
    call_command('ensure_admin_user', stdout=StringIO())
    user.refresh_from_db()
    assert user.password == original


@pytest.mark.django_db
def test_new_admin_requires_explicit_secret(monkeypatch):
    monkeypatch.setenv('ADMIN_EMAIL', 'new-admin@example.test')
    monkeypatch.delenv('ADMIN_PASSWORD', raising=False)
    with pytest.raises(CommandError, match='Configure ADMIN_PASSWORD'):
        call_command('ensure_admin_user', stdout=StringIO())
    assert not get_user_model().objects.filter(email='new-admin@example.test').exists()


@pytest.mark.django_db
@override_settings(DEBUG=False)
def test_demo_seed_refuses_production_even_if_enabled(monkeypatch):
    monkeypatch.setenv('SEED_TEST_USERS', 'true')
    with pytest.raises(CommandError, match='disabled outside DEBUG'):
        call_command('seed_test_users', stdout=StringIO())


@pytest.mark.django_db
def test_admin_migration_preserves_existing_password_and_new_account_has_no_shared_secret():
    module = importlib.import_module('apps.accounts.migrations.0008_provision_etios_admin')
    module.provision_etios_admin(apps, None)
    user = get_user_model().objects.get(email=module.ADMIN_EMAIL)
    assert not user.has_usable_password()
    original = user.password
    module.provision_etios_admin(apps, None)
    user.refresh_from_db()
    assert user.password == original


def test_test_account_migration_no_longer_seeds_credentials():
    module = importlib.import_module('apps.accounts.migrations.0005_create_test_users')
    assert module.Migration.operations == []
