/**
 * Expected organic CTR by average Search Console position.
 *
 * docs/seo-engine.md requires that rule thresholds be "documented and
 * configurable" — this is not a fabricated number for any business, it's
 * a blended default from published aggregate industry studies:
 *   - Backlinko, "We Analyzed 4 Million Google Search Results" (2024)
 *   - SISTRIX, organic CTR study (~80M keywords)
 * Real CTR varies a lot by SERP features (AI Overviews, shopping
 * results, etc. can cut position-1 CTR by 50%+), industry, and device —
 * see docs/seo-engine.md's confidence rule: this is a heuristic
 * baseline, not a statistical guarantee for any specific query.
 * Positions 11–20 are linearly extrapolated (no study reliably
 * separates them); anything past 20 falls back to a flat low value.
 */
export const EXPECTED_CTR_BY_POSITION: Readonly<Record<number, number>> = Object.freeze({
  1: 0.28,
  2: 0.157,
  3: 0.11,
  4: 0.08,
  5: 0.065,
  6: 0.05,
  7: 0.04,
  8: 0.035,
  9: 0.03,
  10: 0.025,
});

const CTR_AT_POSITION_10 = EXPECTED_CTR_BY_POSITION[10]!;
const CTR_AT_POSITION_20 = 0.01;
const POSITION_11_TO_20_SLOPE = (CTR_AT_POSITION_20 - CTR_AT_POSITION_10) / (20 - 10);
const FALLBACK_CTR_BEYOND_20 = CTR_AT_POSITION_20;

/** Looks up (or interpolates/extrapolates) the expected CTR for a given average position. */
export function getExpectedCtr(position: number): number {
  const rounded = Math.round(position);
  if (rounded in EXPECTED_CTR_BY_POSITION) {
    return EXPECTED_CTR_BY_POSITION[rounded]!;
  }
  if (rounded > 10 && rounded <= 20) {
    return CTR_AT_POSITION_10 + POSITION_11_TO_20_SLOPE * (rounded - 10);
  }
  if (rounded < 1) {
    return EXPECTED_CTR_BY_POSITION[1]!;
  }
  return FALLBACK_CTR_BEYOND_20;
}
