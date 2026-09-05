import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { integrations } from "./integrations";
import { organizations, users } from "./organizations";

export const automationRunStatusEnum = pgEnum("automation_run_status", [
  "started",
  "succeeded",
  "failed",
]);

// n8n is not the source of truth (docs/architecture.md) — this table only
// records run outcomes for observability, not workflow definitions.
export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id").references(() => integrations.id, {
      onDelete: "set null",
    }),
    workflowName: text("workflow_name").notNull(),
    triggeredBy: text("triggered_by").notNull(),
    status: automationRunStatusEnum("status").notNull().default("started"),
    // use this instead of logging sensitive payloads, see docs/security.md
    correlationId: text("correlation_id").notNull(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("automation_runs_organization_id_idx").on(t.organizationId),
    index("automation_runs_correlation_id_idx").on(t.correlationId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // null means organization-wide rather than addressed to one user
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_organization_id_idx").on(t.organizationId),
    index("notifications_user_id_idx").on(t.userId),
  ],
);
