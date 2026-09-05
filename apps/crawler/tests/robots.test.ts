import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSafe } from "../src/fetch-safe";
import { isCrawlAllowed } from "../src/robots";

vi.mock("../src/fetch-safe", () => ({ fetchSafe: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

function mockRobots(body: string, status = 200) {
  vi.mocked(fetchSafe).mockResolvedValue({
    finalUrl: "https://example.ph/robots.txt",
    status,
    html: body,
  });
}

describe("isCrawlAllowed", () => {
  it("allows crawling when robots.txt can't be fetched", async () => {
    vi.mocked(fetchSafe).mockRejectedValue(new Error("network error"));
    expect(await isCrawlAllowed("https://example.ph/page")).toBe(true);
  });

  it("allows crawling when robots.txt 404s", async () => {
    mockRobots("", 404);
    expect(await isCrawlAllowed("https://example.ph/page")).toBe(true);
  });

  it("disallows a path matching a wildcard Disallow rule", async () => {
    mockRobots("User-agent: *\nDisallow: /private/");
    expect(await isCrawlAllowed("https://example.ph/private/secret")).toBe(false);
    expect(await isCrawlAllowed("https://example.ph/public/page")).toBe(true);
  });

  it("lets a more specific Allow rule override a broader Disallow", async () => {
    mockRobots("User-agent: *\nDisallow: /private/\nAllow: /private/public-ok");
    expect(await isCrawlAllowed("https://example.ph/private/public-ok/page")).toBe(true);
    expect(await isCrawlAllowed("https://example.ph/private/secret")).toBe(false);
  });

  it("ignores comments and blank lines", async () => {
    mockRobots("# comment\n\nUser-agent: *\n\nDisallow: /admin\n");
    expect(await isCrawlAllowed("https://example.ph/admin")).toBe(false);
  });
});
