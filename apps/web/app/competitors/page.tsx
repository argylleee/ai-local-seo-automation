import { AddCompetitorForm, AddCompetitorMetricForm } from "@/app/competitors/competitor-forms";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, competitorMetrics, competitors } from "@local-seo/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CompetitorsPage({
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
          <h1 className="text-xl font-semibold">Competitors</h1>
          <Card>
            <CardHeader>
              <CardTitle>No businesses yet</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Add a business first — see the Businesses page.
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

  const orgCompetitors = await db
    .select()
    .from(competitors)
    .where(eq(competitors.businessId, selected.id));

  const competitorIds = orgCompetitors.map((c) => c.id);
  const metricsByCompetitor = new Map<
    string,
    { metricType: string; value: string; capturedAt: Date }[]
  >();
  if (competitorIds.length > 0) {
    const metrics = await db
      .select()
      .from(competitorMetrics)
      .where(eq(competitorMetrics.organizationId, session.organizationId))
      .orderBy(desc(competitorMetrics.capturedAt));
    for (const metric of metrics) {
      if (!competitorIds.includes(metric.competitorId)) continue;
      const list = metricsByCompetitor.get(metric.competitorId) ?? [];
      list.push({
        metricType: metric.metricType,
        value: metric.value,
        capturedAt: metric.capturedAt,
      });
      metricsByCompetitor.set(metric.competitorId, list);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Competitors</h1>
          {orgBusinesses.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {orgBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/competitors?business=${business.id}`}
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

        <p className="text-muted-foreground text-sm">
          Competitor data has no automated source yet — Business Profile access requires separate
          Google approval, and paid SERP/competitor APIs aren't used here. Add competitors and their
          metrics manually; nothing shown here is fabricated.
        </p>

        {orgCompetitors.length > 0 ? (
          <div className="space-y-3">
            {orgCompetitors.map((competitor) => (
              <Card key={competitor.id}>
                <CardHeader>
                  <CardTitle>{competitor.name}</CardTitle>
                  {competitor.website ? (
                    <p className="text-muted-foreground text-sm">{competitor.website}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  {(metricsByCompetitor.get(competitor.id) ?? []).length > 0 ? (
                    <ul className="text-sm">
                      {metricsByCompetitor.get(competitor.id)!.map((metric, index) => (
                        <li key={index} className="text-muted-foreground">
                          {metric.metricType}:{" "}
                          <span className="text-foreground">{metric.value}</span> (
                          {metric.capturedAt.toLocaleDateString("en-PH", { dateStyle: "medium" })})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">No metrics recorded yet.</p>
                  )}
                  <AddCompetitorMetricForm competitorId={competitor.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No competitors added yet</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Add one below to start tracking it manually.
            </CardContent>
          </Card>
        )}

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Add a competitor</CardTitle>
          </CardHeader>
          <CardContent>
            <AddCompetitorForm businessId={selected.id} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
