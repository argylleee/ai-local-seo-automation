import { afterEach, describe, expect, it, vi } from "vitest";
import { getSearchAnalytics, listSites } from "./search-console";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchOnce(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(body) }),
  );
}

describe("listSites", () => {
  it("returns an empty array when the account has no properties", async () => {
    mockFetchOnce({});
    expect(await listSites("token")).toEqual([]);
  });

  it("returns the site entries", async () => {
    mockFetchOnce({
      siteEntry: [{ siteUrl: "https://example.ph/", permissionLevel: "siteOwner" }],
    });
    const sites = await listSites("token");
    expect(sites).toHaveLength(1);
    expect(sites[0]?.siteUrl).toBe("https://example.ph/");
  });
});

describe("getSearchAnalytics", () => {
  it("returns an empty array when there are no rows yet (never fabricates data)", async () => {
    mockFetchOnce({});
    const rows = await getSearchAnalytics("token", {
      siteUrl: "https://example.ph/",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    expect(rows).toEqual([]);
  });

  it("parses real rows matching the documented Search Console fields", async () => {
    mockFetchOnce({
      rows: [
        {
          keys: ["sari sari store near me", "https://example.ph/"],
          clicks: 4,
          impressions: 120,
          ctr: 0.033,
          position: 6.2,
        },
      ],
    });
    const rows = await getSearchAnalytics("token", {
      siteUrl: "https://example.ph/",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    expect(rows[0]).toMatchObject({ clicks: 4, impressions: 120 });
  });
});
