# Operational monitoring

This is separate from `website-traffic` analytics. Browser consent, Do Not Track,
GPC, blocked analytics and known-bot filtering do not disable backend security or
health observations. No browser tracking identifier is reused.

## Scope

- `/admin/monitorizacao`: health, security and business operations. The existing
  traffic report remains separate. `observability.view` is granted only to owner
  and administrator roles; content/reception/production/finance cannot read it.
- `GET /api/observability/report/`: authenticated management report. Periods:
  1, 24 or 168 hours; categories: all/security/health; 20 groups per page.
- Middleware generates `X-Request-ID` itself and ignores incoming IDs. Healthy
  health probes and monitoring reports are excluded from counters.
- One persistent counter row per backend minute: requests, 5xx, refused accesses,
  429s, total/max processing time and requests taking at least 2 seconds.
- Incident groups retain only minute, fixed event code, code-owned route NAME,
  method, status, count, most recent request ID and timestamp. Unmatched paths
  become `unmatched`. No request bodies, raw URLs, query strings, IPs, user agents,
  authorization headers, user/account IDs or visitor/session identifiers.
- Per-request database work is synchronous (normally a bucket lookup and atomic
  increment; incidents add grouped writes). This should be load-tested before
  high-volume traffic; it is not an out-of-process telemetry pipeline.
- Logging/storage failures are caught after the application response. A sampled
  `monitoring_write_failed` console record indicates incomplete telemetry.
  Database latency can still add overhead; this is not an uptime guarantee.

Business counts come from actual quote/order dates, not browser actions or
attribution. They cover all intake channels. Approved proposals count the saved
price-approval timestamp, not all historical approval/reversal transitions.

## Enable and migrate

Apply migration `core.0019_operational_monitoring` before enabling the feature.
`OBSERVABILITY_ENABLED` defaults to true outside DEBUG and false in DEBUG. Set it
explicitly in each deployment environment. No credentials or paid service are
required for the internal page and notifications.

Initial alert rules use five minute-buckets (the current minute plus four):

| Code | Threshold |
| --- | ---: |
| server_error | 5 |
| access_denied | 20 |
| login_rejected | 10 |
| rate_limited | 10 |
| link_invalid | 20 |

These are triage signals, not attack classifications. Login rejections include
validation failures, not only wrong passwords. Expired/revoked/replaced/outdated
art links are distinct and do not count as invalid-link alerts. Alerts create an
internal notification for authorized active managers and a safe console entry.
Deduplication uses fixed 30-minute windows; a burst spanning a window boundary can
produce two notifications close together. Existing rate limits are unchanged.

## Retention and external coverage

Counters/alert records: 30 days. Grouped incidents: 14 days. Cleanup is
opportunistic on observed requests, at most daily. Without activity, records await
cleanup. Schedule `python manage.py purge_monitoring` daily in the deployment
platform for independent enforcement. Existing portal notification history has
its own lifecycle and is not deleted by this command.

Console security events are sampled per minute/code/route/method/status, per cache
scope; database group counts retain observed totals. Group IDs identify only the
last occurrence, not a complete per-request trace archive.

Sentry is optional and configured only if the existing DSN is present. Default PII
is disabled. External event filtering keeps bounded technical metadata and source
locations, removes request payloads/URLs/headers, users, breadcrumbs, messages,
stack locals and spans, and preserves the prior email OAuth exclusion. Exception
messages are deliberately withheld. Delivery and external alert rules are NOT
verified by configuration presence.

Not covered: Vercel-only failures/cache hits/firewall blocks, complete host logs,
external uptime, background-task health, or off-platform email/SMS alerts. Review
hosting log redaction separately; this feature does not claim to sanitize every
platform access log. The dashboard must display these gaps, disabled/empty states,
the snapshot time, and a stale snapshot if refresh fails. Manual refresh is the
default; optional 60-second refresh pauses while the page is hidden.

Production Django HTTP console records are rewritten to a route name, status and
generated request ID; raw request paths and exception messages are withheld.
Development diagnostics are unchanged. This does not configure Gunicorn,
Render/Vercel access logs or third-party log drains.

## Remaining activation work

1. Release the reviewed migration/backend/frontend together when authorized.
2. Schedule independent cleanup and verify the task executes.
3. Connect platform errors/firewall logs and an external uptime probe; choose an
   owner-approved alert destination before enabling outgoing notifications.
4. Verify Sentry delivery with a non-sensitive synthetic event, if configured.
5. Baseline traffic, adjust triage thresholds, and load-test collection overhead.

No production credentials or customer records are required for local tests.
