# n8n Workflow Overview

Per `docs/n8n.md`: the developer builds every workflow by hand in n8n.
This directory only documents designs for review/import — nothing here
was created, imported, or activated in a live n8n instance by an agent.

`n8n/examples/01_sync_search_console.json`, `03_crawl_website.json`,
and `06_send_report.json` are ready-to-import workflow files for the
three workflows that are unblocked (see the status table below). In
n8n: **Workflows → Import from File** → pick one → review every node
before activating. Each has a `Business ID` (and, for #6, recipient
email) Set node at the top with a `REPLACE_WITH_...` placeholder value
— edit that before running. #6 also needs an SMTP credential attached
to its Send Email node (`REPLACE_WITH_YOUR_SMTP_CREDENTIAL_ID`). All
three assume your n8n instance can read `$env.APP_URL` and
`$env.N8N_INTERNAL_SECRET` — set those as environment variables on the
n8n process itself (self-hosted n8n allows `$env` access to process
env vars by default; if `N8N_BLOCK_ENV_ACCESS_IN_NODE` is set, use an
n8n credential instead of `$env` in the header value).

## Status of the 6 documented workflows

`docs/n8n.md` names 6 example workflows. Mapping them against what's
actually built in `apps/web` today:

| Workflow | Status | Notes |
|---|---|---|
| `01_sync_search_console` | **Ready to build in n8n** | Business logic fully built (`lib/search-console-sync.ts`); trigger endpoint `POST /api/internal/businesses/:id/search-console-sync` is live. |
| `02_sync_gbp` | **Blocked** | GBP API access is pending Google's approval (`docs/integrations.md`). Nothing to build until then — see `02_sync_gbp.md` for the design to build once approved. |
| `03_crawl_website` | **Ready to build in n8n** | Business logic fully built (`lib/website-audit-sync.ts`, `apps/crawler`); trigger endpoint `POST /api/internal/businesses/:id/website-audit` is live. |
| `04_analyze_reviews` | **Blocked** | Reviews only exist in this schema via `google_business_profile` (blocked, same as #2) or manual import — and there's no manual review-entry UI yet (unlike Competitors/Local Visibility, which do have one). Needs either GBP approval or a new manual-import UI before this workflow has anything to run against. |
| `05_generate_recommendations` | **Already handled — no separate workflow needed** | Recommendation generation is already embedded in the audit pipeline (`lib/audit-shared.ts` calls `generateRecommendation` synchronously as part of #1 and #3). A standalone n8n workflow for this would just be racing the same DB rows. Documented in `05_generate_recommendations.md` for why it's intentionally folded in, not as a build spec. |
| `06_send_report` | **Ready to build in n8n** | Read-only data endpoint `GET /api/internal/businesses/:id/report-summary` is live; you still need to add an SMTP credential in n8n and build the Send Email node yourself. |

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

## Service-authenticated trigger endpoints (built)

`POST /api/audits` and the "Run website audit" button both require a
signed-in browser session (`auth()` in `apps/web/lib/auth.ts`) — correct
for user-initiated runs, but n8n has no session and shouldn't be given
one. Three endpoints now exist specifically for n8n, all authenticated
with `x-internal-secret` + `N8N_INTERNAL_SECRET` (constant-time
compare, fails closed if unset — `apps/web/lib/internal-service-auth.ts`):

- `POST /api/internal/businesses/:id/search-console-sync` (workflow #1)
- `POST /api/internal/businesses/:id/website-audit` (workflow #3)
- `GET /api/internal/businesses/:id/report-summary` (workflow #6)

All three are covered by tests and were verified as part of the full
monorepo pipeline (typecheck/lint/unit tests/build), same as everything
else in this codebase — nothing here was touched on any live n8n
instance, only the app-side HTTP endpoints n8n will call into.
