# n8n Workflow Overview

Per `docs/n8n.md`: the developer builds every workflow by hand in n8n.
This directory only documents designs for review/import — nothing here
was created, imported, or activated in a live n8n instance by an agent.

## Status of the 6 documented workflows

`docs/n8n.md` names 6 example workflows. Mapping them against what's
actually built in `apps/web` today:

| Workflow | Status | Notes |
|---|---|---|
| `01_sync_search_console` | **Ready**, needs 1 new endpoint | Business logic fully built (`lib/search-console-sync.ts`); needs a service-authenticated trigger endpoint since the existing `POST /api/audits` is session-cookie authenticated, not callable by n8n. |
| `02_sync_gbp` | **Blocked** | GBP API access is pending Google's approval (`docs/integrations.md`). Nothing to build until then — see `02_sync_gbp.md` for the design to build once approved. |
| `03_crawl_website` | **Ready**, needs 1 new endpoint | Business logic fully built (`lib/website-audit-sync.ts`, `apps/crawler`); same trigger-endpoint gap as #1. |
| `04_analyze_reviews` | **Blocked** | Reviews only exist in this schema via `google_business_profile` (blocked, same as #2) or manual import — and there's no manual review-entry UI yet (unlike Competitors/Local Visibility, which do have one). Needs either GBP approval or a new manual-import UI before this workflow has anything to run against. |
| `05_generate_recommendations` | **Already handled — no separate workflow needed** | Recommendation generation is already embedded in the audit pipeline (`lib/audit-shared.ts` calls `generateRecommendation` synchronously as part of #1 and #3). A standalone n8n workflow for this would just be racing the same DB rows. Documented in `05_generate_recommendations.md` for why it's intentionally folded in, not as a build spec. |
| `06_send_report` | **Ready**, needs 1 new endpoint | No email/report-delivery mechanism exists yet — needs a small new endpoint to expose report data for n8n to format and send. |

## Two shared mechanisms (already built, no code changes needed)

**Reporting run status back to the app** — every workflow that starts a
tracked run should call this when it finishes (or fails):

```
POST <APP_URL>/api/internal/automation-runs/:automationRunId/events
Header: x-internal-secret: <N8N_INTERNAL_SECRET>
Body: { "eventType": "succeeded" | "failed" | "progress" | "started",
        "idempotencyKey": "<unique per attempt, e.g. n8n execution ID>",
        "payload": { "message": "..." } }
```

Replays with the same `idempotencyKey` are no-ops (enforced by a unique
constraint on `automation_run_events` — see `apps/web/lib/automation-run-events.ts`).

**Where `automationRunId` comes from**: for workflows #1 and #3, the app
itself already creates the `automation_runs` row synchronously the
moment the audit starts (`lib/audit-shared.ts::createRunningAudit`) and
updates it to succeeded/failed when the audit function returns — so for
those two, n8n doesn't need to call the events endpoint at all. The
trigger endpoint's response already tells n8n whether it succeeded.
Only genuinely async/external-driven workflows (a future GBP webhook,
or anything n8n itself owns the lifecycle of) need the events callback.

## Gap: a service-authenticated trigger endpoint

`POST /api/audits` and the "Run website audit" button both require a
signed-in browser session (`auth()` in `apps/web/lib/auth.ts`) — that's
correct for user-initiated runs, but n8n has no session and shouldn't
be given one. Workflows #1, #3, and #6 all need a small new endpoint
authenticated the same way as the existing internal callback
(`x-internal-secret` + `N8N_INTERNAL_SECRET`, constant-time compare).

This is a code change in `apps/web`, not an n8n workflow — I haven't
built it since it wasn't in scope for "design the n8n side," but it's a
prerequisite before any of these workflows can actually call in. Ask
for it explicitly (e.g. "build the internal trigger endpoints") when
you're ready — it's a small, low-risk addition following the exact
pattern already reviewed and shipped for the events endpoint.
