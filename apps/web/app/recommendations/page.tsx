import { updateRecommendationStatus } from "@/app/recommendations/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, recommendations } from "@local-seo/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

const IMPACT_VARIANT = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
} as const;

const STATUS_VARIANT = {
  pending: "outline",
  approved: "secondary",
  rejected: "destructive",
  completed: "default",
} as const;

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "completed"] as const;

function formatEvidenceValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  return String(value);
}

function formatEvidenceKey(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.organizationId) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const statusFilter = typeof params.status === "string" ? params.status : "all";

  const rows = await db
    .select({
      id: recommendations.id,
      businessName: businesses.name,
      category: recommendations.category,
      title: recommendations.title,
      evidence: recommendations.evidence,
      impact: recommendations.impact,
      confidence: recommendations.confidence,
      recommendedAction: recommendations.recommendedAction,
      status: recommendations.status,
      aiGenerated: recommendations.aiGenerated,
      updatedAt: recommendations.updatedAt,
    })
    .from(recommendations)
    .innerJoin(businesses, eq(businesses.id, recommendations.businessId))
    .where(eq(recommendations.organizationId, session.organizationId))
    .orderBy(desc(recommendations.createdAt));

  const visible = rows.filter((row) => statusFilter === "all" || row.status === statusFilter);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Recommendations</h1>

        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((filter) => (
            <Link
              key={filter}
              href={filter === "all" ? "/recommendations" : `/recommendations?status=${filter}`}
              className={
                statusFilter === filter
                  ? "rounded-md bg-secondary px-3 py-1.5 text-sm capitalize"
                  : "text-muted-foreground rounded-md px-3 py-1.5 text-sm capitalize hover:text-foreground"
              }
            >
              {filter}
            </Link>
          ))}
        </div>

        {visible.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No recommendations yet</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Recommendations appear here once a Search Console sync detects issues — see the
              Settings page to connect and run an analysis.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visible.map((rec) => (
              <Card key={rec.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle>{rec.title}</CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {rec.businessName} · {rec.category.replaceAll("_", " ").toLowerCase()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={IMPACT_VARIANT[rec.impact]}>{rec.impact} impact</Badge>
                      <Badge variant={STATUS_VARIANT[rec.status]}>{rec.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{rec.recommendedAction}</p>

                  {/* docs/design.md: "Never show an AI recommendation without evidence." */}
                  <div className="bg-muted rounded-md p-3 text-xs">
                    <p className="text-muted-foreground mb-1 font-medium">Evidence</p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                      {Object.entries(rec.evidence as Record<string, unknown>).map(
                        ([key, value]) => (
                          <li key={key}>
                            <span className="text-muted-foreground">{formatEvidenceKey(key)}:</span>{" "}
                            {formatEvidenceValue(value)}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>
                      Confidence {Math.round(Number(rec.confidence) * 100)}% ·{" "}
                      {rec.aiGenerated ? "AI-generated wording" : "Rule-based"} · Updated{" "}
                      {rec.updatedAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}
                    </span>
                    {rec.status === "pending" ? (
                      <div className="flex gap-2">
                        <form action={updateRecommendationStatus.bind(null, rec.id, "approved")}>
                          <Button type="submit" size="sm" variant="outline">
                            Approve
                          </Button>
                        </form>
                        <form action={updateRecommendationStatus.bind(null, rec.id, "rejected")}>
                          <Button type="submit" size="sm" variant="outline">
                            Reject
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
