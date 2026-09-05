import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { organizations } from "@local-seo/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const [organization] = await db
    .select({ name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId))
    .limit(1);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {organization?.name} ({organization?.slug})
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {/* Google Search Console / Business Profile connection flow lands with
                the integrations feature module (packages/integrations). */}
            No integrations connected yet.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
