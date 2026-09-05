# 04_analyze_reviews

## Status: blocked

This workflow's job is to run `packages/ai`'s review-sentiment
capability (`analyzeReviewSentiment` — sentiment + topics + confidence,
with a deterministic bilingual-keyword fallback when no AI provider is
available) over reviews and persist the result to `review_analysis`.

The blocker isn't the AI step — that's fully built and tested
(`packages/ai/src/review-sentiment.ts`). It's that there's currently no
real source of review rows to analyze:

- The `reviews` table's default `provider`/`source` is
  `"google_business_profile"` — i.e. the intended real source is GBP,
  which is blocked on the same Google approval as `02_sync_gbp.md`.
- Unlike Competitors and Local Visibility, there's no manual
  review-entry UI yet, so there's also no fallback path to get real
  review text into the table today. (The seed script's review rows are
  dev fixtures only — never run against production, see
  `scripts/seed.ts`'s `guardAgainstProduction()`.)

## Two ways to unblock this (pick one, or do both later)

1. **Wait for GBP approval**, then build this alongside `02_sync_gbp`
   — GBP's own reviews API would populate `reviews` directly.
2. **Build a manual review-entry UI** (same pattern as
   `apps/web/app/competitors/`) so you can paste in reviews you've
   already seen on Google/Facebook by hand. This is a small, independent
   app-code task I can do now if you want it — it doesn't depend on n8n
   or GBP at all. Ask for it separately if you want reviews to work
   before GBP access comes through.

## Design, once reviews have a real source (either path above)

## Purpose

Find reviews with no `review_analysis` row yet, run sentiment
classification, persist the result.

## Trigger

Schedule node — daily, after whichever review-ingestion workflow (GBP
sync, or a manual-import batch) runs.

## Build (node by node)

1. **Schedule Trigger.**
2. **HTTP Request** — `POST <APP_URL>/api/internal/businesses/{{businessId}}/analyze-reviews`
   *(new endpoint, not built — would query `reviews` left-joined against
   `review_analysis` for unanalyzed rows, call `analyzeReviewSentiment`
   per row, insert results)*
   Header: `x-internal-secret: {{$env.N8N_INTERNAL_SECRET}}`
3. Report success/failure via the automation-run-events endpoint (this
   workflow would own its own `automation_runs` row, since — unlike
   #1/#3 — there's no existing synchronous "audit" function wrapping it).

## Credentials required

- `N8N_INTERNAL_SECRET` only. AI provider credentials
  (`GROQ_API_KEY` / `GEMINI_API_KEY` / Ollama) stay inside the app —
  n8n never calls Groq/Gemini directly, same reasoning as why n8n
  doesn't hold Search Console tokens: the app already owns that
  fallback chain (`packages/ai`), duplicating it in n8n would mean two
  places to keep in sync.

## Rate limits

Batch size matters more than call frequency here — cap how many
reviews get analyzed per run (mirror the existing
`MAX_RECOMMENDATIONS_PER_AUDIT = 5` pattern in `lib/audit-shared.ts`)
to stay comfortably within Groq's free-tier rate limits even if a
business has a large backlog of unanalyzed reviews.

## Idempotency strategy

Natural: only reviews with no existing `review_analysis` row are
selected, so a retried/duplicate run is a no-op — nothing to key on
explicitly.

## Database tables touched

`review_analysis`, `automation_runs`, `notifications`.
