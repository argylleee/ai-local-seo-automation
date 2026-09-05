import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { integrations } from "./integrations";
import { organizations } from "./organizations";
import { timestamps } from "./_shared";

export const keywords = pgTable(
  "keywords",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    locale: text("locale").notNull().default("en-PH"),
    ...timestamps,
  },
  (t) => [
    index("keywords_organization_id_idx").on(t.organizationId),
    uniqueIndex("keywords_business_id_term_idx").on(t.businessId, t.term),
  ],
);

// Rankings are only ever populated from real, non-fabricated sources
// (e.g. Search Console average position) — see docs/integrations.md.
export const keywordRankings = pgTable(
  "keyword_rankings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    keywordId: uuid("keyword_id")
      .notNull()
      .references(() => keywords.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    position: numeric("position", { precision: 6, scale: 2 }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("keyword_rankings_organization_id_idx").on(t.organizationId),
    index("keyword_rankings_keyword_id_idx").on(t.keywordId),
  ],
);

export const searchConsoleMetrics = pgTable(
  "search_console_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id").references(() => integrations.id, {
      onDelete: "set null",
    }),
    query: text("query"),
    page: text("page"),
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: numeric("ctr", { precision: 6, scale: 4 }),
    averagePosition: numeric("average_position", { precision: 6, scale: 2 }),
    date: date("date").notNull(),
    source: text("source").notNull().default("google_search_console"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("search_console_metrics_organization_id_idx").on(t.organizationId),
    index("search_console_metrics_business_id_date_idx").on(t.businessId, t.date),
  ],
);
