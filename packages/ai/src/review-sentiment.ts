import { aiReviewAnalysisOutputSchema, type AiReviewAnalysisOutput } from "@local-seo/schemas";
import { generateStructuredOutput, type AiSource } from "./generate-structured-output";

function buildPrompt(reviewText: string): string {
  return `You are classifying a customer review for a Philippine local business. Reviews may be in English, Filipino, or Taglish (mixed).

Base your answer only on the review text below — do not assume facts not stated in it.

Review: ${JSON.stringify(reviewText)}

Respond with ONLY a JSON object matching exactly this shape, no other text:
{
  "sentiment": "positive" | "neutral" | "negative",
  "topics": array of up to 20 short lowercase topic strings (e.g. "service", "price", "wait_time"),
  "confidence": number between 0 and 1
}`;
}

// Small bilingual keyword lists — not a real sentiment model, just
// enough signal to degrade gracefully when no AI provider is available.
const POSITIVE_WORDS = [
  "good",
  "great",
  "excellent",
  "love",
  "friendly",
  "recommend",
  "maganda",
  "mabait",
  "bait",
  "galing",
  "masarap",
  "salamat",
];
const NEGATIVE_WORDS = [
  "bad",
  "poor",
  "terrible",
  "slow",
  "rude",
  "worst",
  "pangit",
  "mabagal",
  "tagal",
  "sobrang tagal",
  "masama",
];

/** A crude keyword heuristic used when no AI provider is available. */
function deterministicFallback(reviewText: string): AiReviewAnalysisOutput {
  const lower = reviewText.toLowerCase();
  const positiveHits = POSITIVE_WORDS.filter((word) => lower.includes(word)).length;
  const negativeHits = NEGATIVE_WORDS.filter((word) => lower.includes(word)).length;

  const sentiment =
    positiveHits === negativeHits
      ? "neutral"
      : positiveHits > negativeHits
        ? "positive"
        : "negative";

  return {
    sentiment,
    topics: [],
    // Deliberately low — a keyword count is a weak signal, and this
    // must not be presented as statistical certainty (docs/security.md).
    confidence: 0.5,
  };
}

/**
 * Classifies a review's sentiment/topics. Always returns a schema-valid
 * result — falls back to a bilingual keyword heuristic when no AI
 * provider is available, per docs/free-tooling.md.
 */
export async function classifyReviewSentiment(
  reviewText: string,
): Promise<{ data: AiReviewAnalysisOutput; source: AiSource | "deterministic" }> {
  const result = await generateStructuredOutput(
    aiReviewAnalysisOutputSchema,
    buildPrompt(reviewText),
  );
  if (result) return result;
  return { data: deterministicFallback(reviewText), source: "deterministic" };
}
