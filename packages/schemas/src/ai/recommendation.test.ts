import { describe, expect, it } from "vitest";
import { aiRecommendationCandidateSchema } from "./recommendation";

const valid = {
  title: "Improve GBP category accuracy",
  rationale: "The primary category does not match the business's main service.",
  category: "BUSINESS_PROFILE",
  priority: "HIGH",
  confidence: 0.82,
  evidenceIds: ["issue_1"],
};

describe("aiRecommendationCandidateSchema", () => {
  it("accepts a well-formed AI candidate", () => {
    expect(aiRecommendationCandidateSchema.parse(valid)).toEqual(valid);
  });

  // docs/security.md AI security: "Validate ... confidence ranges."
  it.each([-0.01, 1.01])("rejects an out-of-range confidence of %s", (confidence) => {
    expect(() => aiRecommendationCandidateSchema.parse({ ...valid, confidence })).toThrow();
  });

  it("rejects a category outside the deterministic SEO issue taxonomy", () => {
    expect(() =>
      aiRecommendationCandidateSchema.parse({ ...valid, category: "MADE_UP_CATEGORY" }),
    ).toThrow();
  });

  it("rejects more than 20 evidence ids", () => {
    const evidenceIds = Array.from({ length: 21 }, (_, i) => `issue_${i}`);
    expect(() => aiRecommendationCandidateSchema.parse({ ...valid, evidenceIds })).toThrow();
  });

  it("rejects an empty rationale (no unsupported claims without evidence)", () => {
    expect(() => aiRecommendationCandidateSchema.parse({ ...valid, rationale: "" })).toThrow();
  });
});
