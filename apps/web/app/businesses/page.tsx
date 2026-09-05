import { CreateBusinessForm } from "@/components/create-business-form";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, seoAudits } from "@local-seo/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function BusinessesPage() {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const orgBusinesses = await db
    .select({ id: businesses.id, name: businesses.name, category: businesses.category })
    .from(businesses)
    .where(eq(businesses.organizationId, session.organizationId));

  const businessIds = orgBusinesses.map((business) => business.id);
  const latestScoreByBusiness = new Map<string, string>();
  if (businessIds.length > 0) {
    const completedAudits = await db
      .select({ businessId: seoAudits.businessId, score: seoAudits.score })
      .from(seoAudits)
      .where(and(inArray(seoAudits.businessId, businessIds), eq(seoAudits.status, "completed")))
      .orderBy(desc(seoAudits.completedAt));
    // First match per business wins — already ordered most-recent-first.
    for (const audit of completedAudits) {
      if (!latestScoreByBusiness.has(audit.businessId) && audit.score) {
        latestScoreByBusiness.set(audit.businessId, audit.score);
      }
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Businesses</h1>

        {orgBusinesses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgBusinesses.map((business) => (
              <Card key={business.id}>
                <CardHeader>
                  <CardTitle>{business.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  <p>{business.category ?? "No category set"}</p>
                  <p className="mt-1">
                    {latestScoreByBusiness.has(business.id)
                      ? `Local SEO score: ${latestScoreByBusiness.get(business.id)}`
                      : "No audits have run yet"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Add a business</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateBusinessForm />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
