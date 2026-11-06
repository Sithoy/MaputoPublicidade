#!/bin/sh
set -eu

python /app/cloudrun/validate_environment.py
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8080}" \
  --workers 2 \
  --threads 1 \
  --timeout 120 \
  --error-logfile - \
  --worker-tmp-dir /tmp
