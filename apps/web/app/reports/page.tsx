import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getReportSummary } from "@/lib/report-summary";
import { db } from "@local-seo/db";
import { businesses } from "@local-seo/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ReportsPage({
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
          <h1 className="text-xl font-semibold">Reports</h1>
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

  const { scoreHistory, issuesByCategory, recommendationCounts: recCounts } =
    await getReportSummary(selected.id);
  const issuesByCategoryEntries = Object.entries(issuesByCategory);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Reports</h1>
          {orgBusinesses.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {orgBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/reports?business=${business.id}`}
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

        <Card>
          <CardHeader>
            <CardTitle>Score history</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreHistory.length === 0 ? (
              <p className="text-muted-foreground text-sm">No completed audits yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreHistory.map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="py-2 pr-4">
                        {row.completedAt?.toLocaleDateString("en-PH", { dateStyle: "medium" })}
                      </td>
                      <td className="text-muted-foreground py-2 pr-4">{row.source}</td>
                      <td className="py-2">{row.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Open issues by category</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {issuesByCategoryEntries.length === 0 ? (
                <p className="text-muted-foreground">No open issues.</p>
              ) : (
                <ul className="space-y-1">
                  {issuesByCategoryEntries.map(([category, count]) => (
                    <li key={category} className="text-muted-foreground">
                      {category.replaceAll("_", " ").toLowerCase()}:{" "}
                      <span className="text-foreground">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations by status</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <ul className="space-y-1">
                <li>
                  Pending: <span className="text-foreground">{recCounts.pending}</span>
                </li>
                <li>
                  Approved: <span className="text-foreground">{recCounts.approved}</span>
                </li>
                <li>
                  Rejected: <span className="text-foreground">{recCounts.rejected}</span>
                </li>
                <li>
                  Completed: <span className="text-foreground">{recCounts.completed}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
