import { db } from "@local-seo/db";
import {
  businesses,
  integrations,
  searchConsoleMetrics,
  seoAudits,
  seoIssues,
} from "@local-seo/db/schema";
import { getSearchAnalytics, getValidAccessToken, listSites } from "@local-seo/integrations";
import { analyzeSearchConsoleRows, type NormalizedSearchRow } from "@local-seo/seo-engine";
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

export class SearchConsoleSyncError extends Error {}

/**
 * Pulls real Search Console data for one business, runs it through
 * packages/seo-engine, and persists the results — the "raw data ->
 * normalization -> deterministic rules -> ... -> persistence" pipeline
 * from docs/seo-engine.md. Server-only: getValidAccessToken decrypts a
 * real OAuth token, which must never reach the browser.
 */
export async function runSearchConsoleSync(
  organizationId: string,
  businessId: string,
): Promise<{ auditId: string; issueCount: number; rowCount: number }> {
  const [business] = await db
    .select({ id: businesses.id, website: businesses.website })
    .from(businesses)
    .where(and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId)))
    .limit(1);
  if (!business) {
    throw new SearchConsoleSyncError("Business not found in this organization.");
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
    throw new SearchConsoleSyncError("Search Console is not connected for this business.");
  }

  const accessToken = await getValidAccessToken(integration.id);

  let siteUrl = integration.externalAccountId;
  if (!siteUrl) {
    const sites = await listSites(accessToken);
    siteUrl = matchSiteUrl(sites, business.website);
    if (!siteUrl) {
      throw new SearchConsoleSyncError(
        "Could not find a Search Console property matching this business's website. " +
          "Make sure the connected Google account has access to it.",
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

  // Audits are historical facts — always insert a new one rather than
  // overwriting, per docs/database.md ("do not delete historical
  // analytics").
  const [audit] = await db
    .insert(seoAudits)
    .values({
      organizationId,
      businessId,
      url: siteUrl,
      status: "completed",
      score: score.toString(),
      source: "google_search_console",
      startedAt: new Date(),
      completedAt: new Date(),
    })
    .returning();

  if (candidates.length > 0) {
    await db.insert(seoIssues).values(
      candidates.map((candidate) => ({
        organizationId,
        auditId: audit!.id,
        category: candidate.category,
        code: candidate.code,
        severity: candidate.severity,
        evidence: candidate.evidence,
        status: "open" as const,
      })),
    );
  }

  return { auditId: audit!.id, issueCount: candidates.length, rowCount: rows.length };
}
