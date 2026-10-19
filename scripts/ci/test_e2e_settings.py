import os
import subprocess
import sys
import unittest
from pathlib import Path


class IsolatedAcceptanceSettingsTests(unittest.TestCase):
    def test_refuses_implicit_or_nonlocal_databases_before_connecting(self):
        backend = Path(__file__).resolve().parents[2] / 'backend'
        for enabled, database in [
            ('0', 'sqlite:///mp_e2e.sqlite3'),
            ('1', 'postgres://user:unused@production.example/mp_e2e'),
            ('1', 'postgres://user:unused@127.0.0.1/production'),
            ('1', 'sqlite:///customer-data.sqlite3'),
        ]:
            with self.subTest(enabled=enabled, database=database):
                result = subprocess.run(
                    [sys.executable, '-c', 'import config.settings_e2e'],
                    cwd=backend,
                    env={**os.environ, 'MP_E2E': enabled, 'DATABASE_URL': database,
                         'PYTHON_DOTENV_DISABLED': '1'},
                    capture_output=True, text=True, timeout=10,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('ImproperlyConfigured', result.stderr)


if __name__ == '__main__':
    unittest.main()
