import importlib.util
import secrets
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('cloudrun_config', ROOT / 'backend/cloudrun/validate_environment.py')
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


class CloudRunContractTests(unittest.TestCase):
    def environment(self):
        return {'DEBUG': 'False', 'SECRET_KEY': secrets.token_urlsafe(48),
                'DATABASE_URL': 'postgresql://database.example/mp',
                'ALLOWED_HOSTS': 'backend.example.run.app',
                'GS_BUCKET_NAME': 'test-private-media',
                'GS_SA_EMAIL': 'runtime@example.iam.gserviceaccount.com'}

    def test_accepts_explicit_production_configuration(self):
        self.assertEqual(VALIDATOR.configuration_errors(self.environment()), [])

    def test_rejects_missing_debug_database_hosts_and_tls_without_disclosing_values(self):
        for key, value in [('DEBUG', 'True'), ('SECRET_KEY', ''), ('DATABASE_URL', 'sqlite:///app.sqlite3'),
                           ('DATABASE_URL', 'postgresql://[invalid'), ('DATABASE_SSL_REQUIRE', 'False'),
                           ('ALLOWED_HOSTS', '*'), ('ALLOWED_HOSTS', '')]:
            with self.subTest(key=key):
                env = {**self.environment(), key: value}
                errors = VALIDATOR.configuration_errors(env)
                self.assertTrue(errors)
                self.assertNotIn(env['DATABASE_URL'], '; '.join(errors))
                if env['SECRET_KEY']:
                    self.assertNotIn(env['SECRET_KEY'], '; '.join(errors))

    def test_requires_durable_storage_and_keyless_signing_identity(self):
        for overrides in [{'GS_BUCKET_NAME': ''}, {'GS_SA_EMAIL': ''},
                          {'AWS_STORAGE_BUCKET_NAME': 'another-bucket'}]:
            self.assertTrue(VALIDATOR.configuration_errors({**self.environment(), **overrides}))
        self.assertEqual(VALIDATOR.configuration_errors({
            **self.environment(), 'GS_BUCKET_NAME': '', 'GS_SA_EMAIL': '',
            'AWS_STORAGE_BUCKET_NAME': 'existing-private-media',
        }), [])

    def test_container_is_nonroot_and_startup_never_mutates_the_database(self):
        dockerfile = (ROOT / 'backend/Dockerfile.cloudrun').read_text()
        entrypoint = (ROOT / 'backend/cloudrun/entrypoint.sh').read_text()
        self.assertIn('USER 10001:10001', dockerfile)
        self.assertIn('PYTHON_DOTENV_DISABLED=1', dockerfile)
        self.assertIn('exec gunicorn', entrypoint)
        self.assertIn('${PORT:-8080}', entrypoint)
        self.assertNotIn('--access-logfile', entrypoint)
        for forbidden in ['manage.py migrate', 'seed_initial_data', 'ensure_admin_user', 'runserver']:
            self.assertNotIn(forbidden, entrypoint)

    def test_build_upload_excludes_secrets_and_local_media(self):
        ignored = (ROOT / 'backend/.gcloudignore').read_text().splitlines()
        for pattern in ['.env', '.env.*', '*.pem', '*.key', '*.sqlite3', 'media', 'tmp']:
            self.assertIn(pattern, ignored)

    def test_cloud_build_selects_the_production_dockerfile_and_release(self):
        build = (ROOT / 'backend/cloudbuild.cloudrun.yaml').read_text()
        self.assertIn('--file=Dockerfile.cloudrun', build)
        self.assertIn('--build-arg=APP_REVISION=${_REVISION}', build)
        self.assertNotIn('run deploy', build)


if __name__ == '__main__':
    unittest.main()
