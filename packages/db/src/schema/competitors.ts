import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { organizations } from "./organizations";
import { timestamps } from "./_shared";

export const competitors = pgTable(
  "competitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    website: text("website"),
    googlePlaceId: text("google_place_id"),
    ...timestamps,
  },
  (t) => [
    index("competitors_organization_id_idx").on(t.organizationId),
    index("competitors_business_id_idx").on(t.businessId),
  ],
);

// Only ever populated from real observed data — never fabricated,
// see the data integrity rule in docs/integrations.md.
export const competitorMetrics = pgTable(
  "competitor_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    competitorId: uuid("competitor_id")
      .notNull()
      .references(() => competitors.id, { onDelete: "cascade" }),
    metricType: text("metric_type").notNull(),
    value: numeric("value", { precision: 12, scale: 4 }).notNull(),
    unit: text("unit"),
    source: text("source").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("competitor_metrics_organization_id_idx").on(t.organizationId),
    index("competitor_metrics_competitor_id_idx").on(t.competitorId),
  ],
);
