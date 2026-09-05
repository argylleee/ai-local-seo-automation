import { index, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { organizations, users } from "./organizations";
import { timestamps } from "./_shared";

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    website: text("website"),
    phone: text("phone"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("businesses_organization_id_idx").on(t.organizationId)],
);

export const businessLocations = pgTable(
  "business_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    province: text("province"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country").notNull().default("PH"),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    googlePlaceId: text("google_place_id"),
    timezone: text("timezone").notNull().default("Asia/Manila"),
    ...timestamps,
  },
  (t) => [
    index("business_locations_organization_id_idx").on(t.organizationId),
    index("business_locations_business_id_idx").on(t.businessId),
  ],
);
