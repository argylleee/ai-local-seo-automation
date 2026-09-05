"use server";

import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses } from "@local-seo/db/schema";
import { createBusinessRequestSchema } from "@local-seo/schemas";
import { revalidatePath } from "next/cache";

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
