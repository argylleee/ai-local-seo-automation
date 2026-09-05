# 06_send_report

## Purpose

Periodically send a summary of a business's SEO score history, open
issues by category, and recommendation status — the same data already
shown on the in-app Reports page (`apps/web/app/reports/page.tsx`),
delivered on a schedule instead of requiring a login to view.

## Trigger

Schedule node — weekly or monthly, whichever cadence is actually useful
to read (a weekly SEO report for a small local business will mostly
repeat itself; monthly is a reasonable default). Built as monthly
(1st of the month, 08:00).

## Inputs

- `businessId` — same static-value approach as workflows #1/#3.
- Telegram chat ID — the developer's own, since this is a personal
  status report, not customer-facing communication (no
  unsubscribe/consent handling needed — see `docs/security.md`'s scope).

## Build (node by node)

Already built on the developer's n8n instance — see `n8n/docs/00_overview.md`
for the workflow ID/URL and the setup steps still needed before
activating. A sticky note on the workflow explains why it doesn't
report to automation-run-events. It follows the shape below:

1. **Schedule Trigger.**
2. **HTTP Request** — `GET <APP_URL>/api/internal/businesses/{{businessId}}/report-summary`
   Auth: `httpTemplatedCustomAuth` credential ("Local SEO Internal Secret") sending `x-internal-secret`.
   Response: `{ business: { id, name }, scoreHistory, issuesByCategory, recommendationCounts }`
   — the same data `app/reports/page.tsx` shows, via the shared
   `lib/report-summary.ts` helper so the two never drift apart.
3. **Code node** — formats the JSON response into a plain-text message
   (score history lines, open-issues-by-category lines, a
   recommendation-status summary line).
4. **Telegram (Send Message)** — reuses the instance's existing
   Telegram credential; no SMTP setup needed. Switch this to email/Slack
   later if preferred — the Code node's output is channel-agnostic text.
5. Does **not** report to the automation-run-events endpoint — see
   "No run tracking" below.

## No run tracking

Unlike workflows #1/#3, nothing creates an `automation_runs` row for a
plain report-send (those two get one for free from
`createRunningAudit`). This workflow won't show up on the Dashboard's
"Recent automation runs" card. If you want that, a small new endpoint
that creates+completes an `automation_runs` row around this workflow
would be needed — not built, since it wasn't asked for.

## Credentials required

- `httpTemplatedCustomAuth` credential ("Local SEO Internal Secret") —
  shared with workflows #1/#3.
- Telegram credential (already exists on the instance).

## Rate limits

None meaningful at this volume (one message, on a schedule you control).

## Idempotency strategy

None needed — there's no automation_runs row or idempotency key in
play for this workflow (see "No run tracking" above). A retried/duplicate
send is low-stakes: one extra Telegram message to yourself, not a
customer-facing side effect.

## Failure behavior

If the report-summary fetch fails, the Code node still runs and
produces a message describing the failure (status code + response
body) instead of crashing on missing fields — so you get a Telegram
message either way, telling you *something* went wrong rather than
silently producing nothing.

## Database tables touched

None written by this workflow — `report-summary` is read-only.
