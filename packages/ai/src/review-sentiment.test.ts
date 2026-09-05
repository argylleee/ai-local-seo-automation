import { aiReviewAnalysisOutputSchema } from "@local-seo/schemas";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateStructuredOutput } from "./generate-structured-output";
import { classifyReviewSentiment } from "./review-sentiment";

vi.mock("./generate-structured-output", () => ({ generateStructuredOutput: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("classifyReviewSentiment", () => {
  it("returns the AI result when available", async () => {
    const aiData = { sentiment: "positive" as const, topics: ["service"], confidence: 0.9 };
    vi.mocked(generateStructuredOutput).mockResolvedValue({ data: aiData, source: "gemini" });

    const result = await classifyReviewSentiment("Ang bait ng staff!");
    expect(result).toEqual({ data: aiData, source: "gemini" });
  });

  it("falls back to a schema-valid keyword heuristic when no AI provider is available", async () => {
    vi.mocked(generateStructuredOutput).mockResolvedValue(null);

    const positive = await classifyReviewSentiment("Ang bait ng tindera, maganda ang serbisyo!");
    expect(() => aiReviewAnalysisOutputSchema.parse(positive.data)).not.toThrow();
    expect(positive.data.sentiment).toBe("positive");
    expect(positive.source).toBe("deterministic");

    const negative = await classifyReviewSentiment("Sobrang tagal, pangit ang serbisyo.");
    expect(negative.data.sentiment).toBe("negative");

    const neutral = await classifyReviewSentiment("Pumunta ako doon kahapon.");
    expect(neutral.data.sentiment).toBe("neutral");
  });
});
