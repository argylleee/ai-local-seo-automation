import { keywordRankings, keywords, searchConsoleMetrics } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zNumeric } from "./_numeric";

export const keywordSelectSchema = createSelectSchema(keywords);
export const keywordInsertSchema = createInsertSchema(keywords);

export const createKeywordRequestSchema = keywordInsertSchema.omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
});

// Populated only from real sources (e.g. Search Console) — never fabricated,
// see docs/integrations.md "Data integrity rule".
export const keywordRankingSelectSchema = createSelectSchema(keywordRankings, {
  position: zNumeric,
});
export const keywordRankingInsertSchema = createInsertSchema(keywordRankings, {
  position: zNumeric,
});

export const searchConsoleMetricSelectSchema = createSelectSchema(searchConsoleMetrics, {
  ctr: zNumeric,
  averagePosition: zNumeric,
});
export const searchConsoleMetricInsertSchema = createInsertSchema(searchConsoleMetrics, {
  ctr: zNumeric,
  averagePosition: zNumeric,
});

export type Keyword = z.infer<typeof keywordSelectSchema>;
export type KeywordRanking = z.infer<typeof keywordRankingSelectSchema>;
export type SearchConsoleMetric = z.infer<typeof searchConsoleMetricSelectSchema>;
