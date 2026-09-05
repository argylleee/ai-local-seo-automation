import { describe, expect, it } from "vitest";
import { aiReviewAnalysisOutputSchema } from "./review-analysis";

describe("aiReviewAnalysisOutputSchema", () => {
  it("accepts a well-formed classification", () => {
    const result = aiReviewAnalysisOutputSchema.parse({
      sentiment: "negative",
      topics: ["slow service", "parking"],
      confidence: 0.6,
    });
    expect(result.sentiment).toBe("negative");
  });

  it("rejects a sentiment outside the fixed enum", () => {
    expect(() =>
      aiReviewAnalysisOutputSchema.parse({ sentiment: "furious", topics: [], confidence: 0.5 }),
    ).toThrow();
  });

  it("rejects more than 20 topics (bounded, not free-form)", () => {
    const topics = Array.from({ length: 21 }, (_, i) => `topic-${i}`);
    expect(() =>
      aiReviewAnalysisOutputSchema.parse({ sentiment: "neutral", topics, confidence: 0.5 }),
    ).toThrow();
  });
});
