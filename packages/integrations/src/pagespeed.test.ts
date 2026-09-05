import { afterEach, describe, expect, it, vi } from "vitest";
import { runPageSpeedAudit } from "./pagespeed";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runPageSpeedAudit", () => {
  it("includes the API key and requested strategy in the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            lighthouseResult: { categories: { performance: { score: 0.82 } }, audits: {} },
          }),
      }),
    );

    const result = await runPageSpeedAudit("https://example.ph/", "desktop");

    expect(result.lighthouseResult.categories.performance.score).toBe(0.82);
    const [calledUrl] = vi.mocked(fetch).mock.calls[0]!;
    const url = new URL(calledUrl as string);
    expect(url.searchParams.get("key")).toBe("test-pagespeed-key");
    expect(url.searchParams.get("strategy")).toBe("desktop");
    expect(url.searchParams.get("url")).toBe("https://example.ph/");
  });

  it("throws on a non-OK response instead of returning a fabricated score", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );
    await expect(runPageSpeedAudit("https://example.ph/")).rejects.toThrow();
  });
});
