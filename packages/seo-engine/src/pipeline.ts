import { detectHighVisibilityLowCtr, detectStrikingDistanceKeyword } from "./rules";
import { calculateScore } from "./scoring";
import type { NormalizedSearchRow, SeoIssueCandidate } from "./types";

const RULES = [detectHighVisibilityLowCtr, detectStrikingDistanceKeyword];

/**
 * Runs every deterministic rule against normalized Search Console rows
 * and returns the detected candidates plus the resulting score. This is
 * the "deterministic rules -> candidate issues" step of the pipeline in
 * docs/seo-engine.md — evidence collection/AI explanation/persistence
 * happen downstream (packages/ai, apps/web), not here.
 */
export function analyzeSearchConsoleRows(rows: NormalizedSearchRow[]): {
  candidates: SeoIssueCandidate[];
  score: number;
} {
  const candidates: SeoIssueCandidate[] = [];
  for (const row of rows) {
    for (const rule of RULES) {
      const candidate = rule(row);
      if (candidate) candidates.push(candidate);
    }
  }
  return { candidates, score: calculateScore(candidates) };
}
