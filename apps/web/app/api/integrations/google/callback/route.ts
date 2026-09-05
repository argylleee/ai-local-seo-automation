import { auth } from "@/lib/auth";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-oauth-constants";
import { db } from "@local-seo/db";
import { businesses } from "@local-seo/db/schema";
import { exchangeCodeForTokens, saveConnection } from "@local-seo/integrations";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * OAuth callback for connecting Search Console. Google redirects the
 * browser here with `code`/`state` (or `error` if the user declined).
 * This must be a real route, not a server action — third-party OAuth
 * redirects can't target a server action directly.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.organizationId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const { searchParams } = request.nextUrl;

  if (searchParams.get("error")) {
    return NextResponse.redirect(
      new URL("/settings?integration_error=consent_declined", request.url),
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings?integration_error=missing_params", request.url),
    );
  }

  const [businessId, nonce] = state.split(":");
  const cookieStore = await cookies();
  const expectedNonce = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!businessId || !nonce || nonce !== expectedNonce) {
    return NextResponse.redirect(new URL("/settings?integration_error=invalid_state", request.url));
  }

  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(
      and(eq(businesses.id, businessId), eq(businesses.organizationId, session.organizationId)),
    )
    .limit(1);

  if (!business) {
    return NextResponse.redirect(
      new URL("/settings?integration_error=unknown_business", request.url),
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveConnection({
      organizationId: session.organizationId,
      businessId,
      provider: "google_search_console",
      tokens,
    });
  } catch {
    // Never surface the underlying error (may reference the exchanged
    // code/tokens) to the client — docs/api-contracts.md.
    return NextResponse.redirect(
      new URL("/settings?integration_error=connect_failed", request.url),
    );
  }

  return NextResponse.redirect(new URL("/settings?connected=google_search_console", request.url));
}
