"""Start a disposable local backend, without seeds or production credentials."""

import os
import secrets
import sys
from pathlib import Path

if os.environ.get("MP_E2E") != "1":
    raise SystemExit("Refusing to start without explicit MP_E2E=1")

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
os.environ["PYTHON_DOTENV_DISABLED"] = "1"
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings_e2e"
os.environ["SECRET_KEY"] = secrets.token_urlsafe(48)

import django  # noqa: E402
from django.core.management import call_command  # noqa: E402

django.setup()
call_command("migrate", interactive=False, verbosity=0)
call_command("runserver", "127.0.0.1:8008", use_reloader=False)
