import { runSearchConsoleSync, SearchConsoleSyncError } from "@/lib/search-console-sync";
import { UUID_RE, verifyInternalServiceSecret } from "@/lib/internal-service-auth";
import { db } from "@local-seo/db";
import { businesses } from "@local-seo/db/schema";
import { apiErrorSchema } from "@local-seo/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(apiErrorSchema.parse({ error: { code, message } }), { status });
}

const SYNC_ERROR_STATUS: Record<SearchConsoleSyncError["code"], number> = {
  BUSINESS_NOT_FOUND: 404,
  NOT_CONNECTED: 409,
  SITE_NOT_MATCHED: 422,
};

/**
 * POST /api/internal/businesses/:id/search-console-sync —
 * n8n/docs/01_sync_search_console.md's trigger endpoint. The
 * service-authenticated equivalent of POST /api/audits: that route
 * requires a signed-in browser session, which n8n doesn't have, so
 * this authenticates with the same shared secret as the
 * automation-run-events callback instead. Not documented in
 * docs/api-contracts.md's public contract section — this is an
 * internal, n8n-only endpoint per that doc's "Internal n8n callback"
 * pattern.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const providedSecret = request.headers.get("x-internal-secret");
  if (!verifyInternalServiceSecret(providedSecret)) {
    return errorResponse("UNAUTHORIZED", "Invalid or missing service credentials.", 401);
  }

  const { id: businessId } = await params;
  if (!UUID_RE.test(businessId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid business ID.", 400);
  }

  const [business] = await db
    .select({ organizationId: businesses.organizationId })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (!business) {
    return errorResponse("BUSINESS_NOT_FOUND", "Business not found.", 404);
  }

  try {
    const result = await runSearchConsoleSync(business.organizationId, businessId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SearchConsoleSyncError) {
      return errorResponse(error.code, error.message, SYNC_ERROR_STATUS[error.code]);
    }
    // Never surface the underlying error message — docs/api-contracts.md:
    // "Do not expose stack traces."
    console.error(error);
    return errorResponse("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
