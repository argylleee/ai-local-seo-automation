import { afterEach, describe, expect, it, vi } from "vitest";
import { callOllama, OllamaUnavailableError } from "./ollama";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callOllama", () => {
  it("throws when the connection fails (Ollama not running)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(callOllama("prompt")).rejects.toThrow(OllamaUnavailableError);
  });

  it("throws on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(callOllama("prompt")).rejects.toThrow(OllamaUnavailableError);
  });

  it("throws when the response isn't valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: "not json" }),
      }),
    );
    await expect(callOllama("prompt")).rejects.toThrow(OllamaUnavailableError);
  });

  it("parses and returns the JSON content on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: '{"hello":"world"}' }),
      }),
    );
    await expect(callOllama("prompt")).resolves.toEqual({ hello: "world" });
  });
});
