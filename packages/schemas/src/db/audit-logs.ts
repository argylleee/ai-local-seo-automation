import { auditLogs } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const auditLogSelectSchema = createSelectSchema(auditLogs, {
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export const auditLogInsertSchema = createInsertSchema(auditLogs, {
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AuditLog = z.infer<typeof auditLogSelectSchema>;
