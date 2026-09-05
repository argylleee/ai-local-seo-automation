import { describe, expect, it } from "vitest";
import { calculateScore } from "./scoring";
import type { SeoIssueCandidate } from "./types";

function candidate(severity: SeoIssueCandidate["severity"]): SeoIssueCandidate {
  return { category: "KEYWORDS", code: "TEST", severity, confidence: 0.5, evidence: {} };
}

describe("calculateScore", () => {
  it("returns a perfect 100 with no issues", () => {
    expect(calculateScore([])).toBe(100);
  });

  it("subtracts a weighted penalty per issue severity", () => {
    expect(calculateScore([candidate("low")])).toBe(97);
    expect(calculateScore([candidate("high")])).toBe(85);
  });

  it("never goes below zero even with many severe issues", () => {
    const many = Array.from({ length: 10 }, () => candidate("critical"));
    expect(calculateScore(many)).toBe(0);
  });
});
