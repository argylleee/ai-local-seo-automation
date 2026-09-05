import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSafeUrl } from "../src/ssrf-guard";

vi.mock("../src/ssrf-guard", async () => {
  const actual = await vi.importActual<typeof import("../src/ssrf-guard")>("../src/ssrf-guard");
  return { ...actual, assertSafeUrl: vi.fn((url: string) => Promise.resolve(new URL(url))) };
});

const { fetchSafe, FetchSafeError } = await import("../src/fetch-safe");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function mockResponse(status: number, body: string, headers: Record<string, string> = {}) {
  return {
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    body: {
      getReader: () => {
        let sent = false;
        return {
          read: () => {
            if (sent) return Promise.resolve({ done: true, value: undefined });
            sent = true;
            return Promise.resolve({ done: false, value: new TextEncoder().encode(body) });
          },
          cancel: () => Promise.resolve(),
        };
      },
    },
  };
}

describe("fetchSafe", () => {
  it("returns the body, status, and final URL on a plain 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, "<html>ok</html>")));
    const result = await fetchSafe("https://example.ph/");
    expect(result).toEqual({
      finalUrl: "https://example.ph/",
      status: 200,
      html: "<html>ok</html>",
    });
  });

  it("follows a redirect, re-validating the new URL through the SSRF guard", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(301, "", { location: "https://example.ph/new" }))
      .mockResolvedValueOnce(mockResponse(200, "<html>final</html>"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSafe("https://example.ph/old");

    expect(result.finalUrl).toBe("https://example.ph/new");
    expect(result.html).toBe("<html>final</html>");
    expect(vi.mocked(assertSafeUrl)).toHaveBeenCalledWith("https://example.ph/new");
  });

  it("throws if a redirect has no Location header", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(302, "")));
    await expect(fetchSafe("https://example.ph/")).rejects.toThrow(FetchSafeError);
  });

  it("throws after too many redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(302, "", { location: "https://example.ph/loop" })),
    );
    await expect(fetchSafe("https://example.ph/")).rejects.toThrow(FetchSafeError);
  });

  it("throws if the response exceeds the size limit", async () => {
    const hugeChunk = "x".repeat(6 * 1024 * 1024);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, hugeChunk)));
    await expect(fetchSafe("https://example.ph/")).rejects.toThrow(FetchSafeError);
  });
});
