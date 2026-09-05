# 06_send_report

## Purpose

Periodically email a summary of a business's SEO score history, open
issues by category, and recommendation status — the same data already
shown on the in-app Reports page (`apps/web/app/reports/page.tsx`),
delivered on a schedule instead of requiring a login to view.

## Trigger

Schedule node — weekly or monthly, whichever cadence is actually useful
to read (a weekly SEO report for a small local business will mostly
repeat itself; monthly is a reasonable default).

## Inputs

- `businessId` — same static-value approach as workflows #1/#3.
- Recipient email address — n8n workflow parameter (this is *your*
  report, not a customer-facing email, so no unsubscribe/consent
  handling is needed — see `docs/security.md`'s scope, this isn't
  external business communication).

## Build (node by node)

Ready-to-import: `n8n/examples/06_send_report.json` (note included
about why this workflow doesn't report to automation-run-events — see
that file's sticky note). The steps below explain what's in that file.

1. **Schedule Trigger.**
2. **HTTP Request** — `GET <APP_URL>/api/internal/businesses/{{businessId}}/report-summary`
   Header: `x-internal-secret: {{$env.N8N_INTERNAL_SECRET}}`
   Response: `{ business: { id, name }, scoreHistory, issuesByCategory, recommendationCounts }`
   — the same data `app/reports/page.tsx` shows, via the shared
   `lib/report-summary.ts` helper so the two never drift apart.
3. **Set/Code node** — format the JSON response into an email body
   (n8n's expression editor is enough for a simple text/HTML summary;
   no templating library needed).
4. **Send Email node** — n8n's built-in SMTP node. Free options: your
   own Gmail account via an app password, or any SMTP relay you already
   have — no paid email service needed for a single-recipient report.
5. Report success/failure via the automation-run-events endpoint (this
   workflow owns its own `automation_runs` row, same reasoning as #4 —
   there's no existing function that manages one for "send an email").

## Credentials required

- `N8N_INTERNAL_SECRET`.
- SMTP credential (n8n credential store) — whatever mail account you
  choose to send from.

## Rate limits

None meaningful at this volume (one email, on a schedule you control).

## Idempotency strategy

Key the events call's `idempotencyKey` on the n8n execution ID, per the
shared mechanism in `00_overview.md` — guards against n8n retrying the
whole workflow (e.g. after a transient SMTP failure) and reporting the
same "succeeded" event twice, which would otherwise be harmless anyway
since a report send has no other side effect to duplicate. The real
value of idempotency here is just keeping `automation_runs` accurate,
not preventing a double-send (which is low-stakes for a report only you
receive).

## Failure behavior

SMTP failures are usually transient — a bounded retry (1–2 attempts,
n8n's "Retry On Fail") is reasonable here, unlike the crawl/sync
workflows where most failure codes won't succeed on retry.

## Database tables touched

None written by this workflow — `report-summary` is read-only. Only
`automation_runs` / `notifications` get written, via the events
callback.
