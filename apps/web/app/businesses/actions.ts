"use server";

import { auth } from "@/lib/auth";
import { runWebsiteAudit, WebsiteAuditError } from "@/lib/website-audit-sync";
import { db } from "@local-seo/db";
import { businesses } from "@local-seo/db/schema";
import { createBusinessRequestSchema } from "@local-seo/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateBusinessState = { error: string } | null;

export async function createBusiness(
  _prevState: CreateBusinessState,
  formData: FormData,
): Promise<CreateBusinessState> {
  const session = await auth();
  if (!session?.organizationId || !session.user.id) {
    return { error: "You must be signed in." };
  }

  const parsed = createBusinessRequestSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    website: formData.get("website") || undefined,
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.insert(businesses).values({
    ...parsed.data,
    organizationId: session.organizationId,
    createdBy: session.user.id,
  });

  revalidatePath("/businesses");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return null;
}

export async function runWebsiteAuditAction(businessId: string): Promise<void> {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  let result: Awaited<ReturnType<typeof runWebsiteAudit>>;
  try {
    result = await runWebsiteAudit(session.organizationId, businessId);
  } catch (error) {
    if (error instanceof WebsiteAuditError) {
      redirect(
        `/businesses?audit_error=${error.code}&audit_message=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  redirect(
    `/businesses?audited=1&audit_issues=${result.issueCount}&audit_recommendations=${result.recommendationCount}`,
  );
}
