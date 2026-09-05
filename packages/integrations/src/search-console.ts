import { z } from "zod";

const API_BASE = "https://www.googleapis.com/webmasters/v3";

async function callSearchConsole(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Search Console API returned ${response.status} for ${path}`);
  }

  return response.json();
}

const sitesResponseSchema = z.object({
  siteEntry: z
    .array(
      z.object({
        siteUrl: z.string(),
        permissionLevel: z.string(),
      }),
    )
    .optional(),
});

/** Lists the Search Console properties this connection's account can access. */
export async function listSites(accessToken: string) {
  const body = sitesResponseSchema.parse(await callSearchConsole(accessToken, "/sites"));
  return body.siteEntry ?? [];
}

// Matches the fields docs/integrations.md names for Search Console:
// "queries, pages, clicks, impressions, CTR, average position."
export const searchAnalyticsRowSchema = z.object({
  keys: z.array(z.string()), // [query, page] in the order requested via `dimensions`
  clicks: z.number(),
  impressions: z.number(),
  ctr: z.number(),
  position: z.number(),
});

export type SearchAnalyticsRow = z.infer<typeof searchAnalyticsRowSchema>;

const searchAnalyticsResponseSchema = z.object({
  rows: z.array(searchAnalyticsRowSchema).optional(),
});

/**
 * Fetches per-query/page search analytics for one property. Search
 * Console's own quota is finite (docs/integrations.md) — callers are
 * responsible for incremental sync, not calling this more than needed.
 */
export async function getSearchAnalytics(
  accessToken: string,
  input: { siteUrl: string; startDate: string; endDate: string; rowLimit?: number },
): Promise<SearchAnalyticsRow[]> {
  const body = searchAnalyticsResponseSchema.parse(
    await callSearchConsole(
      accessToken,
      `/sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        body: JSON.stringify({
          startDate: input.startDate,
          endDate: input.endDate,
          dimensions: ["query", "page"],
          rowLimit: input.rowLimit ?? 1000,
        }),
      },
    ),
  );
  return body.rows ?? [];
}
