import { index, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { businessLocations, businesses } from "./businesses";
import { organizations } from "./organizations";
import { timestamps } from "./_shared";

export const seoAuditStatusEnum = pgEnum("seo_audit_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const seoAudits = pgTable(
  "seo_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => businessLocations.id, {
      onDelete: "set null",
    }),
    url: text("url"),
    status: seoAuditStatusEnum("status").notNull().default("pending"),
    // deterministic weighted score — never AI-assigned, see docs/seo-engine.md
    score: numeric("score", { precision: 5, scale: 2 }),
    source: text("source").notNull().default("crawler"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("seo_audits_organization_id_idx").on(t.organizationId),
    index("seo_audits_business_id_idx").on(t.businessId),
  ],
);

export const seoIssueCategoryEnum = pgEnum("seo_issue_category", [
  "LOCAL_VISIBILITY",
  "BUSINESS_PROFILE",
  "REVIEWS",
  "ON_PAGE",
  "TECHNICAL",
  "CONTENT",
  "KEYWORDS",
  "PERFORMANCE",
  "INTERNAL_LINKING",
  "COMPETITOR",
]);

export const seoIssueSeverityEnum = pgEnum("seo_issue_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const seoIssueStatusEnum = pgEnum("seo_issue_status", [
  "open",
  "acknowledged",
  "resolved",
  "dismissed",
]);

export const seoIssues = pgTable(
  "seo_issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => seoAudits.id, { onDelete: "cascade" }),
    category: seoIssueCategoryEnum("category").notNull(),
    // deterministic rule identifier, e.g. HIGH_VISIBILITY_LOW_CTR
    code: text("code").notNull(),
    severity: seoIssueSeverityEnum("severity").notNull(),
    // bounded, structured rule inputs — not an unbounded raw payload dump
    evidence: jsonb("evidence").notNull(),
    status: seoIssueStatusEnum("status").notNull().default("open"),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("seo_issues_organization_id_idx").on(t.organizationId),
    index("seo_issues_audit_id_idx").on(t.auditId),
  ],
);
