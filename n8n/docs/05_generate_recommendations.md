# 05_generate_recommendations

## Status: already handled — do not build as a separate workflow

`docs/n8n.md` lists this as one of the 6 example workflows, but the
actual implementation folded it into the audit pipeline instead of
keeping it as a separate step, and it's worth documenting why rather
than building a redundant workflow just to match the example list.

## Why it's folded in

`lib/audit-shared.ts::completeAuditWithIssues` already:

1. Persists detected `seo_issues` from the deterministic rule engine.
2. Sorts them by severity (`SEVERITY_PENALTY`).
3. Calls `generateRecommendation` (the same Groq → Gemini → Ollama →
   deterministic fallback chain) for the top 5 highest-severity issues.
4. Persists the results to `recommendations`.

This runs synchronously as the last step of both
`01_sync_search_console` and `03_crawl_website` — by the time either of
those workflows' trigger endpoints returns, recommendations already
exist for that audit.

## Why not split it out anyway

A separate `05_generate_recommendations` workflow would have to:
- either re-scan `seo_issues` for ones missing a `recommendations` row
  (redundant work, and a race if it runs while an audit is still
  writing issues), or
- be the *only* place recommendations get generated — which would mean
  ripping the generation call out of `audit-shared.ts` and making
  audits complete without recommendations until this workflow runs
  later. That's a worse user experience (a completed audit with no
  recommendations for minutes/hours) for no real benefit, since
  recommendation generation is fast and already bounded (max 5 AI
  calls per audit).

If a future need arises to decouple these (e.g. recommendation
generation starts taking long enough to want it off the audit's
critical path), that's a deliberate architecture change to
`audit-shared.ts` — flag it as its own task rather than trying to route
around it from the n8n side.

## Database tables touched

None directly by n8n — `recommendations` is written by
`lib/audit-shared.ts` as part of workflows #1 and #3.
