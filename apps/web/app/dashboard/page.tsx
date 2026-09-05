import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses } from "@local-seo/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const orgBusinesses = await db
    .select({ id: businesses.id, name: businesses.name })
    .from(businesses)
    .where(eq(businesses.organizationId, session.organizationId));

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Overview</h1>

        {orgBusinesses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No businesses yet</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Add a business to start tracking local search visibility. No SEO score, rankings, or
              reviews are shown until real data is connected — see the Businesses page to get
              started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Local SEO score</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                No audits have run yet for {orgBusinesses.length}{" "}
                {orgBusinesses.length === 1 ? "business" : "businesses"}.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Highest-impact opportunities</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                None detected yet.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Review sentiment</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                No reviews analyzed yet.
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent automation runs</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            No automation runs recorded yet.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
