import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, reviewAnalysis, reviews } from "@local-seo/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

const SENTIMENT_VARIANT = {
  positive: "secondary",
  neutral: "outline",
  negative: "destructive",
} as const;

export default async function ReviewsPage({
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
          <h1 className="text-xl font-semibold">Reviews</h1>
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

  const rows = await db
    .select({
      id: reviews.id,
      authorName: reviews.authorName,
      rating: reviews.rating,
      text: reviews.text,
      language: reviews.language,
      publishedAt: reviews.publishedAt,
      source: reviews.source,
      sentiment: reviewAnalysis.sentiment,
      topics: reviewAnalysis.topics,
    })
    .from(reviews)
    .leftJoin(reviewAnalysis, eq(reviewAnalysis.reviewId, reviews.id))
    .where(eq(reviews.businessId, selected.id))
    .orderBy(desc(reviews.publishedAt));

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const row of rows) {
    if (row.sentiment) sentimentCounts[row.sentiment] += 1;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Reviews</h1>
          {orgBusinesses.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {orgBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/reviews?business=${business.id}`}
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

        {rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No reviews yet</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Reviews appear here once a Google Business Profile connection or manual import
              supplies them. Not built yet — see docs/integrations.md's GBP access-approval
              requirement.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Sentiment overview</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {sentimentCounts.positive} positive · {sentimentCounts.neutral} neutral ·{" "}
                {sentimentCounts.negative} negative ({rows.length} total)
              </CardContent>
            </Card>

            <div className="space-y-3">
              {rows.map((row) => (
                <Card key={row.id}>
                  <CardContent className="space-y-2 pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {row.authorName ?? "Anonymous"} · {row.rating ?? "—"}★
                      </p>
                      <div className="flex gap-2">
                        {row.sentiment ? (
                          <Badge variant={SENTIMENT_VARIANT[row.sentiment]}>{row.sentiment}</Badge>
                        ) : (
                          <Badge variant="outline">not analyzed</Badge>
                        )}
                        {row.language ? <Badge variant="outline">{row.language}</Badge> : null}
                      </div>
                    </div>
                    <p className="text-sm">{row.text}</p>
                    {row.topics && Array.isArray(row.topics) && row.topics.length > 0 ? (
                      <p className="text-muted-foreground text-xs">
                        Topics: {(row.topics as string[]).join(", ")}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-xs">
                      {row.publishedAt?.toLocaleDateString("en-PH", { dateStyle: "medium" })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
