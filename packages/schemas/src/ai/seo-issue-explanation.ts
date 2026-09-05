import { z } from "zod";

/**
 * Raw structured output expected from the LLM when explaining an existing,
 * deterministically-detected SEO issue (docs/seo-engine.md: "AI may
 * explain: why score changed, what should be prioritized, what evidence
 * supports an issue"). The issue itself and its evidence are never
 * AI-generated — only the explanation text is.
 */
export const aiSeoIssueExplanationSchema = z.object({
  issueId: z.string().uuid(),
  explanation: z.string().min(1).max(2000),
  evidenceIds: z.array(z.string()).max(20),
  confidence: z.number().min(0).max(1),
});

export type AiSeoIssueExplanation = z.infer<typeof aiSeoIssueExplanationSchema>;
