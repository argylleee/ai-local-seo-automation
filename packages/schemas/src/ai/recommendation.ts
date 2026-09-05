import { seoIssues } from "@local-seo/db/schema";
import { z } from "zod";

/**
 * Raw structured output expected from the LLM when generating a
 * recommendation candidate — matches the example in docs/ai.md exactly.
 *
 * This is NOT the persisted `recommendations` row shape (see
 * ../db/recommendations.ts). The SEO engine maps this AI output onto a DB
 * row after deterministic priority calculation and schema validation —
 * see the pipeline in docs/seo-engine.md. AI output is never persisted
 * directly; treat it as untrusted per docs/security.md.
 */
export const aiRecommendationCandidateSchema = z.object({
  title: z.string().min(1).max(200),
  rationale: z.string().min(1).max(2000),
  category: z.enum(seoIssues.category.enumValues),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string()).max(20),
});

export type AiRecommendationCandidate = z.infer<typeof aiRecommendationCandidateSchema>;
