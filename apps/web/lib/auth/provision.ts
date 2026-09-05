import { db } from "@local-seo/db";
import { organizationMembers, organizations, users } from "@local-seo/db/schema";
import { slugify } from "@local-seo/shared";
import { eq } from "drizzle-orm";

/**
 * First-login bootstrap for a Google account. Auth.js only handles
 * identity/session (see ../auth.ts) — organization/tenant data lives in
 * our own schema per docs/architecture.md, so every new user gets a
 * personal organization they own.
 */
export async function ensureUserAndOrganization(input: {
  email: string;
  name?: string | null;
}): Promise<{ userId: string; organizationId: string }> {
  const [existingUser] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  const user =
    existingUser ??
    (
      await db
        .insert(users)
        .values({ email: input.email, name: input.name ?? null })
        .returning()
    )[0]!;

  const [existingMembership] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, user.id))
    .limit(1);

  if (existingMembership) {
    return { userId: user.id, organizationId: existingMembership.organizationId };
  }

  const orgName = input.name ? `${input.name}'s Organization` : "My Organization";
  const [organization] = await db
    .insert(organizations)
    .values({ name: orgName, slug: `${slugify(orgName)}-${user.id.slice(0, 8)}` })
    .returning();

  await db.insert(organizationMembers).values({
    organizationId: organization!.id,
    userId: user.id,
    role: "owner",
  });

  return { userId: user.id, organizationId: organization!.id };
}
