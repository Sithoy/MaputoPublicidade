# Management overview

`/admin` reads `/api/management/overview/`. Requires `dashboard.view` and
`orders.view`; the shared workflow projection additionally restricts
pre-commercial records to `quotes.view`. No role grants changed.

## Current snapshot

- One job per quote/order pair; standalone orders count once. Cancelled and
  delivered jobs are excluded. Aggregates are not limited by board pagination.
- Five groups use the exact board mapping; detailed stages remain unchanged.
- Intervention counts are distinct jobs: overdue/expired first, then technical
  blockers, then near-deadline risk. All individual reasons remain visible.
  Waiting for proposal/art approval alone is not an exception.
- Shared deadline rules use confirmed commitments and the configured risk
  window, not client-requested dates. No separate escalation/task state is invented.
- Last update is the later of the quote and linked order update timestamps.
  Whole elapsed days since that update are **not** days spent in the stage and
  do not capture every message/proof event.
- Delivery horizon accepts 7/14/30 Maputo calendar days: inclusive today,
  exclusive today + N days. Earlier confirmed times today remain in the list
  and are flagged overdue. Older overdue deliveries remain in interventions.
- The horizon changes only the delivery list/count, not the active backlog,
  intervention totals, or workload groups. Operational jobs lacking a confirmed
  date have their own count; no dates are guessed.
- All rows can be reached in eight-row local pagination. Refresh is manual;
  failed refreshes retain a stale warning, and a different delivery horizon never
  displays a prior horizon's result as current.
- Responses are private/no-store. No mutations, automatic notifications, money,
  account totals, or revenue are included in this endpoint.

## Deliberate follow-ups

Financial reporting needs invoice/payment-ledger definitions, not quoted value
labelled as revenue. Conversion needs an agreed sent-proposal cohort. Stage
duration and on-time delivery need reliable stage-entry/completion and commitment
history. These are not calculated in this first operational management version.
