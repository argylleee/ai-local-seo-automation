import { confidenceFromImpressions } from "../confidence";
import type { NormalizedSearchRow, SeoIssueCandidate } from "../types";

/**
 * "Striking distance" is a standard SEO industry term for queries
 * ranking just off page one (positions 11–20) with real search volume
 * — the lowest-effort ranking gains usually come from these, not from
 * new content. Unlike HIGH_VISIBILITY_LOW_CTR this isn't about CTR at
 * all — it's a content/on-page opportunity regardless of current CTR.
 */
export const STRIKING_DISTANCE_CONFIG = {
  minPosition: 11,
  maxPosition: 20,
  minImpressions: 30,
};

export function detectStrikingDistanceKeyword(row: NormalizedSearchRow): SeoIssueCandidate | null {
  const { minPosition, maxPosition, minImpressions } = STRIKING_DISTANCE_CONFIG;

  if (row.position < minPosition || row.position > maxPosition) return null;
  if (row.impressions < minImpressions) return null;

  // Closer to position 11 and more impressions both make the
  // opportunity larger — this is a heuristic ranking, not a probability.
  const proximity = (maxPosition - row.position) / (maxPosition - minPosition);
  const severity = proximity >= 0.66 ? "medium" : "low";

  return {
    category: "KEYWORDS",
    code: "STRIKING_DISTANCE_KEYWORD",
    severity,
    confidence: confidenceFromImpressions(row.impressions),
    evidence: {
      query: row.query,
      page: row.page,
      position: row.position,
      impressions: row.impressions,
    },
  };
}
