import {
  detectHeadingIssues,
  detectHighVisibilityLowCtr,
  detectMissingAltText,
  detectMissingCanonical,
  detectMissingMetaDescription,
  detectMissingTitle,
  detectMissingViewportMeta,
  detectNoindex,
  detectStrikingDistanceKeyword,
  detectThinContent,
  detectTitleLength,
} from "./rules";
import { calculateScore } from "./scoring";
import type { NormalizedSearchRow, PageAuditInput, SeoIssueCandidate } from "./types";

const SEARCH_CONSOLE_RULES = [detectHighVisibilityLowCtr, detectStrikingDistanceKeyword];

const PAGE_AUDIT_RULES = [
  detectNoindex,
  detectMissingViewportMeta,
  detectMissingTitle,
  detectTitleLength,
  detectMissingMetaDescription,
  detectHeadingIssues,
  detectMissingCanonical,
  detectMissingAltText,
  detectThinContent,
];

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
    for (const rule of SEARCH_CONSOLE_RULES) {
      const candidate = rule(row);
      if (candidate) candidates.push(candidate);
    }
  }
  return { candidates, score: calculateScore(candidates) };
}

/**
 * Runs every deterministic technical/on-page/content rule against one
 * crawled page (apps/crawler's output, mapped onto PageAuditInput) and
 * returns the detected candidates plus the resulting score.
 */
export function analyzePageAudit(page: PageAuditInput): {
  candidates: SeoIssueCandidate[];
  score: number;
} {
  const candidates: SeoIssueCandidate[] = [];
  for (const rule of PAGE_AUDIT_RULES) {
    const candidate = rule(page);
    if (candidate) candidates.push(candidate);
  }
  return { candidates, score: calculateScore(candidates) };
}
