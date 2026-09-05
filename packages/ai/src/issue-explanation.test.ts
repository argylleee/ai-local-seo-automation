import { aiSeoIssueExplanationSchema } from "@local-seo/schemas";
import type { SeoIssueCandidate } from "@local-seo/seo-engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateStructuredOutput } from "./generate-structured-output";
import { explainIssue } from "./issue-explanation";

vi.mock("./generate-structured-output", () => ({ generateStructuredOutput: vi.fn() }));

const issueId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
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

describe("explainIssue", () => {
  it("returns the AI result when available", async () => {
    const aiData = {
      issueId,
      explanation: "AI explanation",
      evidenceIds: ["query"],
      confidence: 0.9,
    };
    vi.mocked(generateStructuredOutput).mockResolvedValue({ data: aiData, source: "gemini" });

    const result = await explainIssue(issueId, candidate);
    expect(result).toEqual({ data: aiData, source: "gemini" });
  });

  it("falls back to a schema-valid evidence recitation when no AI provider is available", async () => {
    vi.mocked(generateStructuredOutput).mockResolvedValue(null);

    const result = await explainIssue(issueId, candidate);
    expect(() => aiSeoIssueExplanationSchema.parse(result.data)).not.toThrow();
    expect(result.data.issueId).toBe(issueId);
    expect(result.data.explanation).toContain("HIGH_VISIBILITY_LOW_CTR");
    expect(result.source).toBe("deterministic");
  });
});
