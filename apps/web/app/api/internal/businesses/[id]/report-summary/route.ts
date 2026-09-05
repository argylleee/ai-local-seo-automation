import { UUID_RE, verifyInternalServiceSecret } from "@/lib/internal-service-auth";
import { getReportSummary } from "@/lib/report-summary";
import { db } from "@local-seo/db";
import { businesses } from "@local-seo/db/schema";
import { apiErrorSchema } from "@local-seo/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(apiErrorSchema.parse({ error: { code, message } }), { status });
}

/**
 * GET /api/internal/businesses/:id/report-summary —
 * n8n/docs/06_send_report.md's data source. Read-only: returns the
 * same score history / open-issues-by-category / recommendation-status
 * data as the Reports page (app/reports/page.tsx), via the shared
 * lib/report-summary.ts so the two never drift apart.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const providedSecret = request.headers.get("x-internal-secret");
  if (!verifyInternalServiceSecret(providedSecret)) {
    return errorResponse("UNAUTHORIZED", "Invalid or missing service credentials.", 401);
  }

  const { id: businessId } = await params;
  if (!UUID_RE.test(businessId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid business ID.", 400);
  }

  const [business] = await db
    .select({ id: businesses.id, name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (!business) {
    return errorResponse("BUSINESS_NOT_FOUND", "Business not found.", 404);
  }

  const summary = await getReportSummary(businessId);
  return NextResponse.json({ business: { id: business.id, name: business.name }, ...summary });
}
