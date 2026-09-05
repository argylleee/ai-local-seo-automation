import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateStructuredOutput } from "./generate-structured-output";
import { callGemini } from "./providers/gemini";
import { callGroq } from "./providers/groq";
import { callOllama } from "./providers/ollama";

vi.mock("./providers/groq", () => ({ callGroq: vi.fn() }));
vi.mock("./providers/gemini", () => ({ callGemini: vi.fn() }));
vi.mock("./providers/ollama", () => ({ callOllama: vi.fn() }));

const schema = z.object({ value: z.number() });

afterEach(() => {
  vi.clearAllMocks();
});

describe("generateStructuredOutput", () => {
  it("returns Groq's result when it validates, without calling Gemini or Ollama", async () => {
    vi.mocked(callGroq).mockResolvedValue({ value: 1 });
    const result = await generateStructuredOutput(schema, "prompt");
    expect(result).toEqual({ data: { value: 1 }, source: "groq" });
    expect(callGemini).not.toHaveBeenCalled();
    expect(callOllama).not.toHaveBeenCalled();
  });

  it("falls through to Gemini when Groq throws", async () => {
    vi.mocked(callGroq).mockRejectedValue(new Error("unavailable"));
    vi.mocked(callGemini).mockResolvedValue({ value: 2 });
    const result = await generateStructuredOutput(schema, "prompt");
    expect(result).toEqual({ data: { value: 2 }, source: "gemini" });
    expect(callOllama).not.toHaveBeenCalled();
  });

  it("falls through to Gemini when Groq's response fails schema validation", async () => {
    vi.mocked(callGroq).mockResolvedValue({ value: "not-a-number" });
    vi.mocked(callGemini).mockResolvedValue({ value: 2 });
    const result = await generateStructuredOutput(schema, "prompt");
    expect(result).toEqual({ data: { value: 2 }, source: "gemini" });
  });

  it("falls through all the way to Ollama when Groq and Gemini both fail", async () => {
    vi.mocked(callGroq).mockRejectedValue(new Error("unavailable"));
    vi.mocked(callGemini).mockRejectedValue(new Error("unavailable"));
    vi.mocked(callOllama).mockResolvedValue({ value: 3 });
    const result = await generateStructuredOutput(schema, "prompt");
    expect(result).toEqual({ data: { value: 3 }, source: "ollama" });
  });

  it("returns null when every provider is unavailable or invalid", async () => {
    vi.mocked(callGroq).mockRejectedValue(new Error("unavailable"));
    vi.mocked(callGemini).mockRejectedValue(new Error("unavailable"));
    vi.mocked(callOllama).mockResolvedValue({ value: "still not a number" });
    const result = await generateStructuredOutput(schema, "prompt");
    expect(result).toBeNull();
  });
});
