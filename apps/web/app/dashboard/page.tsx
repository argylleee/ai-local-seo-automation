import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, reviewAnalysis, reviews, seoAudits, seoIssues } from "@local-seo/db/schema";
import { SEVERITY_PENALTY } from "@local-seo/seo-engine";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const orgBusinesses = await db
    .select({ id: businesses.id, name: businesses.name })
    .from(businesses)
    .where(eq(businesses.organizationId, session.organizationId));

  if (orgBusinesses.length === 0) {
    return (
      <AppShell>
        <div className="space-y-6">
          <h1 className="text-xl font-semibold">Overview</h1>
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
        </div>
      </AppShell>
    );
  }

  const params = await searchParams;
  const requestedBusinessId = typeof params.business === "string" ? params.business : undefined;
  const selected =
    orgBusinesses.find((business) => business.id === requestedBusinessId) ?? orgBusinesses[0]!;

  const [latestAudit] = await db
    .select()
    .from(seoAudits)
    .where(and(eq(seoAudits.businessId, selected.id), eq(seoAudits.status, "completed")))
    .orderBy(desc(seoAudits.completedAt))
    .limit(1);

  const openIssues = latestAudit
    ? (
        await db
          .select()
          .from(seoIssues)
          .where(and(eq(seoIssues.auditId, latestAudit.id), eq(seoIssues.status, "open")))
      ).sort((a, b) => SEVERITY_PENALTY[b.severity] - SEVERITY_PENALTY[a.severity])
    : [];

  const businessReviews = await db
    .select({ sentiment: reviewAnalysis.sentiment })
    .from(reviews)
    .innerJoin(reviewAnalysis, eq(reviewAnalysis.reviewId, reviews.id))
    .where(eq(reviews.businessId, selected.id));

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const row of businessReviews) {
    sentimentCounts[row.sentiment] += 1;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Overview</h1>
          {orgBusinesses.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {orgBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/dashboard?business=${business.id}`}
                  className={
                    business.id === selected.id
                      ? "rounded-md bg-secondary px-3 py-1.5 text-sm"
                      : "text-muted-foreground rounded-md px-3 py-1.5 text-sm hover:text-foreground"
                  }
                >
                  {business.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Local SEO score</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {latestAudit ? (
                <>
                  <p className="text-3xl font-semibold">{latestAudit.score}</p>
                  <p className="text-muted-foreground mt-1">
                    Last audited{" "}
                    {latestAudit.completedAt?.toLocaleDateString("en-PH", {
                      dateStyle: "medium",
                    })}
                    . Deterministic score, not an AI estimate.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No audits have run yet for {selected.name}.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Highest-impact opportunities</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {openIssues.length === 0 ? (
                <p>None detected yet.</p>
              ) : (
                <ul className="space-y-2">
                  {openIssues.slice(0, 3).map((issue) => (
                    <li key={issue.id}>
                      <span className="text-foreground font-medium">
                        {SEVERITY_LABEL[issue.severity] ?? issue.severity}
                      </span>{" "}
                      — {issue.code.replaceAll("_", " ").toLowerCase()}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review sentiment</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {businessReviews.length === 0 ? (
                <p>No reviews analyzed yet.</p>
              ) : (
                <p>
                  {sentimentCounts.positive} positive · {sentimentCounts.neutral} neutral ·{" "}
                  {sentimentCounts.negative} negative ({businessReviews.length} total)
                </p>
              )}
            </CardContent>
          </Card>
        </div>

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
