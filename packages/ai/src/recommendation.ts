import {
  aiRecommendationCandidateSchema,
  type AiRecommendationCandidate,
} from "@local-seo/schemas";
import type { SeoIssueCandidate, SeoIssueSeverity } from "@local-seo/seo-engine";
import { generateStructuredOutput, type AiSource } from "./generate-structured-output";

const SEVERITY_TO_PRIORITY: Record<SeoIssueSeverity, AiRecommendationCandidate["priority"]> = {
  critical: "HIGH",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

function buildPrompt(candidate: SeoIssueCandidate): string {
  // Prompt design per docs/ai.md: define role, provide evidence, forbid
  // unsupported claims, require structured output, specify uncertainty
  // behavior.
  return `You are an SEO analyst writing a recommendation for a Philippine small business owner.

A deterministic rule already detected this issue — do not invent additional facts or claims beyond the evidence below. Never guarantee a ranking or traffic outcome.

Issue code: ${candidate.code}
Category: ${candidate.category}
Evidence: ${JSON.stringify(candidate.evidence)}

Respond with ONLY a JSON object matching exactly this shape, no other text:
{
  "title": string (max 200 chars, plain language),
  "rationale": string (max 2000 chars, explain why this matters using only the evidence given),
  "category": "${candidate.category}",
  "priority": "LOW" | "MEDIUM" | "HIGH",
  "confidence": number between 0 and 1 reflecting how certain the evidence supports this,
  "evidenceIds": array of strings naming which evidence fields support the claim
}`;
}

/** A fixed, evidence-grounded recommendation used when no AI provider is available. */
function deterministicFallback(candidate: SeoIssueCandidate): AiRecommendationCandidate {
  const evidenceIds = Object.keys(candidate.evidence);
  const templates: Record<string, { title: string; rationale: string }> = {
    HIGH_VISIBILITY_LOW_CTR: {
      title: "Improve the title and description for a well-ranked page",
      rationale:
        "This query ranks well but its click-through rate is below the typical benchmark for that " +
        "position, based on the recorded impressions, clicks, and position. Rewriting the page title " +
        "and meta description to better match what searchers are looking for is a common way to close " +
        "that gap.",
    },
    STRIKING_DISTANCE_KEYWORD: {
      title: "Strengthen a page ranking just off page one",
      rationale:
        "This query ranks just outside the first page with meaningful search volume, based on the " +
        "recorded position and impressions. Improving on-page content for this query is often the " +
        "lowest-effort way to gain visibility, since the page is already close to ranking well.",
    },
  };
  const template = templates[candidate.code] ?? {
    title: `Review the detected ${candidate.category.toLowerCase()} issue`,
    rationale: `A deterministic rule (${candidate.code}) flagged this based on the recorded evidence.`,
  };

  return {
    title: template.title,
    rationale: template.rationale,
    category: candidate.category,
    priority: SEVERITY_TO_PRIORITY[candidate.severity],
    confidence: candidate.confidence,
    evidenceIds,
  };
}

/**
 * Generates recommendation wording for a deterministically-detected
 * issue. Always returns a schema-valid result — falls back to a fixed
 * template when every AI provider is unavailable or returns something
 * that doesn't validate, per docs/free-tooling.md's graceful-degradation
 * rule. AI never invents the underlying issue or its evidence — only
 * the wording around it.
 */
export async function generateRecommendation(
  candidate: SeoIssueCandidate,
): Promise<{ data: AiRecommendationCandidate; source: AiSource | "deterministic" }> {
  const result = await generateStructuredOutput(
    aiRecommendationCandidateSchema,
    buildPrompt(candidate),
  );
  if (result) return result;
  return { data: deterministicFallback(candidate), source: "deterministic" };
}
