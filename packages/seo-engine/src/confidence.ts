/**
 * More impressions means a CTR gap is less likely to be sampling noise.
 * This is a documented heuristic, not a statistical confidence interval
 * — docs/seo-engine.md: "Do not present model confidence as statistical
 * certainty."
 */
export function confidenceFromImpressions(impressions: number): number {
  const MIN_CONFIDENCE = 0.5;
  const MAX_CONFIDENCE = 0.95;
  const SATURATION_IMPRESSIONS = 1000; // beyond this, more volume adds little extra confidence

  const ratio = Math.min(impressions / SATURATION_IMPRESSIONS, 1);
  return MIN_CONFIDENCE + ratio * (MAX_CONFIDENCE - MIN_CONFIDENCE);
}
