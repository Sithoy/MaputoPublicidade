# Unified operational workspace

`/admin/operacoes` is the shared art and production desk. Existing Studio and
Production routes still open this workspace, including `?pedido=` links.
Delivery scheduling/completion remains in Entregas; ready jobs provide the handover.

The queue is server-filtered/searched, ten jobs per page. Counts cover all active,
authorised jobs, not just the current page. It includes art preparation, revisions,
client approval, approved/no-art jobs ready to start, production, and ready delivery.
Three-day artwork follow-ups are suggestions, not automatic messages or deadlines.

The same technical job record holds Reception's briefing, item configurations,
references/brand assets, art versions and execution notes. No duplicate briefing,
quote, or order is created by moving stages. The current approved artwork must
match the technical fingerprint before production starts. Missing items, blank
descriptions or non-positive quantities also prevent starting, server-side.
Other service-specific details remain subject to the existing briefing; this is
not a claim that all possible technical requirements are automatically validated.

Permissions are unchanged: production.view for the queue, quotes.artwork for art
mutations, orders.manage_status for production transitions. Financial serializers,
commercial PDFs and finance APIs remain outside the production role. Production
receives the explicit technical field whitelist, not a filtered commercial object.
Free-text briefings and uploaded client files are still human-provided content;
staff must avoid putting confidential pricing in technical notes or references.

Existing artwork publishing, client decisions and order status transitions retain
their activity logs and client notifications. This UI does not add a separate
assignment/locking system or a new persistent quality-control stage; marking ready
continues to mean production has checked the work before delivery coordination.
