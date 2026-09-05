import { automationRunEvents, automationRuns, notifications } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const automationRunSelectSchema = createSelectSchema(automationRuns);
export const automationRunInsertSchema = createInsertSchema(automationRuns);

export const automationRunEventSelectSchema = createSelectSchema(automationRunEvents);
export const automationRunEventInsertSchema = createInsertSchema(automationRunEvents);

export const notificationSelectSchema = createSelectSchema(notifications);
export const notificationInsertSchema = createInsertSchema(notifications);

export type AutomationRun = z.infer<typeof automationRunSelectSchema>;
export type AutomationRunEvent = z.infer<typeof automationRunEventSelectSchema>;
export type Notification = z.infer<typeof notificationSelectSchema>;
