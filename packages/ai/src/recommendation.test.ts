import { aiRecommendationCandidateSchema } from "@local-seo/schemas";
import type { SeoIssueCandidate } from "@local-seo/seo-engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateStructuredOutput } from "./generate-structured-output";
import { generateRecommendation } from "./recommendation";

vi.mock("./generate-structured-output", () => ({ generateStructuredOutput: vi.fn() }));

const candidate: SeoIssueCandidate = {
  category: "KEYWORDS",
  code: "HIGH_VISIBILITY_LOW_CTR",
  severity: "high",
  confidence: 0.8,
  evidence: { query: "q", position: 6, actualCtr: 0.01, expectedCtr: 0.05 },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("generateRecommendation", () => {
  it("returns the AI result when available", async () => {
    const aiData = {
      title: "AI title",
      rationale: "AI rationale",
      category: "KEYWORDS" as const,
      priority: "HIGH" as const,
      confidence: 0.9,
      evidenceIds: ["query"],
    };
    vi.mocked(generateStructuredOutput).mockResolvedValue({ data: aiData, source: "gemini" });

    const result = await generateRecommendation(candidate);
    expect(result).toEqual({ data: aiData, source: "gemini" });
  });

  // docs/free-tooling.md: "The product should degrade gracefully rather
  // than fail because AI is unavailable." — this is the core guarantee
  // for the whole package.
  it("falls back to a schema-valid deterministic recommendation when no AI provider is available", async () => {
    vi.mocked(generateStructuredOutput).mockResolvedValue(null);

    const result = await generateRecommendation(candidate);
    expect(result.source).toBe("deterministic");
    expect(() => aiRecommendationCandidateSchema.parse(result.data)).not.toThrow();
    expect(result.data.priority).toBe("HIGH"); // mapped from severity "high"
  });

  it("produces a valid fallback even for an unrecognized issue code", async () => {
    vi.mocked(generateStructuredOutput).mockResolvedValue(null);
    const result = await generateRecommendation({ ...candidate, code: "SOME_NEW_RULE" });
    expect(() => aiRecommendationCandidateSchema.parse(result.data)).not.toThrow();
  });
});
