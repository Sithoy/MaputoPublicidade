"""Django settings for Maputo Publicidade backend."""

import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")

DEBUG = os.getenv("DEBUG", "True").lower() in ("1", "true", "yes")

_allowed_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,backend")
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts.split(",") if h.strip()]

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]

SITE_ID = 1

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "rest_framework",
    "corsheaders",
    "allauth",
    "allauth.account",
    "allauth.headless",
    "storages",
    "apps.core.apps.CoreConfig",
    "apps.accounts",
    "apps.catalog",
    "apps.portfolio",
    "apps.quotes",
    "apps.orders",
    "apps.cart",
    "apps.payments",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# django-allauth
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*"]
ACCOUNT_EMAIL_VERIFICATION = "none"
ACCOUNT_SESSION_REMEMBER = True
ACCOUNT_ADAPTER = "apps.core.adapter.AccountAdapter"

# django-allauth headless
HEADLESS_ONLY = True
HEADLESS_ADAPTER = "apps.core.adapter.HeadlessAdapter"
HEADLESS_TOKEN_STRATEGY = "allauth.headless.tokens.strategies.jwt.JWTTokenStrategy"
HEADLESS_JWT_ALGORITHM = "HS256"
HEADLESS_JWT_ACCESS_TOKEN_EXPIRES_IN = 3600
HEADLESS_JWT_REFRESH_TOKEN_EXPIRES_IN = 604800
HEADLESS_JWT_STATEFUL_VALIDATION_ENABLED = False

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_SSL_REQUIRE = os.getenv("DATABASE_SSL_REQUIRE", "True").lower() in (
    "1",
    "true",
    "yes",
)

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=DATABASE_SSL_REQUIRE,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "maputopublicidade"),
            "USER": os.getenv("POSTGRES_USER", "mp_user"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "mp_password"),
            "HOST": os.getenv("POSTGRES_HOST", "db"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "pt-pt"
TIME_ZONE = "Africa/Maputo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "us-east-1")
AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN")
AWS_DEFAULT_ACL = "public-read"
AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}

STORAGES = {
    "default": {
        "BACKEND": (
            "storages.backends.s3boto3.S3Boto3Storage"
            if AWS_STORAGE_BUCKET_NAME
            else "django.core.files.storage.FileSystemStorage"
        ),
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
SERVE_MEDIA = os.getenv("SERVE_MEDIA", "False").lower() in ("1", "true", "yes")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "allauth.headless.contrib.rest_framework.authentication.JWTTokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

if DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"].append(
        "rest_framework.renderers.BrowsableAPIRenderer"
    )

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("1", "true", "yes")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "maputopublicidade@outlook.com")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", DEFAULT_FROM_EMAIL)

# SMS (optional)
SMS_BACKEND = os.getenv("SMS_BACKEND", "none")
SMS_FROM = os.getenv("SMS_FROM", "MaputoPublicidade")
AFRICASTALKING_USERNAME = os.getenv("AFRICASTALKING_USERNAME", "sandbox")
AFRICASTALKING_API_KEY = os.getenv("AFRICASTALKING_API_KEY", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Payments
PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "mock")
MPESA_API_KEY = os.getenv("MPESA_API_KEY", "")
MPESA_PUBLIC_KEY = os.getenv("MPESA_PUBLIC_KEY", "")
MPESA_SERVICE_PROVIDER_CODE = os.getenv("MPESA_SERVICE_PROVIDER_CODE", "")
MPESA_ENVIRONMENT = os.getenv("MPESA_ENVIRONMENT", "sandbox")
MPESA_CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "")
MPESA_ORIGIN = os.getenv("MPESA_ORIGIN", "developer.mpesa.vm.co.mz")
