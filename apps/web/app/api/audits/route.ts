import { auth } from "@/lib/auth";
import { runSearchConsoleSync, SearchConsoleSyncError } from "@/lib/search-console-sync";
import { db } from "@local-seo/db";
import { seoAudits } from "@local-seo/db/schema";
import {
  apiErrorSchema,
  createAuditRequestSchema,
  createAuditResponseSchema,
} from "@local-seo/schemas";
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
 * POST /api/audits — docs/api-contracts.md.
 *
 * Runs synchronously today (no job queue yet) rather than truly
 * queueing: it calls the real Search Console API and typically
 * completes in a few seconds, well within a normal request timeout.
 * The response shape matches the documented contract either way — a
 * future move to real background processing wouldn't change callers.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.organizationId) {
    return errorResponse("UNAUTHORIZED", "You must be signed in.", 401);
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = createAuditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request body.",
      400,
    );
  }

  try {
    const { auditId } = await runSearchConsoleSync(session.organizationId, parsed.data.businessId);
    const [audit] = await db.select().from(seoAudits).where(eq(seoAudits.id, auditId)).limit(1);

    return NextResponse.json(
      createAuditResponseSchema.parse({
        id: audit!.id,
        status: audit!.status,
        createdAt: audit!.createdAt,
      }),
    );
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
