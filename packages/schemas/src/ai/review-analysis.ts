import { reviewAnalysis } from "@local-seo/db/schema";
import { z } from "zod";

/**
 * Raw structured output expected from the LLM for review sentiment/topic
 * classification (an allowed AI task, docs/ai.md). Review text may be
 * English, Filipino, or Taglish — see docs/design.md localization rules.
 */
export const aiReviewAnalysisOutputSchema = z.object({
  sentiment: z.enum(reviewAnalysis.sentiment.enumValues),
  topics: z.array(z.string().max(100)).max(20),
  confidence: z.number().min(0).max(1),
});

export type AiReviewAnalysisOutput = z.infer<typeof aiReviewAnalysisOutputSchema>;
