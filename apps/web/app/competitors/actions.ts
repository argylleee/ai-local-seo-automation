"use server";

import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, competitorMetrics, competitors } from "@local-seo/db/schema";
import { createCompetitorRequestSchema } from "@local-seo/schemas";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type FormState = { error: string } | null;

/**
 * Competitor data has no automated source here — Business Profile
 * access requires separate Google approval (docs/integrations.md), and
 * paid SERP/competitor-data APIs are prohibited by default
 * (docs/integrations.md's "Prohibited by default" list). This is
 * strictly manual entry, matching the documented fallback.
 */
export async function addCompetitor(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.organizationId) {
    return { error: "You must be signed in." };
  }

  const businessId = formData.get("businessId");
  const parsed = createCompetitorRequestSchema.safeParse({
    businessId,
    name: formData.get("name"),
    website: formData.get("website") || undefined,
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

  await db.insert(competitors).values({ ...parsed.data, organizationId: session.organizationId });
  revalidatePath("/competitors");
  return null;
}

export async function addCompetitorMetric(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.organizationId) {
    return { error: "You must be signed in." };
  }

  const competitorId = String(formData.get("competitorId") ?? "");
  const metricType = String(formData.get("metricType") ?? "").trim();
  const valueRaw = String(formData.get("value") ?? "");
  const value = Number(valueRaw);

  if (!competitorId || !metricType || !valueRaw || Number.isNaN(value)) {
    return { error: "Metric type and a numeric value are required." };
  }

  const [competitor] = await db
    .select({ id: competitors.id })
    .from(competitors)
    .where(
      and(eq(competitors.id, competitorId), eq(competitors.organizationId, session.organizationId)),
    )
    .limit(1);
  if (!competitor) {
    return { error: "Competitor not found." };
  }

  await db.insert(competitorMetrics).values({
    organizationId: session.organizationId,
    competitorId,
    metricType,
    value: value.toString(),
    source: "manual",
    capturedAt: new Date(),
  });

  revalidatePath("/competitors");
  return null;
}
