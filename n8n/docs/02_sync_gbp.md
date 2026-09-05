# 02_sync_gbp

## Status: blocked

Google Business Profile API access requires separate developer
eligibility approval from Google (`docs/integrations.md`). This is
free, not paid — just gated and not guaranteed on any timeline. Do not
build this workflow until access is actually granted.

In the meantime, the app already has a manual fallback: the Local
Visibility page's "Log a visibility snapshot" form
(`apps/web/app/local-visibility/`) lets you record map-pack position,
profile views, search views, clicks, and direction requests by hand,
with `source = "manual"`.

## Design, once GBP access is approved

## Purpose

Sync Business Profile Insights (views, clicks, calls, direction
requests) and location/map-pack signals into the same
`business_visibility_snapshots` table the manual form already writes
to — just with `source = "google_business_profile"` instead of
`"manual"`. No schema change needed; this was designed in from the
start (see the comment in `packages/db/src/schema/visibility.ts`).

## Trigger

Schedule node — daily or weekly (GBP Insights data updates with a
delay of its own; check the actual API docs once you have access,
since Google's documented lag may have changed).

## Build (node by node), once approved

1. **Schedule Trigger.**
2. **Google Business Profile node** (or HTTP Request against the GBP
   API directly) — n8n holds its own GBP OAuth credential here. This is
   the one workflow where n8n legitimately owns a Google credential
   directly, per `docs/architecture.md`'s "n8n retrieves source data"
   responsibility — unlike Search Console, where the app already owns
   token storage/encryption per business and n8n should go through it
   instead of duplicating that.
3. **HTTP Request** — `POST <APP_URL>/api/internal/businesses/{{businessId}}/visibility-snapshots`
   *(a new endpoint — doesn't exist yet, and shouldn't be built until
   this workflow is actually being built, since its exact shape depends
   on the real GBP Insights response format)*
   Header: `x-internal-secret: {{$env.N8N_INTERNAL_SECRET}}`
   Body: one entry per metric (`metricType`, `value`, `capturedAt`,
   `source: "google_business_profile"`).
4. Report success/failure via the automation-run-events endpoint
   (this one *does* need it, since — unlike #1/#3 — the trigger
   endpoint would just be a thin insert, not something that manages
   its own `automation_runs` lifecycle).

## Credentials required

- n8n-managed Google OAuth credential with GBP scopes (separate from
  the app's own Search Console OAuth credential).
- `N8N_INTERNAL_SECRET`.

## Idempotency strategy

Key on `(businessId, metricType, capturedAt)` — the new endpoint should
upsert rather than blindly insert, so a retried sync doesn't create
duplicate snapshot rows for the same day/metric.

## Database tables touched

`business_visibility_snapshots`, `automation_runs`, `notifications`.
