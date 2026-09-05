import { describe, expect, it } from "vitest";
import type { PageAuditInput } from "../types";
import {
  detectHeadingIssues,
  detectMissingAltText,
  detectMissingCanonical,
  detectMissingMetaDescription,
  detectMissingTitle,
  detectMissingViewportMeta,
  detectNoindex,
  detectThinContent,
  detectTitleLength,
} from "./technical";

const CLEAN_PAGE: PageAuditInput = {
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

describe("detectNoindex", () => {
  it("fires at critical severity when the page is noindexed", () => {
    const candidate = detectNoindex({ ...CLEAN_PAGE, isNoindex: true });
    expect(candidate?.severity).toBe("critical");
    expect(candidate?.code).toBe("NOINDEX_DETECTED");
  });

  it("does not fire on an indexable page", () => {
    expect(detectNoindex(CLEAN_PAGE)).toBeNull();
  });
});

describe("detectMissingViewportMeta", () => {
  it("fires when there is no viewport meta tag", () => {
    expect(detectMissingViewportMeta({ ...CLEAN_PAGE, hasViewportMeta: false })?.code).toBe(
      "MISSING_VIEWPORT_META",
    );
  });

  it("does not fire when present", () => {
    expect(detectMissingViewportMeta(CLEAN_PAGE)).toBeNull();
  });
});

describe("detectMissingTitle", () => {
  it("fires on a null title", () => {
    expect(detectMissingTitle({ ...CLEAN_PAGE, title: null })?.code).toBe("MISSING_TITLE");
  });

  it("fires on an empty title", () => {
    expect(detectMissingTitle({ ...CLEAN_PAGE, title: "" })?.code).toBe("MISSING_TITLE");
  });

  it("does not fire on a real title", () => {
    expect(detectMissingTitle(CLEAN_PAGE)).toBeNull();
  });
});

describe("detectTitleLength", () => {
  it("flags a too-short title", () => {
    expect(detectTitleLength({ ...CLEAN_PAGE, title: "Home" })?.code).toBe("TITLE_TOO_SHORT");
  });

  it("flags a too-long title", () => {
    expect(detectTitleLength({ ...CLEAN_PAGE, title: "x".repeat(80) })?.code).toBe(
      "TITLE_TOO_LONG",
    );
  });

  it("does not fire on a well-sized title", () => {
    expect(detectTitleLength(CLEAN_PAGE)).toBeNull();
  });

  it("defers to detectMissingTitle when there is no title at all", () => {
    expect(detectTitleLength({ ...CLEAN_PAGE, title: null })).toBeNull();
  });
});

describe("detectMissingMetaDescription", () => {
  it("fires when absent", () => {
    expect(detectMissingMetaDescription({ ...CLEAN_PAGE, metaDescription: null })?.code).toBe(
      "MISSING_META_DESCRIPTION",
    );
  });

  it("flags an overly long description", () => {
    expect(
      detectMissingMetaDescription({ ...CLEAN_PAGE, metaDescription: "x".repeat(200) })?.code,
    ).toBe("META_DESCRIPTION_TOO_LONG");
  });

  it("does not fire on a well-sized description", () => {
    expect(detectMissingMetaDescription(CLEAN_PAGE)).toBeNull();
  });
});

describe("detectHeadingIssues", () => {
  it("fires MISSING_H1 when there are none", () => {
    expect(detectHeadingIssues({ ...CLEAN_PAGE, h1Count: 0 })?.code).toBe("MISSING_H1");
  });

  it("fires MULTIPLE_H1 when there is more than one", () => {
    expect(detectHeadingIssues({ ...CLEAN_PAGE, h1Count: 3 })?.code).toBe("MULTIPLE_H1");
  });

  it("does not fire with exactly one H1", () => {
    expect(detectHeadingIssues(CLEAN_PAGE)).toBeNull();
  });
});

describe("detectMissingCanonical", () => {
  it("fires when absent", () => {
    expect(detectMissingCanonical({ ...CLEAN_PAGE, canonicalUrl: null })?.code).toBe(
      "MISSING_CANONICAL",
    );
  });

  it("does not fire when present", () => {
    expect(detectMissingCanonical(CLEAN_PAGE)).toBeNull();
  });
});

describe("detectMissingAltText", () => {
  it("fires when at least half the images are missing alt text", () => {
    const candidate = detectMissingAltText({ ...CLEAN_PAGE, imageCount: 4, imagesMissingAlt: 2 });
    expect(candidate?.code).toBe("MISSING_ALT_TEXT");
  });

  it("does not fire below the threshold", () => {
    expect(detectMissingAltText({ ...CLEAN_PAGE, imageCount: 4, imagesMissingAlt: 1 })).toBeNull();
  });

  it("does not fire when there are no images at all", () => {
    expect(detectMissingAltText({ ...CLEAN_PAGE, imageCount: 0, imagesMissingAlt: 0 })).toBeNull();
  });
});

describe("detectThinContent", () => {
  it("fires below the word-count threshold", () => {
    expect(detectThinContent({ ...CLEAN_PAGE, wordCount: 100 })?.code).toBe("THIN_CONTENT");
  });

  it("does not fire on substantial content", () => {
    expect(detectThinContent(CLEAN_PAGE)).toBeNull();
  });
});
