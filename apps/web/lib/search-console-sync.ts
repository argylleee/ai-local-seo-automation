import { generateRecommendation } from "@local-seo/ai";
import { db } from "@local-seo/db";
import {
  businesses,
  integrations,
  recommendations,
  searchConsoleMetrics,
  seoAudits,
  seoIssues,
} from "@local-seo/db/schema";
import { getSearchAnalytics, getValidAccessToken, listSites } from "@local-seo/integrations";
import {
  analyzeSearchConsoleRows,
  SEVERITY_PENALTY,
  type NormalizedSearchRow,
  type SeoIssueCandidate,
} from "@local-seo/seo-engine";
import { and, eq } from "drizzle-orm";

/** Strips a GSC "sc-domain:" prefix and "www.", leaving a bare comparable hostname. */
function normalizeHost(input: string): string {
  const withoutScDomain = input.replace(/^sc-domain:/, "");
  const withScheme = withoutScDomain.includes("://")
    ? withoutScDomain
    : `https://${withoutScDomain}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return withoutScDomain.replace(/^www\./, "").toLowerCase();
  }
}

/**
 * A Google account can have access to many Search Console properties —
 * this picks the one matching the business's own website by hostname.
 * Exported and pure so it's directly unit-testable (docs/testing.md
 * calls out "URL normalization" as something unit tests should cover).
 */
export function matchSiteUrl(
  sites: { siteUrl: string }[],
  businessWebsite: string | null,
): string | null {
  if (!businessWebsite) return null;
  const targetHost = normalizeHost(businessWebsite);
  const match = sites.find((site) => normalizeHost(site.siteUrl) === targetHost);
  return match?.siteUrl ?? null;
}

const SYNC_WINDOW_DAYS = 7;
const GSC_DATA_LAG_DAYS = 3; // Search Console data typically isn't final until ~2-3 days later

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Exported and pure so the date-window logic is directly unit-testable. */
export function computeSyncWindow(now: Date = new Date()): { startDate: string; endDate: string } {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - GSC_DATA_LAG_DAYS);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (SYNC_WINDOW_DAYS - 1));
  return { startDate: toDateString(start), endDate: toDateString(end) };
}

export type SearchConsoleSyncErrorCode =
  "BUSINESS_NOT_FOUND" | "NOT_CONNECTED" | "SITE_NOT_MATCHED";

export class SearchConsoleSyncError extends Error {
  constructor(
    message: string,
    public readonly code: SearchConsoleSyncErrorCode,
  ) {
    super(message);
    this.name = "SearchConsoleSyncError";
  }
}

const PRIORITY_TO_IMPACT: Record<string, "low" | "medium" | "high"> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

// Cap how many issues get an AI-worded recommendation per sync, per
// docs/ai.md's cost-control guidance — not every detected issue needs
// one, and it keeps a single sync well within Groq's free-tier rate
// limits even if the rule set grows.
const MAX_RECOMMENDATIONS_PER_SYNC = 5;

/**
 * Generates and persists an AI-worded recommendation for the
 * highest-severity issues from this sync. AI only ever writes the
 * wording (title/rationale) — the evidence it's shown, and the
 * category/impact stored, come straight from the deterministic
 * candidate, never from the model. A failure here (e.g. a DB error)
 * is logged and skipped rather than failing the whole sync — the
 * audit and its issues already persisted successfully.
 */
async function generateRecommendationsForTopIssues(
  organizationId: string,
  businessId: string,
  issues: { id: string; candidate: SeoIssueCandidate }[],
): Promise<number> {
  const top = [...issues]
    .sort((a, b) => SEVERITY_PENALTY[b.candidate.severity] - SEVERITY_PENALTY[a.candidate.severity])
    .slice(0, MAX_RECOMMENDATIONS_PER_SYNC);

  let created = 0;
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
      created += 1;
    } catch (error) {
      console.error("Failed to generate/persist a recommendation for issue", sourceIssueId, error);
    }
  }
  return created;
}

/**
 * Pulls real Search Console data for one business, runs it through
 * packages/seo-engine, and persists the results — the "raw data ->
 * normalization -> deterministic rules -> ... -> persistence" pipeline
 * from docs/seo-engine.md, including the AI-explanation step via
 * packages/ai. Server-only: getValidAccessToken decrypts a real OAuth
 * token, which must never reach the browser.
 *
 * A seo_audits row is created up front (status "running") and updated
 * to "completed" or "failed" at the end, so a failed sync still leaves
 * an honest record — not silently thrown away.
 */
export async function runSearchConsoleSync(
  organizationId: string,
  businessId: string,
): Promise<{ auditId: string; issueCount: number; rowCount: number; recommendationCount: number }> {
  const [business] = await db
    .select({ id: businesses.id, website: businesses.website })
    .from(businesses)
    .where(and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId)))
    .limit(1);
  if (!business) {
    throw new SearchConsoleSyncError(
      "Business not found in this organization.",
      "BUSINESS_NOT_FOUND",
    );
  }

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.businessId, businessId),
        eq(integrations.organizationId, organizationId),
        eq(integrations.provider, "google_search_console"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!integration) {
    throw new SearchConsoleSyncError(
      "Search Console is not connected for this business.",
      "NOT_CONNECTED",
    );
  }

  const [audit] = await db
    .insert(seoAudits)
    .values({
      organizationId,
      businessId,
      status: "running",
      source: "google_search_console",
      startedAt: new Date(),
    })
    .returning();
  const auditId = audit!.id;

  try {
    const accessToken = await getValidAccessToken(integration.id);

    let siteUrl = integration.externalAccountId;
    if (!siteUrl) {
      const sites = await listSites(accessToken);
      siteUrl = matchSiteUrl(sites, business.website);
      if (!siteUrl) {
        throw new SearchConsoleSyncError(
          "Could not find a Search Console property matching this business's website. " +
            "Make sure the connected Google account has access to it.",
          "SITE_NOT_MATCHED",
        );
      }
      await db
        .update(integrations)
        .set({ externalAccountId: siteUrl })
        .where(eq(integrations.id, integration.id));
    }

    const { startDate, endDate } = computeSyncWindow();
    const rows = await getSearchAnalytics(accessToken, { siteUrl, startDate, endDate });

    const normalizedRows: NormalizedSearchRow[] = rows.map((row) => ({
      query: row.keys[0] ?? "",
      page: row.keys[1] ?? "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));

    // One row per query/page per sync date — re-running on the same day
    // replaces that day's snapshot rather than duplicating it.
    await db
      .delete(searchConsoleMetrics)
      .where(
        and(
          eq(searchConsoleMetrics.businessId, businessId),
          eq(searchConsoleMetrics.date, endDate),
          eq(searchConsoleMetrics.source, "google_search_console"),
        ),
      );

    if (normalizedRows.length > 0) {
      await db.insert(searchConsoleMetrics).values(
        normalizedRows.map((row) => ({
          organizationId,
          businessId,
          integrationId: integration.id,
          query: row.query,
          page: row.page,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr.toString(),
          averagePosition: row.position.toString(),
          date: endDate,
          source: "google_search_console",
          sourceUpdatedAt: new Date(),
        })),
      );
    }

    await db
      .update(integrations)
      .set({ lastSyncedAt: new Date() })
      .where(eq(integrations.id, integration.id));

    const { candidates, score } = analyzeSearchConsoleRows(normalizedRows);

    // Audits are historical facts — this row was inserted up front and
    // is now updated in place, never replaced by a fresh row, per
    // docs/database.md ("do not delete historical analytics").
    await db
      .update(seoAudits)
      .set({ status: "completed", url: siteUrl, score: score.toString(), completedAt: new Date() })
      .where(eq(seoAudits.id, auditId));

    let recommendationCount = 0;
    if (candidates.length > 0) {
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
      recommendationCount = await generateRecommendationsForTopIssues(
        organizationId,
        businessId,
        issuesWithCandidates,
      );
    }

    return { auditId, issueCount: candidates.length, rowCount: rows.length, recommendationCount };
  } catch (error) {
    await db
      .update(seoAudits)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(seoAudits.id, auditId));
    throw error;
  }
}
