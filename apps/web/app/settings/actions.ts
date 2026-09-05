"use server";

import { auth } from "@/lib/auth";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-oauth-constants";
import { runSearchConsoleSync, SearchConsoleSyncError } from "@/lib/search-console-sync";
import { db } from "@local-seo/db";
import { businesses, integrations } from "@local-seo/db/schema";
import {
  buildAuthorizationUrl,
  disconnectIntegration,
  SEARCH_CONSOLE_SCOPE,
} from "@local-seo/integrations";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

/**
 * Redirects to Google's consent screen for a Search Console connection.
 * The state param is verified on callback (route.ts) against the value
 * stored in a short-lived httpOnly cookie here — CSRF protection for the
 * OAuth flow, per docs/security.md's webhook/callback authentication
 * expectations.
 */
export async function connectGoogleSearchConsole(businessId: string): Promise<void> {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(
      and(eq(businesses.id, businessId), eq(businesses.organizationId, session.organizationId)),
    )
    .limit(1);

  if (!business) {
    redirect("/settings?integration_error=unknown_business");
  }

  const nonce = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const state = `${businessId}:${nonce}`;
  redirect(buildAuthorizationUrl({ scopes: [SEARCH_CONSOLE_SCOPE], state }));
}

export async function disconnectGoogleSearchConsole(integrationId: string): Promise<void> {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const [integration] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.id, integrationId),
        eq(integrations.organizationId, session.organizationId),
      ),
    )
    .limit(1);

  if (integration) {
    await disconnectIntegration(session.organizationId, integrationId);
  }

  redirect("/settings");
}

export async function syncGoogleSearchConsole(businessId: string): Promise<void> {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  let result: Awaited<ReturnType<typeof runSearchConsoleSync>>;
  try {
    result = await runSearchConsoleSync(session.organizationId, businessId);
  } catch (error) {
    if (error instanceof SearchConsoleSyncError) {
      redirect(
        `/settings?integration_error=sync_failed&sync_message=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  redirect(
    `/settings?synced=1&sync_rows=${result.rowCount}&sync_issues=${result.issueCount}&sync_recommendations=${result.recommendationCount}`,
  );
}
