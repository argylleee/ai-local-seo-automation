# 03_crawl_website

## Purpose

Periodically crawl a business's own website, run it through
`packages/seo-engine`'s technical/on-page rules, and generate
AI-worded recommendations for the highest-severity issues — the
crawler-fed half of the audit pipeline (sibling to
`01_sync_search_console`, which is the Search-Console-fed half).

## Trigger

Schedule node — weekly is plenty; a site's technical SEO signals
(missing meta tags, thin content, noindex, etc.) don't usually change
day to day the way Search Console metrics do.

## Inputs

- `businessId` — same static-value approach as `01_sync_search_console`.

## Build (node by node)

1. **Schedule Trigger** — weekly cron.
2. **HTTP Request** — `POST <APP_URL>/api/internal/businesses/{{businessId}}/website-audit`
   Header: `x-internal-secret: {{$env.N8N_INTERNAL_SECRET}}`
   *(this endpoint doesn't exist yet — see `00_overview.md`'s "Gap"
   section; it would be a thin wrapper around the already-built
   `lib/website-audit-sync.ts::runWebsiteAudit`)*
3. **IF** — branch on HTTP status, same pattern as workflow #1:
   - 2xx → success notification with `issueCount` / `recommendationCount`.
   - non-2xx → failure notification with the error body's `code`/`message`.
4. No automation-run-events call needed, same reasoning as #1 —
   `runWebsiteAudit` already manages the `automation_runs` row
   synchronously.

## Credentials required

- `N8N_INTERNAL_SECRET` only. The crawler (`apps/crawler`) runs inside
  the app's own process/deployment — n8n never fetches the target
  website itself, so none of the SSRF-guard logic needs to exist on
  the n8n side.

## Rate limits

None external — this only ever fetches the business's own site (one
page today; `apps/crawler` is single-page). Be considerate of that
site's own server load if you ever extend this to multi-page crawling
(add a delay between requests).

## Idempotency strategy

Same as #1 — each run creates a new `seo_audits` row; running twice
just produces two audits, which is expected, not a duplicate side
effect needing dedup.

## Failure behavior

The endpoint returns one of `WebsiteAuditError`'s codes
(`BUSINESS_NOT_FOUND`, `NO_WEBSITE`, `CRAWL_DISALLOWED`, `CRAWL_FAILED`).
`CRAWL_DISALLOWED` (robots.txt disallows it, or the URL resolved to a
blocked/private IP) and `NO_WEBSITE` won't succeed on retry — notify,
don't retry automatically. `CRAWL_FAILED` (network error, timeout) is
the one case where a single bounded retry (e.g. n8n's built-in
"Retry On Fail" with 1 retry) is reasonable.

## Database tables touched

`seo_audits`, `seo_issues`, `recommendations`, `automation_runs`,
`notifications` — via the existing, already-tested
`lib/website-audit-sync.ts` + `lib/audit-shared.ts`.
