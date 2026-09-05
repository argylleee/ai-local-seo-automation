import { describe, expect, it } from "vitest";
import { MOCK_SEARCH_ROWS } from "./fixtures";
import { analyzePageAudit, analyzeSearchConsoleRows } from "./pipeline";
import type { PageAuditInput } from "./types";

describe("analyzeSearchConsoleRows", () => {
  it("detects issues across all rows and scores them deterministically", () => {
    const { candidates, score } = analyzeSearchConsoleRows(MOCK_SEARCH_ROWS);

    // Positions 11-15 fall inside both rule windows (4-15 and 11-20), so
    // the grocery-delivery row (position 13.5) legitimately triggers both.
    const codes = candidates.map((c) => c.code).sort();
    expect(codes).toEqual([
      "HIGH_VISIBILITY_LOW_CTR",
      "HIGH_VISIBILITY_LOW_CTR",
      "STRIKING_DISTANCE_KEYWORD",
    ]);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("returns a clean, unscored-down result for rows with no issues", () => {
    const clean = MOCK_SEARCH_ROWS.filter((r) => r.query === "example sari sari store");
    const { candidates, score } = analyzeSearchConsoleRows(clean);
    expect(candidates).toEqual([]);
    expect(score).toBe(100);
  });
});

describe("analyzePageAudit", () => {
  const brokenPage: PageAuditInput = {
    url: "https://example.ph/",
    title: null,
    metaDescription: null,
    canonicalUrl: null,
    h1Count: 0,
    wordCount: 50,
    imageCount: 2,
    imagesMissingAlt: 2,
    hasStructuredData: false,
    isNoindex: true,
    hasViewportMeta: false,
  };

  it("detects multiple technical/on-page/content issues on a broken page", () => {
    const { candidates, score } = analyzePageAudit(brokenPage);
    const codes = candidates.map((c) => c.code).sort();
    expect(codes).toEqual([
      "MISSING_ALT_TEXT",
      "MISSING_CANONICAL",
      "MISSING_H1",
      "MISSING_META_DESCRIPTION",
      "MISSING_TITLE",
      "MISSING_VIEWPORT_META",
      "NOINDEX_DETECTED",
      "THIN_CONTENT",
    ]);
    expect(score).toBeLessThan(100);
  });

  it("returns a perfect score for a clean page", () => {
    const cleanPage: PageAuditInput = {
      url: "https://example.ph/",
      title: "Demo Sari-Sari Store | Quezon City Neighborhood Shop",
      metaDescription: "A friendly neighborhood sari-sari store in Quezon City.",
      canonicalUrl: "https://example.ph/",
      h1Count: 1,
      wordCount: 500,
      imageCount: 4,
      imagesMissingAlt: 0,
      hasStructuredData: true,
      isNoindex: false,
      hasViewportMeta: true,
    };
    const { candidates, score } = analyzePageAudit(cleanPage);
    expect(candidates).toEqual([]);
    expect(score).toBe(100);
  });
});
