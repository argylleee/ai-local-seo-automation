import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callGroq, GroqUnavailableError } from "./groq";

const originalKey = process.env.GROQ_API_KEY;

beforeEach(() => {
  process.env.GROQ_API_KEY = "test-key";
});

afterEach(() => {
  process.env.GROQ_API_KEY = originalKey;
  vi.unstubAllGlobals();
});

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) }),
  );
}

describe("callGroq", () => {
  it("throws without an API key", async () => {
    delete process.env.GROQ_API_KEY;
    await expect(callGroq("prompt")).rejects.toThrow(GroqUnavailableError);
  });

  it("throws on a 429 rate-limit response", async () => {
    mockFetchOnce(429, {});
    await expect(callGroq("prompt")).rejects.toThrow(GroqUnavailableError);
  });

  it("throws when Groq returns non-JSON content", async () => {
    mockFetchOnce(200, { choices: [{ message: { content: "not json" } }] });
    await expect(callGroq("prompt")).rejects.toThrow(GroqUnavailableError);
  });

  it("parses and returns the JSON content on success", async () => {
    mockFetchOnce(200, { choices: [{ message: { content: '{"hello":"world"}' } }] });
    await expect(callGroq("prompt")).resolves.toEqual({ hello: "world" });
  });
});
