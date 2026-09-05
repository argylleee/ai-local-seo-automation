import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@local-seo/db";
import { businesses, seoAudits, seoIssues } from "@local-seo/db/schema";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

const SEVERITY_VARIANT = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
} as const;

const STATUS_VARIANT = {
  completed: "secondary",
  running: "outline",
  failed: "destructive",
  pending: "outline",
} as const;

const SOURCE_LABEL: Record<string, string> = {
  google_search_console: "Search Console",
  crawler: "Website crawl",
  demo_seed: "Demo data",
};

export default async function AuditsPage({
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
          <h1 className="text-xl font-semibold">Website Audit</h1>
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

  const audits = await db
    .select()
    .from(seoAudits)
    .where(
      and(
        eq(seoAudits.businessId, selected.id),
        eq(seoAudits.organizationId, session.organizationId),
      ),
    )
    .orderBy(desc(seoAudits.createdAt));

  const latestCompleted = audits.find((audit) => audit.status === "completed");
  const latestIssues = latestCompleted
    ? await db
        .select()
        .from(seoIssues)
        .where(eq(seoIssues.auditId, latestCompleted.id))
        .orderBy(desc(seoIssues.detectedAt))
    : [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Website Audit</h1>
          {orgBusinesses.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {orgBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/audits?business=${business.id}`}
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

        {audits.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No audits yet</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Connect Search Console (Settings) or run a website audit (Businesses) to see results
              here.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  Latest completed audit {latestCompleted ? `— score ${latestCompleted.score}` : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latestIssues.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {latestCompleted
                      ? "No issues detected in the latest audit."
                      : "No completed audit yet."}
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {latestIssues.map((issue) => (
                      <li
                        key={issue.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-b-0"
                      >
                        <span>
                          <span className="text-muted-foreground">
                            {issue.category.replaceAll("_", " ").toLowerCase()}:
                          </span>{" "}
                          {issue.code.replaceAll("_", " ").toLowerCase()}
                        </span>
                        <div className="flex gap-2">
                          <Badge variant={SEVERITY_VARIANT[issue.severity]}>{issue.severity}</Badge>
                          <Badge variant="outline">{issue.status}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit history</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="pb-2 pr-4 font-medium">Source</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 pr-4 font-medium">Score</th>
                        <th className="pb-2 font-medium">Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map((audit) => (
                        <tr key={audit.id} className="border-t">
                          <td className="py-2 pr-4">
                            {SOURCE_LABEL[audit.source ?? ""] ?? audit.source}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge variant={STATUS_VARIANT[audit.status]}>{audit.status}</Badge>
                          </td>
                          <td className="py-2 pr-4">{audit.score ?? "—"}</td>
                          <td className="py-2 text-muted-foreground">
                            {audit.startedAt?.toLocaleString("en-PH") ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
