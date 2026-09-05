import {
  boolean,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { organizations, users } from "./organizations";
import { seoIssueCategoryEnum, seoIssues } from "./seo";
import { timestamps } from "./_shared";

export const recommendationImpactEnum = pgEnum("recommendation_impact", ["low", "medium", "high"]);

export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "pending",
  "approved",
  "rejected",
  "completed",
]);

// A recommendation card always carries its evidence — see docs/design.md:
// "Never show an AI recommendation without evidence."
export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    sourceIssueId: uuid("source_issue_id").references(() => seoIssues.id, {
      onDelete: "set null",
    }),
    category: seoIssueCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    evidence: jsonb("evidence").notNull(),
    impact: recommendationImpactEnum("impact").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    recommendedAction: text("recommended_action").notNull(),
    status: recommendationStatusEnum("status").notNull().default("pending"),
    aiGenerated: boolean("ai_generated").notNull().default(true),
    modelName: text("model_name"),
    ...timestamps,
  },
  (t) => [
    index("recommendations_organization_id_idx").on(t.organizationId),
    index("recommendations_business_id_idx").on(t.businessId),
  ],
);

export const recommendationActionStatusEnum = pgEnum("recommendation_action_status", [
  "pending_approval",
  "approved",
  "executing",
  "completed",
  "failed",
  "rejected",
]);

// Externally visible actions require explicit human approval — see
// AGENTS.md rule 14 and docs/security.md "External actions".
export const recommendationActions = pgTable(
  "recommendation_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendations.id, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    status: recommendationActionStatusEnum("status").notNull().default("pending_approval"),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    result: jsonb("result"),
    ...timestamps,
  },
  (t) => [
    index("recommendation_actions_organization_id_idx").on(t.organizationId),
    index("recommendation_actions_recommendation_id_idx").on(t.recommendationId),
  ],
);
