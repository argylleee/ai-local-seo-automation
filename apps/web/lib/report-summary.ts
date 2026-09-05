import { db } from "@local-seo/db";
import { recommendations, seoAudits, seoIssues } from "@local-seo/db/schema";
import { and, desc, eq } from "drizzle-orm";

export type ReportSummary = {
  scoreHistory: { score: string | null; completedAt: Date | null; source: string }[];
  issuesByCategory: Record<string, number>;
  recommendationCounts: { pending: number; approved: number; rejected: number; completed: number };
};

/**
 * The same queries the Reports page (app/reports/page.tsx) runs,
 * factored out so the internal report-summary endpoint (for n8n's
 * 06_send_report workflow, n8n/docs/06_send_report.md) and the page
 * stay in sync instead of drifting apart.
 */
export async function getReportSummary(businessId: string): Promise<ReportSummary> {
  const scoreHistory = await db
    .select({ score: seoAudits.score, completedAt: seoAudits.completedAt, source: seoAudits.source })
    .from(seoAudits)
    .where(and(eq(seoAudits.businessId, businessId), eq(seoAudits.status, "completed")))
    .orderBy(desc(seoAudits.completedAt))
    .limit(10);

  const openIssues = await db
    .select({ category: seoIssues.category })
    .from(seoIssues)
    .innerJoin(seoAudits, eq(seoAudits.id, seoIssues.auditId))
    .where(and(eq(seoAudits.businessId, businessId), eq(seoIssues.status, "open")));

  const issuesByCategory: Record<string, number> = {};
  for (const row of openIssues) {
    issuesByCategory[row.category] = (issuesByCategory[row.category] ?? 0) + 1;
  }

  const recRows = await db
    .select({ status: recommendations.status })
    .from(recommendations)
    .where(eq(recommendations.businessId, businessId));
  const recommendationCounts = { pending: 0, approved: 0, rejected: 0, completed: 0 };
  for (const row of recRows) recommendationCounts[row.status] += 1;

  return { scoreHistory, issuesByCategory, recommendationCounts };
}
