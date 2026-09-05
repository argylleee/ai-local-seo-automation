import { z } from "zod";

/**
 * POST /api/internal/automation-runs/:id/events, per docs/api-contracts.md.
 *
 * The run ID is a URL path param and service authentication is a header —
 * both are validated by the route handler/middleware, not this schema.
 * This schema covers the event body only: event type, idempotency key
 * (replay protection, docs/security.md), and a bounded payload.
 */
export const automationRunEventRequestSchema = z.object({
  eventType: z.enum(["started", "progress", "succeeded", "failed"]),
  idempotencyKey: z.string().min(1).max(200),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type AutomationRunEventRequest = z.infer<typeof automationRunEventRequestSchema>;
