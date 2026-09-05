import * as cheerio from "cheerio";

export interface ExtractedPageData {
  url: string;
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  h1Texts: string[];
  wordCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  hasStructuredData: boolean;
  isNoindex: boolean;
  hasViewportMeta: boolean;
  internalLinkCount: number;
  externalLinkCount: number;
}

/**
 * Extracts the technical/on-page facts docs/seo-engine.md's TECHNICAL
 * and ON_PAGE categories need. Pure text/DOM inspection — no
 * interpretation or scoring happens here, that's packages/seo-engine's
 * job (raw data -> normalization -> deterministic rules, per the
 * documented pipeline).
 */
export function extractSeoData(
  html: string,
  pageUrl: string,
  statusCode: number,
): ExtractedPageData {
  const $ = cheerio.load(html);
  const origin = new URL(pageUrl).origin;

  const title = $("title").first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;

  const canonicalHref = $('link[rel="canonical"]').attr("href");
  const canonicalUrl = canonicalHref ? new URL(canonicalHref, pageUrl).toString() : null;

  const h1Texts = $("h1")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;

  const images = $("img");
  const imageCount = images.length;
  const imagesMissingAlt = images.filter((_, el) => !$(el).attr("alt")?.trim()).length;

  const hasStructuredData = $('script[type="application/ld+json"]').length > 0;

  const robotsMeta = $('meta[name="robots"]').attr("content")?.toLowerCase() ?? "";
  const isNoindex = robotsMeta.includes("noindex");

  const hasViewportMeta = $('meta[name="viewport"]').length > 0;

  let internalLinkCount = 0;
  let externalLinkCount = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }
    try {
      const linkUrl = new URL(href, pageUrl);
      if (linkUrl.origin === origin) internalLinkCount += 1;
      else externalLinkCount += 1;
    } catch {
      // ignore unparsable hrefs
    }
  });

  return {
    url: pageUrl,
    statusCode,
    title,
    metaDescription,
    canonicalUrl,
    h1Texts,
    wordCount,
    imageCount,
    imagesMissingAlt,
    hasStructuredData,
    isNoindex,
    hasViewportMeta,
    internalLinkCount,
    externalLinkCount,
  };
}
