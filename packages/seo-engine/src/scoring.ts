import type { SeoIssueCandidate, SeoIssueSeverity } from "./types";

/**
 * Deterministic weighted score — docs/seo-engine.md: "Do not ask AI for
 * the final SEO score." Configurable, documented penalty per open issue
 * severity, starting from a perfect 100.
 */
export const SEVERITY_PENALTY: Readonly<Record<SeoIssueSeverity, number>> = Object.freeze({
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
});

export function calculateScore(candidates: SeoIssueCandidate[]): number {
  const penalty = candidates.reduce(
    (sum, candidate) => sum + SEVERITY_PENALTY[candidate.severity],
    0,
  );
  return Math.max(0, Math.round(100 - penalty));
}
