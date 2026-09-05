import { confidenceFromImpressions } from "../confidence";
import { getExpectedCtr } from "../thresholds";
import type { NormalizedSearchRow, SeoIssueCandidate } from "../types";

/**
 * The exact example rule from docs/seo-engine.md:
 *
 *   IF average_position >= 4 AND <= 15 AND impressions >= threshold
 *   AND CTR < expected_ctr THEN HIGH_VISIBILITY_LOW_CTR
 *
 * The business already ranks reasonably well for this query but isn't
 * getting the clicks that position would normally earn — usually a
 * title/meta-description or snippet problem, not a ranking problem.
 */
export const HIGH_VISIBILITY_LOW_CTR_CONFIG = {
  minPosition: 4,
  maxPosition: 15,
  minImpressions: 50,
};

export function detectHighVisibilityLowCtr(row: NormalizedSearchRow): SeoIssueCandidate | null {
  const { minPosition, maxPosition, minImpressions } = HIGH_VISIBILITY_LOW_CTR_CONFIG;

  if (row.position < minPosition || row.position > maxPosition) return null;
  if (row.impressions < minImpressions) return null;

  const expectedCtr = getExpectedCtr(row.position);
  if (row.ctr >= expectedCtr) return null;

  const gapRatio = (expectedCtr - row.ctr) / expectedCtr;
  const severity = gapRatio >= 0.66 ? "high" : gapRatio >= 0.33 ? "medium" : "low";

  return {
    category: "KEYWORDS",
    code: "HIGH_VISIBILITY_LOW_CTR",
    severity,
    confidence: confidenceFromImpressions(row.impressions),
    evidence: {
      query: row.query,
      page: row.page,
      position: row.position,
      impressions: row.impressions,
      actualCtr: row.ctr,
      expectedCtr,
    },
  };
}
