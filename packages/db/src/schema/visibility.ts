import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { organizations } from "./organizations";

/**
 * Manual stand-in for Google Business Profile Insights while GBP API
 * access is pending Google's approval (docs/integrations.md). The
 * business owner reads these numbers off their own GBP dashboard (or a
 * manual map-pack search) and logs them here — same "manual entry,
 * never fabricated" pattern as competitor_metrics. Once GBP access is
 * approved, an automated sync can insert rows here with
 * source = "google_business_profile" instead of "manual", with no
 * schema change needed.
 */
export const businessVisibilitySnapshots = pgTable(
  "business_visibility_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    metricType: text("metric_type").notNull(),
    value: numeric("value", { precision: 12, scale: 4 }).notNull(),
    unit: text("unit"),
    // Only meaningful for map_pack_position — the search term checked.
    keyword: text("keyword"),
    notes: text("notes"),
    source: text("source").notNull().default("manual"),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("business_visibility_snapshots_organization_id_idx").on(t.organizationId),
    index("business_visibility_snapshots_business_id_idx").on(t.businessId),
  ],
);
