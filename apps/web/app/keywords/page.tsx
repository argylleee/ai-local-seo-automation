import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, searchConsoleMetrics } from "@local-seo/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function KeywordsPage({
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
          <h1 className="text-xl font-semibold">Keywords</h1>
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
    .select()
    .from(searchConsoleMetrics)
    .where(eq(searchConsoleMetrics.businessId, selected.id))
    .orderBy(desc(searchConsoleMetrics.impressions));

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Keywords</h1>
          {orgBusinesses.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {orgBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/keywords?business=${business.id}`}
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
            <CardTitle>Search Console queries</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No query data yet — connect Search Console and run an analysis on the Settings page.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Query</th>
                      <th className="pb-2 pr-4 font-medium">Page</th>
                      <th className="pb-2 pr-4 font-medium">Avg. position</th>
                      <th className="pb-2 pr-4 font-medium">Impressions</th>
                      <th className="pb-2 pr-4 font-medium">Clicks</th>
                      <th className="pb-2 font-medium">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="py-2 pr-4">{row.query}</td>
                        <td className="text-muted-foreground max-w-[16rem] truncate py-2 pr-4">
                          {row.page}
                        </td>
                        <td className="py-2 pr-4">{row.averagePosition}</td>
                        <td className="py-2 pr-4">{row.impressions}</td>
                        <td className="py-2 pr-4">{row.clicks}</td>
                        <td className="py-2">
                          {row.ctr ? `${(Number(row.ctr) * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
