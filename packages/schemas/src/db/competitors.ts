import { competitorMetrics, competitors } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zNumeric } from "./_numeric";

export const competitorSelectSchema = createSelectSchema(competitors);
export const competitorInsertSchema = createInsertSchema(competitors, {
  website: (schema) => schema.website.url(),
});

export const createCompetitorRequestSchema = competitorInsertSchema.omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
});

// Only ever populated from real observed data — never fabricated, see
// docs/integrations.md "Data integrity rule".
export const competitorMetricSelectSchema = createSelectSchema(competitorMetrics, {
  value: zNumeric,
});
export const competitorMetricInsertSchema = createInsertSchema(competitorMetrics, {
  value: zNumeric,
});

export type Competitor = z.infer<typeof competitorSelectSchema>;
export type CompetitorMetric = z.infer<typeof competitorMetricSelectSchema>;
