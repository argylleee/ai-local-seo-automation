import { generateRecommendation } from "@local-seo/ai";
import { db } from "@local-seo/db";
import {
  automationRuns,
  notifications,
  recommendations,
  seoAudits,
  seoIssues,
} from "@local-seo/db/schema";
import { SEVERITY_PENALTY, type SeoIssueCandidate } from "@local-seo/seo-engine";
import { eq } from "drizzle-orm";

const PRIORITY_TO_IMPACT: Record<string, "low" | "medium" | "high"> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

// Cap how many issues get an AI-worded recommendation per audit, per
// docs/ai.md's cost-control guidance — not every detected issue needs
// one, and it keeps a single audit well within Groq's free-tier rate
// limits even as the rule set grows.
const MAX_RECOMMENDATIONS_PER_AUDIT = 5;

/**
 * Inserts a new "running" audit row, plus a matching automation_runs row
 * (correlated by the audit's own ID) so both sync jobs show up in the
 * Dashboard's "Recent automation runs" card and the internal n8n
 * callback endpoint has a run to report events against. Shared by every
 * audit source (Search Console, crawler).
 */
export async function createRunningAudit(
  organizationId: string,
  businessId: string,
  source: string,
): Promise<string> {
  const [audit] = await db
    .insert(seoAudits)
    .values({ organizationId, businessId, status: "running", source, startedAt: new Date() })
    .returning();

  await db.insert(automationRuns).values({
    organizationId,
    workflowName: source,
    triggeredBy: "user",
    status: "started",
    correlationId: audit!.id,
  });

  return audit!.id;
}

export async function markAuditFailed(auditId: string): Promise<void> {
  await db
    .update(seoAudits)
    .set({ status: "failed", completedAt: new Date() })
    .where(eq(seoAudits.id, auditId));

  const [run] = await db
    .update(automationRuns)
    .set({ status: "failed", finishedAt: new Date(), errorMessage: "Audit run failed." })
    .where(eq(automationRuns.correlationId, auditId))
    .returning({
      organizationId: automationRuns.organizationId,
      workflowName: automationRuns.workflowName,
    });

  if (run) {
    await db.insert(notifications).values({
      organizationId: run.organizationId,
      userId: null,
      type: "automation_failed",
      title: `${run.workflowName} failed`,
      body: null,
    });
  }
}

/**
 * Persists detected candidates as seo_issues, generates AI-worded
 * recommendations for the highest-severity ones, and marks the audit
 * "completed". AI only ever supplies wording — category/impact/evidence
 * all come from the deterministic candidate, never the model. A
 * failure generating/persisting one recommendation is logged and
 * skipped rather than failing the whole audit.
 */
export async function completeAuditWithIssues(input: {
  organizationId: string;
  businessId: string;
  auditId: string;
  url: string | null;
  score: number;
  candidates: SeoIssueCandidate[];
}): Promise<{ issueCount: number; recommendationCount: number }> {
  const { organizationId, businessId, auditId, url, score, candidates } = input;

  await db
    .update(seoAudits)
    .set({ status: "completed", url, score: score.toString(), completedAt: new Date() })
    .where(eq(seoAudits.id, auditId));

  const [run] = await db
    .update(automationRuns)
    .set({ status: "succeeded", finishedAt: new Date() })
    .where(eq(automationRuns.correlationId, auditId))
    .returning({ workflowName: automationRuns.workflowName });

  if (run) {
    await db.insert(notifications).values({
      organizationId,
      userId: null,
      type: "automation_succeeded",
      title: `${run.workflowName} completed`,
      body: `Score ${score} — ${candidates.length} issue${candidates.length === 1 ? "" : "s"} found.`,
    });
  }

  if (candidates.length === 0) {
    return { issueCount: 0, recommendationCount: 0 };
  }

  const insertedIssues = await db
    .insert(seoIssues)
    .values(
      candidates.map((candidate) => ({
        organizationId,
        auditId,
        category: candidate.category,
        code: candidate.code,
        severity: candidate.severity,
        evidence: candidate.evidence,
        status: "open" as const,
      })),
    )
    .returning({ id: seoIssues.id });

  const issuesWithCandidates = insertedIssues.map((issue, index) => ({
    id: issue.id,
    candidate: candidates[index]!,
  }));

  const top = [...issuesWithCandidates]
    .sort((a, b) => SEVERITY_PENALTY[b.candidate.severity] - SEVERITY_PENALTY[a.candidate.severity])
    .slice(0, MAX_RECOMMENDATIONS_PER_AUDIT);

  let recommendationCount = 0;
  for (const { id: sourceIssueId, candidate } of top) {
    try {
      const { data, source } = await generateRecommendation(candidate);
      await db.insert(recommendations).values({
        organizationId,
        businessId,
        sourceIssueId,
        category: candidate.category,
        title: data.title,
        evidence: candidate.evidence,
        impact: PRIORITY_TO_IMPACT[data.priority] ?? "medium",
        confidence: data.confidence.toString(),
        recommendedAction: data.rationale,
        status: "pending",
        aiGenerated: source !== "deterministic",
        modelName: source,
      });
      recommendationCount += 1;
    } catch (error) {
      console.error("Failed to generate/persist a recommendation for issue", sourceIssueId, error);
    }
  }

  return { issueCount: candidates.length, recommendationCount };
}
