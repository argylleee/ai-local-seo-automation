import type { NormalizedSearchRow } from "./types";

/**
 * MOCK DATA FOR TESTS ONLY. Never insert this into a real database or
 * display it as if it were a real business's data — see the "never
 * fabricate" rule in docs/integrations.md and AGENTS.md rule 12. This
 * exists purely to exercise the deterministic rules against realistic
 * shapes of Search Console data.
 */
export const MOCK_SEARCH_ROWS: NormalizedSearchRow[] = [
  // Ranks well (position 6) but gets far fewer clicks than expected —
  // should trigger HIGH_VISIBILITY_LOW_CTR.
  {
    query: "sari sari store near me",
    page: "https://example.ph/",
    impressions: 500,
    clicks: 5,
    ctr: 0.01,
    position: 6.2,
  },
  // Just off page one with decent volume — should trigger
  // STRIKING_DISTANCE_KEYWORD.
  {
    query: "grocery delivery quezon city",
    page: "https://example.ph/delivery",
    impressions: 300,
    clicks: 3,
    ctr: 0.01,
    position: 13.5,
  },
  // Top position with CTR at/above benchmark — clean, no issue.
  {
    query: "example sari sari store",
    page: "https://example.ph/",
    impressions: 200,
    clicks: 45,
    ctr: 0.225,
    position: 2.0,
  },
  // Would match HIGH_VISIBILITY_LOW_CTR's position/CTR gap, but
  // impressions are below the minimum threshold — should NOT fire.
  {
    query: "obscure long tail query",
    page: "https://example.ph/",
    impressions: 10,
    clicks: 0,
    ctr: 0,
    position: 7,
  },
];
