import { describe, expect, it } from "vitest";
import { computeSyncWindow, matchSiteUrl } from "./search-console-sync";

describe("matchSiteUrl", () => {
  it("matches a plain https:// property to the business website", () => {
    const sites = [{ siteUrl: "https://example.ph/" }, { siteUrl: "https://other.ph/" }];
    expect(matchSiteUrl(sites, "https://example.ph")).toBe("https://example.ph/");
  });

  it("matches regardless of a www. prefix on either side", () => {
    const sites = [{ siteUrl: "https://www.example.ph/" }];
    expect(matchSiteUrl(sites, "https://example.ph")).toBe("https://www.example.ph/");
  });

  it("matches a domain-level sc-domain: property", () => {
    const sites = [{ siteUrl: "sc-domain:example.ph" }];
    expect(matchSiteUrl(sites, "https://example.ph/some/path")).toBe("sc-domain:example.ph");
  });

  it("returns null when the business has no website on file", () => {
    expect(matchSiteUrl([{ siteUrl: "https://example.ph/" }], null)).toBeNull();
  });

  it("returns null when no property matches", () => {
    expect(matchSiteUrl([{ siteUrl: "https://unrelated.ph/" }], "https://example.ph")).toBeNull();
  });
});

describe("computeSyncWindow", () => {
  it("ends a few days before now to account for Search Console's data lag", () => {
    const now = new Date("2026-01-15T00:00:00Z");
    const { endDate } = computeSyncWindow(now);
    expect(endDate).toBe("2026-01-12");
  });

  it("spans a 7-day window", () => {
    const now = new Date("2026-01-15T00:00:00Z");
    const { startDate, endDate } = computeSyncWindow(now);
    const days = (Date.parse(endDate) - Date.parse(startDate)) / (1000 * 60 * 60 * 24);
    expect(days).toBe(6); // inclusive of both endpoints = 7 days
  });
});
