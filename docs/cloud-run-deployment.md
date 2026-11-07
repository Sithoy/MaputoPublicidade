# Cloud Run production releases

Production backend: `mp-backend-production`, project `maputo-publicidade-gcp`, region `us-east4`.
The website remains on Vercel. Both backends use the same controlled Neon database.

## Automatic path

1. Merge reviewed changes into `main`; all existing CI/security gates must pass.
2. **Cloud Run production** verifies the CI run using GitHub's API: exact current main,
   successful push event, original repository ID, and the actual CI workflow ID.
   Forks, PR events, failed tests and stale commits cannot release. Manual dispatch
   on main is available for recovery, but does not bypass CI.
3. Export the clean backend before obtaining short-lived Google credentials. Build
   without production secrets, push to the MP repository, and resolve its immutable digest.
4. The read-only `mp-backend-preflight` job checks migrations, encrypted integrations,
   durable media and Django production configuration with the new image.
5. Stage a `candidate` revision with zero production traffic. Verify database health,
   exact release header, public products and anonymous access denial to private quotes.
6. Recheck current main, then atomically move traffic to the tested revision. Repeat
   health checks. A failed/ambiguous promotion or failed live check restores the prior
   revision and checks its health. Remove only the temporary candidate tag.

Production runs are serialized and are not automatically cancelled mid-rollout.
Other service configuration, IAM/public access, runtime identity and secret references
are preserved. The pipeline cannot read Secret Manager directly, change IAM, create
service-account keys or use the database-owner credential.

## Keyless trust and permissions

GitHub environment `cloud-run-production` permits only the `main` branch.
Google pool `mp-github`, provider `github`, accepts only repository ID `1272027275`,
owner ID `114060186`, `refs/heads/main`, that environment, and the exact main-branch
`.github/workflows/deploy-cloud-run.yml` identity. Numeric IDs prevent name reuse.
The deployer impersonates `mp-github-deployer` using OIDC; there is no JSON key or
long-lived Google credential in GitHub secrets.

Grants are limited to the MP image repository, production Cloud Run service,
read-only preflight job, and acting as the existing runtime identity. A project
custom role supplies only operation-status/quota permissions needed by the CLI.
Do not grant project Editor/Owner or direct production secret access to the deployer.

## Database migrations and coordinated frontend changes

Pending migrations **block** automatic release. Apply reviewed, backwards-compatible
expand migrations separately with a temporary owner-authorized job, then rerun the
same commit. Destructive/contract migrations need an explicit maintenance/recovery
plan after old code is no longer in use. The CI deployer has no owner DB secret.

Render must have **Auto-Deploy off**, while the standby service remains running.
Otherwise its old startup command can independently migrate the shared database.
Keep Render for rollback and the previously registered Zoho OAuth callback until
that provider registration moves to a stable MP-domain callback.

Vercel keeps its existing frontend deployment integration; this workflow does not
change its protection/gates or deploy the frontend. API changes must be backwards
compatible with the current frontend. For a breaking coordinated release, stage
the frontend without domain assignment, release the compatible backend, test the
staged frontend, then promote it. Do not rely on simultaneous independent deploys.

## Operations

Use Actions → **Cloud Run production** to inspect releases. Successful logs contain
the exact commit, revision, prior revision and public website URL, never credentials.
If preflight fails, leave production alone and inspect the aggregate job result.
If rollback cannot be confirmed, check service health and traffic immediately.
Never restore the previous compromised database as a runtime rollback.

Resource/budget limits remain on the service: one CPU, 512 MiB, concurrency two,
zero minimum instances, one service-level maximum instance. The USD10 budget is
an alert, not a spending cap. No paid-plan upgrade is part of this automation.
