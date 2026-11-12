# Isolated staging and local development

Production remains on `main`; this setup must be released only to `staging`.
Do not merge the staging setup into main as part of provisioning.

## Resource boundaries

- Frontend: Vercel Preview, `maputopublicidade.vercel.app`.
- Backend: Cloud Run `mp-backend-staging`, project `maputo-publicidade-gcp`, us-east4.
- Database: separate Neon project `maputo-publicidade-staging`
  (`raspy-mountain-07187239`), database `mp_staging`. No production rows are copied.
- Media: private bucket `maputo-publicidade-gcp-staging-media-654913531299`.
- Identity: `mp-staging-runtime@maputo-publicidade-gcp.iam.gserviceaccount.com`,
  with access only to staging secrets and the staging media bucket.
- Runtime database role: `mp_staging_runtime`, DML only; schema changes use the
  staging owner through an explicit one-off job, never web startup.

The app rejects staging configuration pointing to another database or the
production media bucket. Staging blocks Zoho OAuth/API, SMTP/IMAP and WhatsApp
provider calls, and forces dummy email, no SMS, and mock payments. No live
integration credentials are copied. Test approval links remain on staging.

## Cost controls

Cloud Run: request-based billing, zero minimum instances, one maximum instance,
one CPU, 512 MiB, concurrency two. Neon: fixed 0.25 CU, automatic idle suspension,
six-hour restore history. No scheduler, Redis, load balancer or VPC connector.
Storage, active traffic and data transfer can still incur charges. The existing
USD10 Google Cloud budget is an alert, not a spending cap.

## Provisioning and release

1. Create a fresh Neon project, not a clone of production. Transfer its owner URL
   directly into `mp-staging-owner-db` without printing it or writing a `.env`.
   `scripts/ops/staging_secret_setup.py --secure-input` uses hidden console input
   and only creates `mp-staging-*` secrets. Do not paste credentials in chat.
2. Apply the non-secret `ops/cloudrun/staging-env.yaml` to staging only.
3. Run `cloudrun/bootstrap_staging.py` explicitly with the staging owner secret,
   staging signing/root secrets and the initial-admin secret. It applies Django
   migrations, adds one demo product and a staging administrator, creates a
   restricted runtime role, and stores its pooled URL in `mp-staging-runtime-db`.
4. Deploy an exact CI-passing commit/image to `mp-backend-staging` using only
   staging secrets. Never update the production service or its IAM/secrets.
5. Set Vercel Preview `INTERNAL_API_URL` to the staging backend; keep Production
   unchanged. Development uses `http://localhost:8000`; Docker Compose explicitly
   uses `http://backend:8000`. Split any shared preview/development setting.
6. Verify homepage/catalogue/auth, protected endpoints, fresh database, private
   storage signing, and blocked outbound integrations before assigning the alias.

Initial admin: `staging.admin@maputopublicidade.com`. The generated initial
password is stored in Secret Manager `mp-staging-initial-admin`; only an owner
should retrieve it directly in Google Cloud and change it after first login.
It is never included in output, deployment arguments, or source control.

## Environment safety

All server API and authentication calls and Next rewrites use the same origin
resolver. Hosted environments require explicit HTTPS configuration. Nonproduction
rejects the known production hosts, and no environment falls back to Render.
Staging and development do not retry failed reads against the live public API.
The production-only public-content fallback is unchanged.

Local database contents and existing `.env` files are not modified by this setup.
Do not pull production credentials for development. Use the local Compose
PostgreSQL instance and local-only credentials supplied by the developer.
