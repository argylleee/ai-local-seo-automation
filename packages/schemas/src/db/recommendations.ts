import { recommendationActions, recommendations } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zConfidence } from "./_numeric";

// docs/design.md: "Never show an AI recommendation without evidence" —
// `evidence` is required (not nullable/optional) at the schema level.
export const recommendationSelectSchema = createSelectSchema(recommendations, {
  evidence: z.record(z.string(), z.unknown()),
  confidence: zConfidence,
});
export const recommendationInsertSchema = createInsertSchema(recommendations, {
  evidence: z.record(z.string(), z.unknown()),
  confidence: zConfidence,
});

export const recommendationActionSelectSchema = createSelectSchema(recommendationActions, {
  result: z.record(z.string(), z.unknown()).optional(),
});
export const recommendationActionInsertSchema = createInsertSchema(recommendationActions, {
  result: z.record(z.string(), z.unknown()).optional(),
});

// A user approving/rejecting a recommendation action — the only client
// input allowed here; approvedByUserId is derived server-side from the
// session, never trusted from the request body (docs/security.md).
export const decideRecommendationActionRequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

export type Recommendation = z.infer<typeof recommendationSelectSchema>;
export type RecommendationAction = z.infer<typeof recommendationActionSelectSchema>;
