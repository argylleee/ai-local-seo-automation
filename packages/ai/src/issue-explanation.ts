import { aiSeoIssueExplanationSchema, type AiSeoIssueExplanation } from "@local-seo/schemas";
import type { SeoIssueCandidate } from "@local-seo/seo-engine";
import { generateStructuredOutput, type AiSource } from "./generate-structured-output";

function buildPrompt(issueId: string, candidate: SeoIssueCandidate): string {
  return `You are an SEO analyst explaining why an already-detected issue matters, to a Philippine small business owner with no SEO background.

The issue and its evidence were found by a deterministic rule — do not invent additional facts, and do not guarantee any ranking or traffic outcome.

Issue code: ${candidate.code}
Category: ${candidate.category}
Severity: ${candidate.severity}
Evidence: ${JSON.stringify(candidate.evidence)}

Respond with ONLY a JSON object matching exactly this shape, no other text:
{
  "issueId": "${issueId}",
  "explanation": string (max 2000 chars, plain language, based only on the evidence given),
  "evidenceIds": array of strings naming which evidence fields support the explanation,
  "confidence": number between 0 and 1
}`;
}

/** A plain recitation of the evidence, used when no AI provider is available. */
function deterministicFallback(
  issueId: string,
  candidate: SeoIssueCandidate,
): AiSeoIssueExplanation {
  const evidenceIds = Object.keys(candidate.evidence);
  const evidenceSummary = evidenceIds
    .map((key) => `${key}: ${JSON.stringify(candidate.evidence[key])}`)
    .join(", ");

  return {
    issueId,
    explanation: `Rule ${candidate.code} (${candidate.severity} severity) was triggered based on: ${evidenceSummary}.`,
    evidenceIds,
    confidence: candidate.confidence,
  };
}

/**
 * Explains a deterministically-detected issue in plain language. Always
 * returns a schema-valid result — falls back to a plain recitation of
 * the evidence when no AI provider is available, per
 * docs/free-tooling.md's graceful-degradation rule.
 */
export async function explainIssue(
  issueId: string,
  candidate: SeoIssueCandidate,
): Promise<{ data: AiSeoIssueExplanation; source: AiSource | "deterministic" }> {
  const result = await generateStructuredOutput(
    aiSeoIssueExplanationSchema,
    buildPrompt(issueId, candidate),
  );
  if (result) return result;
  return { data: deterministicFallback(issueId, candidate), source: "deterministic" };
}
