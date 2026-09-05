# n8n Workflow Overview

Per `docs/n8n.md`'s "Agent-built workflows" standing exception (in
effect since 2026-09-06), the three unblocked workflows below were
built directly on the developer's self-hosted n8n instance via n8n MCP
tooling, using the n8n Workflow SDK (a restricted TypeScript DSL, not
raw workflow-export JSON — an earlier attempt at hand-writing export
JSON didn't import cleanly). All three were created **inactive**, per
the exception's boundary — activation stays a manual, developer-only
step.

| Workflow | n8n workflow ID | URL |
|---|---|---|
| `01_sync_search_console` | `1cffpi7WntTUYn84` | https://aldreisantua-n8n.duckdns.org/workflow/1cffpi7WntTUYn84 |
| `03_crawl_website` | `xVZ8AYyrf9p1c3pM` | https://aldreisantua-n8n.duckdns.org/workflow/xVZ8AYyrf9p1c3pM |
| `06_send_report` | `BQqdC0PNXogBaoph` | https://aldreisantua-n8n.duckdns.org/workflow/BQqdC0PNXogBaoph |

Each notifies via **Telegram** (an existing credential on the
instance — no SMTP setup needed) and authenticates its HTTP Request
node against the app's internal endpoints via a
`httpTemplatedCustomAuth` credential named **"Local SEO Internal
Secret"** (created as an empty shell only — no secret value was set by
the agent, per the exception's credential boundary).

## Before activating any of these (developer steps, not done by the agent)

1. Open the **"Local SEO Internal Secret"** credential (shared across
   all three workflows) and set its header template to send
   `x-internal-secret` with the same value as `N8N_INTERNAL_SECRET` in
   the app's environment.
2. Open each workflow's **"Config"** node and replace both placeholder
   values — `appUrl` (once you've deployed to Vercel/Neon — see the
   rest of this session's guidance) and `businessId` (a real UUID from
   the app's Businesses page).
3. Open each Telegram node and replace the chat-ID placeholder with
   your own (DM `@get_id_bot` on Telegram to find it).
4. Review every node, then activate the workflow yourself in the n8n UI.

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
