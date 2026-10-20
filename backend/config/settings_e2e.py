"""Loopback-only acceptance-test settings. Never use for a deployment."""

import os
from pathlib import Path
from urllib.parse import urlparse

from django.core.exceptions import ImproperlyConfigured

if os.environ.get("MP_E2E") != "1":
    raise ImproperlyConfigured("E2E settings require explicit MP_E2E=1")

database = urlparse(os.environ.get("DATABASE_URL", ""))
if database.scheme not in {"sqlite", "postgres", "postgresql"}:
    raise ImproperlyConfigured("An isolated E2E database is required")
if database.scheme != "sqlite" and database.hostname not in {"127.0.0.1", "localhost"}:
    raise ImproperlyConfigured("E2E database must be on loopback")
if not Path(database.path).name.startswith("mp_e2e"):
    raise ImproperlyConfigured("E2E database name must start with mp_e2e")

# Do not discover credentials in a parent checkout's .env file.
os.environ["PYTHON_DOTENV_DISABLED"] = "1"

from .settings import *  # noqa: E402,F403

DEBUG = False
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = 0
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
PAYMENT_PROVIDER = "mock"
SMS_BACKEND = "none"
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
MEDIA_ROOT = Path(__file__).resolve().parent.parent / ".e2e-media"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
