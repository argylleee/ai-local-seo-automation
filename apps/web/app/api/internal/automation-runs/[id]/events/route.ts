import { AutomationRunEventError, recordAutomationRunEvent } from "@/lib/automation-run-events";
import { UUID_RE, verifyInternalServiceSecret } from "@/lib/internal-service-auth";
import { apiErrorSchema, automationRunEventRequestSchema } from "@local-seo/schemas";
import { NextResponse } from "next/server";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(apiErrorSchema.parse({ error: { code, message } }), { status });
}

/**
 * POST /api/internal/automation-runs/:id/events — docs/api-contracts.md.
 *
 * Called server-to-server by n8n, never by the browser — authenticated
 * with a shared secret (N8N_INTERNAL_SECRET) instead of a user session,
 * per docs/security.md's "authentication on internal callbacks" rule.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const providedSecret = request.headers.get("x-internal-secret");
  if (!verifyInternalServiceSecret(providedSecret)) {
    return errorResponse("UNAUTHORIZED", "Invalid or missing service credentials.", 401);
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return errorResponse("VALIDATION_ERROR", "Invalid automation run ID.", 400);
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = automationRunEventRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request body.",
      400,
    );
  }

  try {
    const result = await recordAutomationRunEvent(id, parsed.data);
    return NextResponse.json({ ok: true, deduplicated: result.deduplicated });
  } catch (error) {
    if (error instanceof AutomationRunEventError) {
      return errorResponse(error.code, error.message, 404);
    }
    // Never surface the underlying error message — docs/api-contracts.md:
    // "Do not expose stack traces."
    console.error(error);
    return errorResponse("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
