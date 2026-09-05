"use server";

import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { recommendations } from "@local-seo/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Marks a recommendation approved/rejected. This only updates our own
 * internal status field — it never triggers any externally-visible
 * action (posting a reply, changing a business listing, etc.). Actually
 * executing an approved recommendation against a real integration is
 * out of scope here and requires its own explicit approval flow per
 * AGENTS.md rule 14.
 */
export async function updateRecommendationStatus(
  recommendationId: string,
  status: "approved" | "rejected",
): Promise<void> {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  await db
    .update(recommendations)
    .set({ status })
    .where(
      and(
        eq(recommendations.id, recommendationId),
        eq(recommendations.organizationId, session.organizationId),
      ),
    );

  revalidatePath("/recommendations");
}
