"use server";

import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, businessVisibilitySnapshots } from "@local-seo/db/schema";
import { createBusinessVisibilitySnapshotRequestSchema } from "@local-seo/schemas";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type FormState = { error: string } | null;

/**
 * Manual GBP-insights stand-in while API access is pending Google's
 * approval (docs/integrations.md). The business owner reads a number
 * off their own GBP dashboard (or a manual map-pack search) and logs
 * it here — same "manual entry, never fabricated" pattern already used
 * for competitor metrics.
 */
export async function addVisibilitySnapshot(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.organizationId) {
    return { error: "You must be signed in." };
  }

  const businessId = String(formData.get("businessId") ?? "");
  const parsed = createBusinessVisibilitySnapshotRequestSchema.safeParse({
    businessId,
    metricType: formData.get("metricType"),
    value: formData.get("value"),
    unit: formData.get("unit") || undefined,
    keyword: formData.get("keyword") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(
      and(
        eq(businesses.id, parsed.data.businessId),
        eq(businesses.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!business) {
    return { error: "Business not found." };
  }

  await db.insert(businessVisibilitySnapshots).values({
    ...parsed.data,
    value: parsed.data.value.toString(),
    organizationId: session.organizationId,
    source: "manual",
    capturedAt: new Date(),
  });

  revalidatePath("/local-visibility");
  return null;
}
