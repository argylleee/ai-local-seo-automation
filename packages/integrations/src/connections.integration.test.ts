import { db } from "@local-seo/db";
import { businesses, integrations, oauthConnections, organizations } from "@local-seo/db/schema";
import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { decryptToken } from "./crypto";
import { disconnectIntegration, getValidAccessToken, saveConnection } from "./connections";
import * as googleOauth from "./google-oauth";

let organizationId: string;
let businessId: string;

beforeAll(async () => {
  const [organization] = await db
    .insert(organizations)
    .values({ name: "Integration Test Org", slug: `integration-test-${Date.now()}` })
    .returning();
  organizationId = organization!.id;

  const [business] = await db
    .insert(businesses)
    .values({ organizationId, name: "Test Sari-Sari Store" })
    .returning();
  businessId = business!.id;
});

afterAll(async () => {
  await db.delete(organizations).where(eq(organizations.id, organizationId));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveConnection + getValidAccessToken (real Postgres)", () => {
  it("stores tokens encrypted at rest and returns the decrypted access token", async () => {
    const { integrationId } = await saveConnection({
      organizationId,
      businessId,
      provider: "google_search_console",
      externalAccountId: "https://example.ph/",
      tokens: {
        access_token: "initial-access-token",
        refresh_token: "initial-refresh-token",
        expires_in: 3600,
        scope: "https://www.googleapis.com/auth/webmasters.readonly",
        token_type: "Bearer",
      },
    });

    const [row] = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.integrationId, integrationId));

    // docs/security.md: tokens must be encrypted at rest — assert the
    // stored column is NOT the plaintext token.
    expect(row?.accessTokenEncrypted).not.toBe("initial-access-token");
    expect(decryptToken(row!.accessTokenEncrypted)).toBe("initial-access-token");

    const accessToken = await getValidAccessToken(integrationId);
    expect(accessToken).toBe("initial-access-token");
  });

  it("transparently refreshes an expired access token and persists the new one", async () => {
    const { integrationId } = await saveConnection({
      organizationId,
      businessId,
      provider: "google_search_console",
      tokens: {
        access_token: "will-expire-soon",
        refresh_token: "refresh-for-renewal",
        expires_in: -10, // already expired
        scope: "https://www.googleapis.com/auth/webmasters.readonly",
        token_type: "Bearer",
      },
    });

    vi.spyOn(googleOauth, "refreshAccessToken").mockResolvedValue({
      access_token: "renewed-access-token",
      expires_in: 3600,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      token_type: "Bearer",
    });

    const accessToken = await getValidAccessToken(integrationId);
    expect(accessToken).toBe("renewed-access-token");

    const [row] = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.integrationId, integrationId));
    expect(decryptToken(row!.accessTokenEncrypted)).toBe("renewed-access-token");
  });
});

describe("saveConnection reconnection (real Postgres)", () => {
  it("upserts rather than duplicating rows when reconnecting the same business/provider", async () => {
    const first = await saveConnection({
      organizationId,
      businessId,
      provider: "google_business_profile",
      tokens: {
        access_token: "first-token",
        expires_in: 3600,
        scope: "",
        token_type: "Bearer",
      },
    });

    await disconnectIntegration(organizationId, first.integrationId);

    const second = await saveConnection({
      organizationId,
      businessId,
      provider: "google_business_profile",
      tokens: {
        access_token: "second-token",
        expires_in: 3600,
        scope: "",
        token_type: "Bearer",
      },
    });

    expect(second.integrationId).toBe(first.integrationId);

    const rows = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.businessId, businessId),
          eq(integrations.provider, "google_business_profile"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("connected");

    const connectionRows = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.integrationId, first.integrationId));
    expect(connectionRows).toHaveLength(1);
    expect(decryptToken(connectionRows[0]!.accessTokenEncrypted)).toBe("second-token");
  });
});

describe("disconnectIntegration (real Postgres)", () => {
  it("marks the integration disconnected without deleting historical data", async () => {
    const { integrationId } = await saveConnection({
      organizationId,
      businessId,
      provider: "pagespeed_insights",
      tokens: {
        access_token: "token",
        expires_in: 3600,
        scope: "",
        token_type: "Bearer",
      },
    });

    await disconnectIntegration(organizationId, integrationId);

    const [row] = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.integrationId, integrationId));
    // the connection row (and its history) is untouched — only the
    // integrations.status flips, per docs/database.md's deletion rule
    expect(row).toBeDefined();
  });
});
