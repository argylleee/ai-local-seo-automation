import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateStructuredOutput } from "./generate-structured-output";
import { callGemini } from "./providers/gemini";
import { callOllama } from "./providers/ollama";

vi.mock("./providers/gemini", () => ({ callGemini: vi.fn() }));
vi.mock("./providers/ollama", () => ({ callOllama: vi.fn() }));

const schema = z.object({ value: z.number() });

afterEach(() => {
  vi.clearAllMocks();
});

describe("generateStructuredOutput", () => {
  it("returns Gemini's result when it validates", async () => {
    vi.mocked(callGemini).mockResolvedValue({ value: 1 });
    const result = await generateStructuredOutput(schema, "prompt");
    expect(result).toEqual({ data: { value: 1 }, source: "gemini" });
    expect(callOllama).not.toHaveBeenCalled();
  });

  it("falls through to Ollama when Gemini throws", async () => {
    vi.mocked(callGemini).mockRejectedValue(new Error("unavailable"));
    vi.mocked(callOllama).mockResolvedValue({ value: 2 });
    const result = await generateStructuredOutput(schema, "prompt");
    expect(result).toEqual({ data: { value: 2 }, source: "ollama" });
  });

  it("falls through to Ollama when Gemini's response fails schema validation", async () => {
    vi.mocked(callGemini).mockResolvedValue({ value: "not-a-number" });
    vi.mocked(callOllama).mockResolvedValue({ value: 2 });
    const result = await generateStructuredOutput(schema, "prompt");
    expect(result).toEqual({ data: { value: 2 }, source: "ollama" });
  });

  it("returns null when both providers are unavailable or invalid", async () => {
    vi.mocked(callGemini).mockRejectedValue(new Error("unavailable"));
    vi.mocked(callOllama).mockResolvedValue({ value: "still not a number" });
    const result = await generateStructuredOutput(schema, "prompt");
    expect(result).toBeNull();
  });
});
