import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { organizations } from "./organizations";
import { timestamps } from "./_shared";

export const integrationProviderEnum = pgEnum("integration_provider", [
  "google_search_console",
  "google_business_profile",
  "pagespeed_insights",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "pending",
  "connected",
  "error",
  "disconnected",
]);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    status: integrationStatusEnum("status").notNull().default("pending"),
    // e.g. GSC property URL, or GBP location resource name
    externalAccountId: text("external_account_id"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("integrations_organization_id_idx").on(t.organizationId),
    index("integrations_business_id_idx").on(t.businessId),
  ],
);

/**
 * Access/refresh tokens are encrypted at rest by the application layer
 * (see packages/integrations) before being written here. This table
 * never stores plaintext tokens and must never be read by the browser.
 */
export const oauthConnections = pgTable(
  "oauth_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    scope: text("scope"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("oauth_connections_organization_id_idx").on(t.organizationId),
    index("oauth_connections_integration_id_idx").on(t.integrationId),
  ],
);
