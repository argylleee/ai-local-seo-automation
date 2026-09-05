import { reviewAnalysis, reviews } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zConfidence } from "./_numeric";

export const reviewSelectSchema = createSelectSchema(reviews);
export const reviewInsertSchema = createInsertSchema(reviews);

export const reviewAnalysisSelectSchema = createSelectSchema(reviewAnalysis, {
  // bounded array of topic strings, not free-form text — docs/database.md
  topics: z.array(z.string().max(100)).max(20),
  confidence: zConfidence,
});
export const reviewAnalysisInsertSchema = createInsertSchema(reviewAnalysis, {
  topics: z.array(z.string().max(100)).max(20),
  confidence: zConfidence,
});

export type Review = z.infer<typeof reviewSelectSchema>;
export type ReviewAnalysis = z.infer<typeof reviewAnalysisSelectSchema>;
