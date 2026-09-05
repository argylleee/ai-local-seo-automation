import { db } from "@local-seo/db";
import { integrations, oauthConnections } from "@local-seo/db/schema";
import { and, eq } from "drizzle-orm";
import { decryptToken, encryptToken } from "./crypto";
import { refreshAccessToken, type GoogleTokenResponse } from "./google-oauth";

type IntegrationProvider = (typeof integrations.$inferSelect)["provider"];

/**
 * Persists a newly-connected integration: upserts the `integrations` row
 * to "connected" and writes an oauth_connections row with encrypted
 * tokens. Called only from the OAuth callback route — never from a
 * client component (docs/security.md: never expose tokens to the
 * browser).
 */
export async function saveConnection(input: {
  organizationId: string;
  businessId: string;
  provider: IntegrationProvider;
  externalAccountId?: string;
  tokens: GoogleTokenResponse;
}): Promise<{ integrationId: string }> {
  const [integration] = await db
    .insert(integrations)
    .values({
      organizationId: input.organizationId,
      businessId: input.businessId,
      provider: input.provider,
      status: "connected",
      externalAccountId: input.externalAccountId,
      lastSyncedAt: new Date(),
    })
    .returning();
  const integrationId = integration!.id;

  await db.insert(oauthConnections).values({
    organizationId: input.organizationId,
    integrationId,
    provider: input.provider,
    accessTokenEncrypted: encryptToken(input.tokens.access_token),
    refreshTokenEncrypted: input.tokens.refresh_token
      ? encryptToken(input.tokens.refresh_token)
      : null,
    scope: input.tokens.scope,
    expiresAt: new Date(Date.now() + input.tokens.expires_in * 1000),
  });

  return { integrationId };
}

const REFRESH_SKEW_MS = 60_000; // refresh a little before actual expiry

/**
 * Returns a valid (decrypted) access token for this integration,
 * transparently refreshing and re-persisting it if it's expired or
 * about to expire. Server-only — the caller must never forward the
 * returned token to a client component or API response.
 */
export async function getValidAccessToken(integrationId: string): Promise<string> {
  const [connection] = await db
    .select()
    .from(oauthConnections)
    .where(eq(oauthConnections.integrationId, integrationId))
    .limit(1);

  if (!connection) {
    throw new Error(`No oauth connection found for integration ${integrationId}`);
  }

  const expiresAt = connection.expiresAt?.getTime() ?? 0;
  const needsRefresh = expiresAt - REFRESH_SKEW_MS <= Date.now();

  if (!needsRefresh) {
    return decryptToken(connection.accessTokenEncrypted);
  }

  if (!connection.refreshTokenEncrypted) {
    throw new Error(
      `Access token for integration ${integrationId} expired and no refresh token is stored.`,
    );
  }

  const refreshToken = decryptToken(connection.refreshTokenEncrypted);
  const refreshed = await refreshAccessToken(refreshToken);

  await db
    .update(oauthConnections)
    .set({
      accessTokenEncrypted: encryptToken(refreshed.access_token),
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    })
    .where(eq(oauthConnections.id, connection.id));

  return refreshed.access_token;
}

/** Marks an integration disconnected. Historical data is kept — see docs/database.md. */
export async function disconnectIntegration(
  organizationId: string,
  integrationId: string,
): Promise<void> {
  await db
    .update(integrations)
    .set({ status: "disconnected" })
    .where(
      and(eq(integrations.id, integrationId), eq(integrations.organizationId, organizationId)),
    );
}
