import { db } from "@local-seo/db";
import { automationRunEvents, automationRuns, notifications } from "@local-seo/db/schema";
import { createLogger } from "@local-seo/logger";
import type { AutomationRunEventRequest } from "@local-seo/schemas";
import { eq } from "drizzle-orm";

const logger = createLogger({ module: "automation-run-events" });

export class AutomationRunEventError extends Error {
  constructor(
    public readonly code: "RUN_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "AutomationRunEventError";
  }
}

const EVENT_TO_STATUS = {
  started: "started",
  progress: "started",
  succeeded: "succeeded",
  failed: "failed",
} as const;

function failureMessage(payload: AutomationRunEventRequest["payload"]): string {
  return typeof payload?.message === "string" ? payload.message : "Automation run failed.";
}

/**
 * Applies one n8n callback event to its automation_runs row, per
 * docs/api-contracts.md. Idempotency key is enforced via a unique
 * constraint on automation_run_events (docs/security.md: "Add replay
 * protection/idempotency for important events") — a retried event is
 * detected here and applied at most once.
 */
export async function recordAutomationRunEvent(
  automationRunId: string,
  event: AutomationRunEventRequest,
): Promise<{ deduplicated: boolean }> {
  const [run] = await db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.id, automationRunId))
    .limit(1);
  if (!run) {
    throw new AutomationRunEventError("RUN_NOT_FOUND", "Automation run not found.");
  }

  const inserted = await db
    .insert(automationRunEvents)
    .values({
      automationRunId,
      idempotencyKey: event.idempotencyKey,
      eventType: event.eventType,
    })
    .onConflictDoNothing({
      target: [automationRunEvents.automationRunId, automationRunEvents.idempotencyKey],
    })
    .returning({ id: automationRunEvents.id });

  if (inserted.length === 0) {
    logger.info("Duplicate automation run event ignored", {
      automationRunId,
      idempotencyKey: event.idempotencyKey,
    });
    return { deduplicated: true };
  }

  const isTerminal = event.eventType === "succeeded" || event.eventType === "failed";
  const updates: Partial<typeof automationRuns.$inferInsert> = {
    status: EVENT_TO_STATUS[event.eventType],
  };
  if (isTerminal) updates.finishedAt = new Date();
  if (event.eventType === "failed") updates.errorMessage = failureMessage(event.payload);

  await db.update(automationRuns).set(updates).where(eq(automationRuns.id, automationRunId));

  if (isTerminal) {
    await db.insert(notifications).values({
      organizationId: run.organizationId,
      userId: null,
      type: event.eventType === "succeeded" ? "automation_succeeded" : "automation_failed",
      title:
        event.eventType === "succeeded"
          ? `${run.workflowName} completed`
          : `${run.workflowName} failed`,
      body: event.eventType === "failed" ? failureMessage(event.payload) : null,
    });
  }

  logger.info("Recorded automation run event", {
    automationRunId,
    eventType: event.eventType,
  });
  return { deduplicated: false };
}
