import { seoIssues } from "@local-seo/db/schema";

// Single source of truth for these stays packages/db's pgEnum — imported
// via the column's enumValues, same pattern as packages/schemas.
export type SeoIssueCategory = (typeof seoIssues.category.enumValues)[number];
export type SeoIssueSeverity = (typeof seoIssues.severity.enumValues)[number];

/** One normalized Search Console row for one query/page pair on one business. */
export interface NormalizedSearchRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * One page's crawled technical/on-page facts. Deliberately independent
 * of apps/crawler's own ExtractedPageData shape — packages/seo-engine
 * must not depend on an app (a package depending on an app would
 * invert the intended dependency direction); the caller maps crawler
 * output onto this shape.
 */
export interface PageAuditInput {
  url: string;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  h1Count: number;
  wordCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  hasStructuredData: boolean;
  isNoindex: boolean;
  hasViewportMeta: boolean;
}

/**
 * A deterministically-detected candidate issue, before AI explanation
 * and persistence. See docs/seo-engine.md's pipeline: raw data ->
 * normalization -> deterministic rules -> candidate issues -> evidence
 * collection -> AI explanation -> schema validation -> priority
 * calculation -> persistence. This package only produces candidates —
 * it never calls AI and never writes to the database.
 */
export interface SeoIssueCandidate {
  category: SeoIssueCategory;
  code: string;
  severity: SeoIssueSeverity;
  /** Heuristic, not a statistical confidence interval — docs/seo-engine.md. */
  confidence: number;
  evidence: Record<string, unknown>;
}
