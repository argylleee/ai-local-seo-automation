import { automationRuns, notifications } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const automationRunSelectSchema = createSelectSchema(automationRuns);
export const automationRunInsertSchema = createInsertSchema(automationRuns);

export const notificationSelectSchema = createSelectSchema(notifications);
export const notificationInsertSchema = createInsertSchema(notifications);

export type AutomationRun = z.infer<typeof automationRunSelectSchema>;
export type Notification = z.infer<typeof notificationSelectSchema>;
