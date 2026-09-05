import { z } from "zod";

const API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const pageSpeedResponseSchema = z.object({
  lighthouseResult: z.object({
    categories: z.object({
      performance: z.object({ score: z.number().nullable() }),
    }),
    audits: z.record(z.string(), z.unknown()),
  }),
});

export type PageSpeedResult = z.infer<typeof pageSpeedResponseSchema>;

/**
 * Runs a PageSpeed Insights audit for one URL. Unlike Search Console/GBP,
 * this needs only an API key (docs/integrations.md) — no OAuth connection.
 */
export async function runPageSpeedAudit(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    throw new Error("PAGESPEED_API_KEY is not set. Copy .env.example to .env and fill it in.");
  }

  const endpoint = new URL(API_BASE);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint.toString());
  if (!response.ok) {
    throw new Error(`PageSpeed Insights API returned ${response.status}`);
  }

  return pageSpeedResponseSchema.parse(await response.json());
}
