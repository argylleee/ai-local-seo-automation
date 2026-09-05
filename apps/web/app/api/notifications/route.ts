import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { notifications } from "@local-seo/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

/** GET /api/notifications — the signed-in organization's most recent notifications. */
export async function GET() {
  const session = await auth();
  if (!session?.organizationId) {
    return NextResponse.json({ notifications: [] }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.organizationId, session.organizationId))
    .orderBy(desc(notifications.createdAt))
    .limit(10);

  return NextResponse.json({ notifications: rows });
}

/** POST /api/notifications — marks every unread notification as read. */
export async function POST() {
  const session = await auth();
  if (!session?.organizationId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.organizationId, session.organizationId), isNull(notifications.readAt)),
    );

  return NextResponse.json({ ok: true });
}
