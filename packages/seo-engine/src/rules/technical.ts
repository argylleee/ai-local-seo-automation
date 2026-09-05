import type { PageAuditInput, SeoIssueCandidate } from "../types";

const TITLE_MIN_LENGTH = 15;
const TITLE_MAX_LENGTH = 60;
const META_DESCRIPTION_MAX_LENGTH = 160;
const THIN_CONTENT_WORD_THRESHOLD = 300;
const MISSING_ALT_RATIO_THRESHOLD = 0.5;

function evidence(page: PageAuditInput, extra: Record<string, unknown> = {}) {
  return { url: page.url, ...extra };
}

/**
 * Each function inspects one page's crawled facts and returns at most
 * one candidate. All are pure and deterministic — no AI, no I/O,
 * mirroring the Search-Console-based rules in high-visibility-low-ctr.ts.
 */
export function detectMissingViewportMeta(page: PageAuditInput): SeoIssueCandidate | null {
  if (page.hasViewportMeta) return null;
  // High severity: docs/design.md requires "mobile-first layouts" —
  // a missing viewport tag breaks mobile rendering entirely.
  return {
    category: "TECHNICAL",
    code: "MISSING_VIEWPORT_META",
    severity: "high",
    confidence: 0.95,
    evidence: evidence(page),
  };
}

export function detectNoindex(page: PageAuditInput): SeoIssueCandidate | null {
  if (!page.isNoindex) return null;
  // Critical: the page cannot appear in search results at all.
  return {
    category: "TECHNICAL",
    code: "NOINDEX_DETECTED",
    severity: "critical",
    confidence: 0.98,
    evidence: evidence(page),
  };
}

export function detectMissingCanonical(page: PageAuditInput): SeoIssueCandidate | null {
  if (page.canonicalUrl) return null;
  return {
    category: "TECHNICAL",
    code: "MISSING_CANONICAL",
    severity: "low",
    confidence: 0.85,
    evidence: evidence(page),
  };
}

export function detectMissingTitle(page: PageAuditInput): SeoIssueCandidate | null {
  if (page.title && page.title.length > 0) return null;
  return {
    category: "ON_PAGE",
    code: "MISSING_TITLE",
    severity: "high",
    confidence: 0.95,
    evidence: evidence(page),
  };
}

export function detectTitleLength(page: PageAuditInput): SeoIssueCandidate | null {
  if (!page.title) return null; // MISSING_TITLE already covers the absent case
  const length = page.title.length;
  if (length >= TITLE_MIN_LENGTH && length <= TITLE_MAX_LENGTH) return null;
  return {
    category: "ON_PAGE",
    code: length < TITLE_MIN_LENGTH ? "TITLE_TOO_SHORT" : "TITLE_TOO_LONG",
    severity: "low",
    confidence: 0.7,
    evidence: evidence(page, { titleLength: length }),
  };
}

export function detectMissingMetaDescription(page: PageAuditInput): SeoIssueCandidate | null {
  if (page.metaDescription && page.metaDescription.length > 0) {
    if (page.metaDescription.length > META_DESCRIPTION_MAX_LENGTH) {
      return {
        category: "ON_PAGE",
        code: "META_DESCRIPTION_TOO_LONG",
        severity: "low",
        confidence: 0.7,
        evidence: evidence(page, { metaDescriptionLength: page.metaDescription.length }),
      };
    }
    return null;
  }
  return {
    category: "ON_PAGE",
    code: "MISSING_META_DESCRIPTION",
    severity: "medium",
    confidence: 0.9,
    evidence: evidence(page),
  };
}

export function detectHeadingIssues(page: PageAuditInput): SeoIssueCandidate | null {
  if (page.h1Count === 0) {
    return {
      category: "ON_PAGE",
      code: "MISSING_H1",
      severity: "medium",
      confidence: 0.85,
      evidence: evidence(page),
    };
  }
  if (page.h1Count > 1) {
    return {
      category: "ON_PAGE",
      code: "MULTIPLE_H1",
      severity: "low",
      confidence: 0.7,
      evidence: evidence(page, { h1Count: page.h1Count }),
    };
  }
  return null;
}

export function detectMissingAltText(page: PageAuditInput): SeoIssueCandidate | null {
  if (page.imageCount === 0) return null;
  const ratio = page.imagesMissingAlt / page.imageCount;
  if (ratio < MISSING_ALT_RATIO_THRESHOLD) return null;
  return {
    category: "ON_PAGE",
    code: "MISSING_ALT_TEXT",
    severity: "medium",
    confidence: 0.8,
    evidence: evidence(page, {
      imageCount: page.imageCount,
      imagesMissingAlt: page.imagesMissingAlt,
    }),
  };
}

export function detectThinContent(page: PageAuditInput): SeoIssueCandidate | null {
  if (page.wordCount >= THIN_CONTENT_WORD_THRESHOLD) return null;
  return {
    category: "CONTENT",
    code: "THIN_CONTENT",
    severity: "medium",
    confidence: 0.75,
    evidence: evidence(page, { wordCount: page.wordCount }),
  };
}
