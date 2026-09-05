import { UUID_RE, verifyInternalServiceSecret } from "@/lib/internal-service-auth";
import { runWebsiteAudit, WebsiteAuditError } from "@/lib/website-audit-sync";
import { db } from "@local-seo/db";
import { businesses } from "@local-seo/db/schema";
import { apiErrorSchema } from "@local-seo/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(apiErrorSchema.parse({ error: { code, message } }), { status });
}

const AUDIT_ERROR_STATUS: Record<WebsiteAuditError["code"], number> = {
  BUSINESS_NOT_FOUND: 404,
  NO_WEBSITE: 422,
  CRAWL_DISALLOWED: 422,
  CRAWL_FAILED: 502,
};

/**
 * POST /api/internal/businesses/:id/website-audit —
 * n8n/docs/03_crawl_website.md's trigger endpoint. Service-authenticated
 * equivalent of the "Run website audit" button's server action, which
 * requires a signed-in browser session. See the search-console-sync
 * route in this same directory tree for the identical auth pattern.
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
    const result = await runWebsiteAudit(business.organizationId, businessId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WebsiteAuditError) {
      return errorResponse(error.code, error.message, AUDIT_ERROR_STATUS[error.code]);
    }
    console.error(error);
    return errorResponse("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
