# One journey, audience-specific workspaces

`apps.core.job_workflow.job_journey` derives the journey from existing quote,
order, reception completion and current artwork-readiness state. It does not add
a competing status field or mutate records while reading them. The same public-safe
`journey` object is returned in staff/client quote and order serializers.

Stages: briefing → proposal → client decision → art → art approval → production
→ ready for delivery → delivered. Optional art stages are explicitly skipped.
Saved proposals are not treated as sent. A current proof awaiting a decision is
distinct from artwork preparation/revision; changed technical details invalidate
the old approval via the existing fingerprint. Production readiness without art
is shown within Production, with its existing start action in Operações.

The read-only `/api/workflow/board/` requires orders.view. It combines quote-linked
jobs once, plus standalone orders. Users without quotes.view see only accepted
operational jobs and no reception follow-up dates. The payload uses a whitelist,
not commercial serializers. No prices, payments, margins, contact emails, private
notes, employee identity, draft artwork or documents are returned by the board.
Client access to job objects continues to use the existing ownership rules.

Board search/stage/page state is URL-backed. Manual refresh, generation time and
stale/error states are explicit; a failed new filter never relabels old results.
Up to 80 cards are sent per page; headings show loaded/total counts per stage.
Counts are global within the search and visible scope, not just the current page.
Currently counts/classification derive active records in Python using prefetched
technical metadata. Large deployments should move this to a denormalised indexed
projection; do not claim constant-cost server work merely because cards paginate.

The desktop board scrolls horizontally; narrow screens stack readable columns
and offer a stage selector, search and keyboard-accessible links. No drag/status
mutation exists: opening a card routes to Reception, Operações or Entregas and
retains all existing server transition/approval gates. Refresh is not real-time push.

Reception's eight-stage navigation shares the backend journey and can inspect art,
production and delivery without an editing lease. Published art previews use the
existing authenticated file route; draft files stay inaccessible to reception.
Reception does not gain art/production mutation capabilities. Summary, messages,
logs and follow-ups remain on-demand context tools. BrandDesk uses the same stages,
including optional-art skips, without internal workdesk details.
