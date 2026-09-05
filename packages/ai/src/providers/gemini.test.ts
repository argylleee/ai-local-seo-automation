import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callGemini, GeminiUnavailableError } from "./gemini";

const originalKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  process.env.GEMINI_API_KEY = originalKey;
  vi.unstubAllGlobals();
});

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) }),
  );
}

describe("callGemini", () => {
  it("throws without an API key", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(callGemini("prompt")).rejects.toThrow(GeminiUnavailableError);
  });

  it("throws on a 429 quota response", async () => {
    mockFetchOnce(429, {});
    await expect(callGemini("prompt")).rejects.toThrow(GeminiUnavailableError);
  });

  it("throws when Gemini returns non-JSON text", async () => {
    mockFetchOnce(200, { candidates: [{ content: { parts: [{ text: "not json" }] } }] });
    await expect(callGemini("prompt")).rejects.toThrow(GeminiUnavailableError);
  });

  it("parses and returns the JSON content on success", async () => {
    mockFetchOnce(200, {
      candidates: [{ content: { parts: [{ text: '{"hello":"world"}' }] } }],
    });
    await expect(callGemini("prompt")).resolves.toEqual({ hello: "world" });
  });
});
