# 01_sync_search_console

## Purpose

Periodically pull the last 7 days of Google Search Console data for a
connected business, run it through the deterministic SEO rule engine,
and generate AI-worded recommendations for the highest-severity issues.

## Trigger

Schedule node — daily, e.g. `0 6 * * *` (06:00 Asia/Manila). Search
Console data lags by a few days, so daily is already more frequent than
the data changes; don't schedule it hourly.

## Inputs

- `businessId` — set as a workflow static value (or an n8n environment
  variable) per business you want synced. This project is single/small
  -tenant right now, so a hardcoded list of business IDs is simpler and
  more honest than building a "list all businesses" internal endpoint
  that only this workflow would ever call.

## Build (node by node)

1. **Schedule Trigger** — daily cron, see above.
2. **HTTP Request** — `POST <APP_URL>/api/internal/businesses/{{businessId}}/search-console-sync`
   Header: `x-internal-secret: {{$env.N8N_INTERNAL_SECRET}}`
   *(this endpoint doesn't exist yet — see `00_overview.md`'s "Gap" section)*
3. **IF** — branch on HTTP status:
   - 2xx → **success path**: optionally a Slack/email node summarizing
     `issueCount` / `recommendationCount` from the response body.
   - non-2xx → **failure path**: notification node with the error body
     (`{ error: { code, message } }` — the app never leaks stack traces
     here, so the message is always safe to forward as-is).
4. No call to the automation-run-events endpoint is needed for this
   workflow — the trigger endpoint's response already reflects the
   final state, because `runSearchConsoleSync` manages the
   `automation_runs` row synchronously before returning.

## Credentials required

- `N8N_INTERNAL_SECRET` (n8n credential/env var, matches the same value
  set in the app's environment).
- Nothing else — this workflow never talks to Google directly. The
  actual Search Console OAuth tokens stay where they already are:
  encrypted at rest in Postgres, decrypted only inside `apps/web`
  (`packages/integrations`). n8n never sees them.

## Rate limits

Search Console's API quota is per-property and generous for a single
daily read; no special handling needed beyond not scheduling more
often than daily.

## Idempotency strategy

Each scheduled run creates a new `seo_audits` row — running the same
business's sync twice in a day just produces two audits (the second
naturally supersedes the first as "latest completed" everywhere the UI
reads it). This isn't a "replay of an event" that needs dedup — it's
routine, so nothing here uses the `idempotencyKey` mechanism.

## Failure behavior

The endpoint returns one of the documented `SearchConsoleSyncError`
codes (`BUSINESS_NOT_FOUND`, `NOT_CONNECTED`, `SITE_NOT_MATCHED`) with
the matching HTTP status. n8n should notify (not retry automatically —
these are all "won't succeed on retry" errors; e.g. `NOT_CONNECTED`
means you need to reconnect Search Console in the app's Settings page,
not run the workflow again).

## Database tables touched

`seo_audits`, `seo_issues`, `recommendations`, `automation_runs`,
`notifications`, `search_console_metrics` — all via the existing,
already-tested `lib/search-console-sync.ts` + `lib/audit-shared.ts`.
n8n never writes to Postgres directly.
