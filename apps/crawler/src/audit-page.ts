import { createLogger } from "@local-seo/logger";
import { extractSeoData, type ExtractedPageData } from "./extract/extract-seo-data";
import { fetchSafe } from "./fetch-safe";
import { normalizeUrl } from "./normalize-url";
import { isCrawlAllowed } from "./robots";

export class CrawlDisallowedError extends Error {}

const logger = createLogger({ module: "crawler" });

/**
 * Audits a single page: normalize -> robots.txt check -> safe fetch ->
 * extract. Scoped to one page per call by design — a full depth-limited
 * site crawl (following internal links) is a natural future extension,
 * not built here, to keep the SSRF/politeness surface area small for a
 * first version.
 */
export async function auditPage(rawUrl: string): Promise<ExtractedPageData> {
  const url = normalizeUrl(rawUrl);
  const log = logger.child({ url });
  log.info("Starting page audit");

  const allowed = await isCrawlAllowed(url);
  if (!allowed) {
    log.warn("robots.txt disallows crawling this URL");
    throw new CrawlDisallowedError(`robots.txt disallows crawling ${url}`);
  }

  const { finalUrl, status, html } = await fetchSafe(url);
  log.info("Fetched page", { status, finalUrl });

  return extractSeoData(html, finalUrl, status);
}
