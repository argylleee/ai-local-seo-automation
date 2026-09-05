import { completeAuditWithIssues, createRunningAudit, markAuditFailed } from "@/lib/audit-shared";
import { auditPage, CrawlDisallowedError, SsrfBlockedError } from "@local-seo/crawler";
import { db } from "@local-seo/db";
import { businesses } from "@local-seo/db/schema";
import { analyzePageAudit, type PageAuditInput } from "@local-seo/seo-engine";
import { and, eq } from "drizzle-orm";

export type WebsiteAuditErrorCode =
  "BUSINESS_NOT_FOUND" | "NO_WEBSITE" | "CRAWL_DISALLOWED" | "CRAWL_FAILED";

export class WebsiteAuditError extends Error {
  constructor(
    message: string,
    public readonly code: WebsiteAuditErrorCode,
  ) {
    super(message);
    this.name = "WebsiteAuditError";
  }
}

/**
 * Crawls a business's own website and runs it through
 * packages/seo-engine's technical/on-page rules — the crawler-fed half
 * of the pipeline, alongside search-console-sync.ts's Search-Console-fed
 * half. Same audit lifecycle (running -> completed/failed) and the same
 * shared recommendation-generation logic (lib/audit-shared.ts).
 */
export async function runWebsiteAudit(
  organizationId: string,
  businessId: string,
): Promise<{ auditId: string; issueCount: number; recommendationCount: number }> {
  const [business] = await db
    .select({ id: businesses.id, website: businesses.website })
    .from(businesses)
    .where(and(eq(businesses.id, businessId), eq(businesses.organizationId, organizationId)))
    .limit(1);
  if (!business) {
    throw new WebsiteAuditError("Business not found in this organization.", "BUSINESS_NOT_FOUND");
  }
  if (!business.website) {
    throw new WebsiteAuditError("This business has no website set.", "NO_WEBSITE");
  }

  const auditId = await createRunningAudit(organizationId, businessId, "crawler");

  try {
    let page;
    try {
      page = await auditPage(business.website);
    } catch (error) {
      if (error instanceof CrawlDisallowedError) {
        throw new WebsiteAuditError(error.message, "CRAWL_DISALLOWED");
      }
      if (error instanceof SsrfBlockedError) {
        throw new WebsiteAuditError("This URL cannot be audited.", "CRAWL_DISALLOWED");
      }
      throw new WebsiteAuditError(
        `Could not crawl ${business.website}: ${(error as Error).message}`,
        "CRAWL_FAILED",
      );
    }

    const input: PageAuditInput = {
      url: page.url,
      title: page.title,
      metaDescription: page.metaDescription,
      canonicalUrl: page.canonicalUrl,
      h1Count: page.h1Texts.length,
      wordCount: page.wordCount,
      imageCount: page.imageCount,
      imagesMissingAlt: page.imagesMissingAlt,
      hasStructuredData: page.hasStructuredData,
      isNoindex: page.isNoindex,
      hasViewportMeta: page.hasViewportMeta,
    };

    const { candidates, score } = analyzePageAudit(input);

    const { issueCount, recommendationCount } = await completeAuditWithIssues({
      organizationId,
      businessId,
      auditId,
      url: page.url,
      score,
      candidates,
    });

    return { auditId, issueCount, recommendationCount };
  } catch (error) {
    await markAuditFailed(auditId);
    throw error;
  }
}
