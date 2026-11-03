# Reception: expiring proposals and commitments

Attention is computed, not a manually dismissible status. Requested dates in the
briefing are never treated as confirmed promises. Closed/cancelled work is excluded.

- **Propostas expiradas:** sent (or legacy quoted), not accepted, no operational
  order, validity date strictly before the current Maputo date. Validity today is
  still valid, with a warning. Acceptance/order creation ends proposal-expiry flags.
- **Em atraso:** an uncompleted follow-up on a previous local date or an unfulfilled
  confirmed delivery datetime already passed, including earlier today.
- **Em risco:** sent proposal validity or an outstanding follow-up approaching its
  calendar deadline, or incomplete production/art approaching confirmed delivery.
  The risk filter excludes jobs already expired/overdue; individual jobs can show
  multiple reasons for separate commitments. Ready-for-delivery work is not marked
  at risk solely because delivery is approaching; it becomes overdue if not fulfilled.

`RECEPTION_RISK_WINDOW_HOURS` configures the window, default 48, clamped to 1–168;
invalid values fall back to 48. Delivery timestamps use the exact window. Date-only
proposal/follow-up deadlines use the Maputo calendar date reached by that window,
not an invented hour. Changes take effect after the backend reload/redeploy.

Reception overview, task filters and workdesk payloads share these rules. Kanban
shows badges without adding a parallel stage. Non-commercial production viewers
do not receive Reception follow-up flags/notes. Clients do not receive workdesk data.

`POST /api/reception/{reference}/resolve-attention/` requires reception.manage,
an active edit lease, a permitted action and a reason/outcome of at least five
characters. The quote and linked order are locked for the transaction. Actions:

- complete a follow-up (not the job/delivery), or reschedule it;
- revise an expired proposal with a selected 7/15/30/60-day duration;
- close an expired, unaccepted request without cancelling an operational order;
- escalate to a capability-authorised internal team, with a next follow-up date;
- request a future delivery date and set when Reception will follow up.

Proposal revision also requires quotes.manage. The old snapshot/expiry remain in
proposal history, and preparation invalidates old approval links immediately.
No validity is extended on the old sent version; the new validity starts only on
the normal reviewed send transition. No email/WhatsApp message is sent automatically.

Delivery requests never change scheduled_date. The delivery team receives an in-app
notification and records any actual change in its existing authorised workspace.
Both the request and actual date update retain the prior confirmed commitment.
Team notices contain only reference/attention routing and any proposed delivery time, not free-text commercial
reasons; those remain in Reception's internal activity history. This is not a new
team task-assignment, acknowledgment or external alerting system.

All resolutions record actor, outcome/reason, prior follow-up date/note and any
confirmed delivery date. Expiry/delivery flags remain until their underlying state
is resolved. The older follow-up form cannot silently clear an overdue follow-up:
it directs staff to the resolution panel. Ordinary non-overdue follow-up changes
also preserve their original date/note and return refreshed attention flags without
reloading/discarding an in-progress proposal editor.
