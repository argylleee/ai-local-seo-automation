import { seoAudits, seoIssues } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zNumeric } from "./_numeric";

export const seoAuditSelectSchema = createSelectSchema(seoAudits, {
  score: zNumeric,
});
export const seoAuditInsertSchema = createInsertSchema(seoAudits, {
  score: zNumeric,
});

// POST /api/audits request body, per docs/api-contracts.md.
export const createAuditRequestSchema = z.object({
  businessId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
});

// POST /api/audits response body, per docs/api-contracts.md.
export const createAuditResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(seoAudits.status.enumValues),
  createdAt: z.coerce.date(),
});

export const seoIssueSelectSchema = createSelectSchema(seoIssues, {
  // bounded structured evidence, never an unbounded raw payload — docs/database.md
  evidence: z.record(z.string(), z.unknown()),
});
export const seoIssueInsertSchema = createInsertSchema(seoIssues, {
  evidence: z.record(z.string(), z.unknown()),
});

export type SeoAudit = z.infer<typeof seoAuditSelectSchema>;
export type SeoIssue = z.infer<typeof seoIssueSelectSchema>;
