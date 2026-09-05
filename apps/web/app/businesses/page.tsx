import { runWebsiteAuditAction } from "@/app/businesses/actions";
import { AppShell } from "@/components/app-shell";
import { CreateBusinessForm } from "@/components/create-business-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, seoAudits } from "@local-seo/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

const AUDIT_ERROR_MESSAGES: Record<string, string> = {
  BUSINESS_NOT_FOUND: "That business could not be found in your organization.",
  NO_WEBSITE: "Add a website URL to this business before running an audit.",
  CRAWL_DISALLOWED: "This site's robots.txt disallows crawling, or the URL isn't a public website.",
  CRAWL_FAILED: "The website audit failed. Please try again.",
};

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const audited = typeof params.audited === "string" ? params.audited : undefined;
  const auditIssues = typeof params.audit_issues === "string" ? params.audit_issues : undefined;
  const auditRecommendations =
    typeof params.audit_recommendations === "string" ? params.audit_recommendations : undefined;
  const auditError = typeof params.audit_error === "string" ? params.audit_error : undefined;
  const auditMessage = typeof params.audit_message === "string" ? params.audit_message : undefined;

  const orgBusinesses = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      category: businesses.category,
      website: businesses.website,
    })
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

        {audited ? (
          <p role="status" className="rounded-md bg-secondary px-4 py-2 text-sm">
            Website audit complete: {auditIssues ?? 0} issue(s) detected,{" "}
            {auditRecommendations ?? 0} recommendation(s) generated.
          </p>
        ) : null}
        {auditError ? (
          <p
            role="alert"
            className="text-destructive rounded-md bg-destructive/10 px-4 py-2 text-sm"
          >
            {auditMessage || AUDIT_ERROR_MESSAGES[auditError] || "Something went wrong."}
          </p>
        ) : null}

        {orgBusinesses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgBusinesses.map((business) => (
              <Card key={business.id}>
                <CardHeader>
                  <CardTitle>{business.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-sm">
                  <p>{business.category ?? "No category set"}</p>
                  <p>
                    {latestScoreByBusiness.has(business.id)
                      ? `Local SEO score: ${latestScoreByBusiness.get(business.id)}`
                      : "No audits have run yet"}
                  </p>
                  {business.website ? (
                    <form action={runWebsiteAuditAction.bind(null, business.id)}>
                      <Button type="submit" size="sm" variant="outline">
                        Run website audit
                      </Button>
                    </form>
                  ) : (
                    <p className="text-xs italic">Add a website to enable audits.</p>
                  )}
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
