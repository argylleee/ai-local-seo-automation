/**
 * Dev-only database seed script. Inserts a demo organization/business
 * with realistic-looking but entirely fake Search Console metrics,
 * reviews, and a resulting SEO audit — so apps/web is browsable locally
 * without a real Google connection.
 *
 * This is NOT product code and must never run against a real/production
 * database: every row it writes is clearly marked (source = "demo_seed",
 * name suffixed "(Seed)") so it can never be confused with real business
 * data, per the never-fabricate rule in docs/integrations.md and
 * AGENTS.md rule 12. It is idempotent — safe to re-run.
 *
 * Usage:
 *   SEED_CONFIRM=yes pnpm db:seed
 *   SEED_CONFIRM=yes SEED_USER_EMAIL=you@example.com pnpm db:seed
 *
 * With SEED_USER_EMAIL set, the demo business is added to that user's
 * own organization (created on their first real Google login) so it
 * shows up when they sign in. Without it, a standalone demo
 * organization/user is created — useful for inspecting the database
 * directly, but not reachable through a real login.
 */
import "dotenv/config";
import { closeDb, db } from "@local-seo/db";
import {
  businesses,
  businessLocations,
  organizationMembers,
  organizations,
  recommendations,
  reviewAnalysis,
  reviews,
  seoAudits,
  seoIssues,
  searchConsoleMetrics,
  users,
} from "@local-seo/db/schema";
import { saveConnection, SEARCH_CONSOLE_SCOPE } from "@local-seo/integrations";
import {
  analyzeSearchConsoleRows,
  type NormalizedSearchRow,
  type SeoIssueCandidate,
} from "@local-seo/seo-engine";
import { and, eq } from "drizzle-orm";

const DEMO_SOURCE = "demo_seed";
const DEMO_BUSINESS_NAME = "Demo Sari-Sari Store (Seed)";

// Realistic-shaped but fabricated Search Console rows — for local
// browsing only, never inserted anywhere but this seed's own rows.
const DEMO_SEARCH_ROWS: NormalizedSearchRow[] = [
  {
    query: "sari sari store near me",
    page: "https://demo.example.ph/",
    impressions: 500,
    clicks: 5,
    ctr: 0.01,
    position: 6.2,
  },
  {
    query: "tindahan malapit sa akin",
    page: "https://demo.example.ph/",
    impressions: 260,
    clicks: 3,
    ctr: 0.012,
    position: 7.8,
  },
  {
    query: "grocery delivery quezon city",
    page: "https://demo.example.ph/delivery",
    impressions: 300,
    clicks: 3,
    ctr: 0.01,
    position: 13.5,
  },
  {
    query: "demo sari sari store",
    page: "https://demo.example.ph/",
    impressions: 200,
    clicks: 45,
    ctr: 0.225,
    position: 2.0,
  },
  {
    query: "load pasabuy quezon city",
    page: "https://demo.example.ph/services",
    impressions: 150,
    clicks: 20,
    ctr: 0.133,
    position: 3.1,
  },
];

const DEMO_REVIEWS = [
  {
    authorName: "Juan Dela Cruz",
    rating: 5,
    text: "Ang bait ng tindera! Laging kumpleto ang paninda.",
    language: "fil",
    sentiment: "positive" as const,
    topics: ["service", "stock"],
  },
  {
    authorName: "Maria Santos",
    rating: 2,
    text: "Sobrang tagal ng pila tuwing gabi, dapat dagdagan ang staff.",
    language: "fil",
    sentiment: "negative" as const,
    topics: ["wait_time", "staffing"],
  },
  {
    authorName: "Mark Reyes",
    rating: 4,
    text: "Convenient location, medyo mahal lang ang presyo.",
    language: "tl-en",
    sentiment: "neutral" as const,
    topics: ["price", "location"],
  },
];

function guardAgainstProduction(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the dev seed script with NODE_ENV=production.");
  }
  if (process.env.SEED_CONFIRM !== "yes") {
    throw new Error(
      "Refusing to seed without confirmation.\n" +
        "This inserts demo data into the database at DATABASE_URL.\n" +
        "Set SEED_CONFIRM=yes to proceed. Never run this against a production database.",
    );
  }
}

async function resolveOrganizationAndUser(): Promise<{ organizationId: string; userId: string }> {
  const email = process.env.SEED_USER_EMAIL ?? "demo@local.dev";

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user =
    existingUser ??
    (await db.insert(users).values({ email, name: "Demo User (Seed)" }).returning())[0]!;

  const [existingMembership] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, user.id))
    .limit(1);

  if (existingMembership) {
    return { organizationId: existingMembership.organizationId, userId: user.id };
  }

  const [organization] = await db
    .insert(organizations)
    .values({ name: "Demo Organization (Seed)", slug: `demo-org-seed-${user.id.slice(0, 8)}` })
    .returning();
  await db
    .insert(organizationMembers)
    .values({ organizationId: organization!.id, userId: user.id, role: "owner" });

  return { organizationId: organization!.id, userId: user.id };
}

async function upsertDemoBusiness(organizationId: string, userId: string): Promise<string> {
  const [existing] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(
      and(eq(businesses.organizationId, organizationId), eq(businesses.name, DEMO_BUSINESS_NAME)),
    )
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(businesses)
    .values({
      organizationId,
      name: DEMO_BUSINESS_NAME,
      category: "Sari-sari store",
      website: "https://demo.example.ph",
      phone: "+63 900 000 0000",
      createdBy: userId,
    })
    .returning();

  await db.insert(businessLocations).values({
    organizationId,
    businessId: created!.id,
    addressLine1: "123 Rizal St.",
    city: "Quezon City",
    province: "Metro Manila",
    region: "NCR",
    postalCode: "1100",
    country: "PH",
    latitude: "14.676000",
    longitude: "121.043000",
    timezone: "Asia/Manila",
  });

  return created!.id;
}

async function seedIntegrationAndMetrics(
  organizationId: string,
  businessId: string,
): Promise<string> {
  const { integrationId } = await saveConnection({
    organizationId,
    businessId,
    provider: "google_search_console",
    externalAccountId: "https://demo.example.ph/",
    tokens: {
      access_token: "demo-fake-access-token-not-real",
      refresh_token: "demo-fake-refresh-token-not-real",
      expires_in: 3600,
      scope: SEARCH_CONSOLE_SCOPE,
      token_type: "Bearer",
    },
  });

  await db
    .delete(searchConsoleMetrics)
    .where(
      and(
        eq(searchConsoleMetrics.businessId, businessId),
        eq(searchConsoleMetrics.source, DEMO_SOURCE),
      ),
    );

  const today = new Date().toISOString().slice(0, 10);
  await db.insert(searchConsoleMetrics).values(
    DEMO_SEARCH_ROWS.map((row) => ({
      organizationId,
      businessId,
      integrationId,
      query: row.query,
      page: row.page,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr.toString(),
      averagePosition: row.position.toString(),
      date: today,
      source: DEMO_SOURCE,
    })),
  );

  return integrationId;
}

async function seedSeoAudit(
  organizationId: string,
  businessId: string,
): Promise<{ auditId: string; candidates: SeoIssueCandidate[] }> {
  // seo_issues cascade-deletes with their parent seo_audits row (FK
  // onDelete: "cascade" in packages/db/src/schema/seo.ts).
  await db
    .delete(seoAudits)
    .where(and(eq(seoAudits.businessId, businessId), eq(seoAudits.source, DEMO_SOURCE)));

  const { candidates, score } = analyzeSearchConsoleRows(DEMO_SEARCH_ROWS);

  const [audit] = await db
    .insert(seoAudits)
    .values({
      organizationId,
      businessId,
      url: "https://demo.example.ph/",
      status: "completed",
      score: score.toString(),
      source: DEMO_SOURCE,
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

  return { auditId: audit!.id, candidates };
}

async function seedReviews(organizationId: string, businessId: string): Promise<void> {
  // review_analysis cascade-deletes with its parent review row.
  await db
    .delete(reviews)
    .where(and(eq(reviews.businessId, businessId), eq(reviews.source, DEMO_SOURCE)));

  for (const [index, review] of DEMO_REVIEWS.entries()) {
    const [created] = await db
      .insert(reviews)
      .values({
        organizationId,
        businessId,
        provider: DEMO_SOURCE,
        externalReviewId: `${DEMO_SOURCE}-${index}`,
        authorName: review.authorName,
        rating: review.rating,
        text: review.text,
        language: review.language,
        publishedAt: new Date(),
        source: DEMO_SOURCE,
      })
      .returning();

    await db.insert(reviewAnalysis).values({
      organizationId,
      reviewId: created!.id,
      sentiment: review.sentiment,
      topics: review.topics,
      confidence: "0.750",
      modelName: "demo-seed-fixed-heuristic",
    });
  }
}

async function seedRecommendation(
  organizationId: string,
  businessId: string,
  auditId: string,
  candidates: SeoIssueCandidate[],
): Promise<void> {
  await db
    .delete(recommendations)
    .where(
      and(eq(recommendations.businessId, businessId), eq(recommendations.modelName, DEMO_SOURCE)),
    );

  if (candidates.length === 0) return;

  const severityRank: Record<SeoIssueCandidate["severity"], number> = {
    critical: 3,
    high: 2,
    medium: 1,
    low: 0,
  };
  const topCandidate = [...candidates].sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity],
  )[0]!;

  const [sourceIssue] = await db
    .select({ id: seoIssues.id })
    .from(seoIssues)
    .where(and(eq(seoIssues.auditId, auditId), eq(seoIssues.code, topCandidate.code)))
    .limit(1);

  // Not AI-generated (packages/ai doesn't exist yet) — a plain,
  // evidence-backed recommendation derived directly from the
  // deterministic issue, honestly marked as such.
  await db.insert(recommendations).values({
    organizationId,
    businessId,
    sourceIssueId: sourceIssue?.id,
    category: topCandidate.category,
    title: "Improve click-through rate for a well-ranked keyword",
    evidence: topCandidate.evidence,
    impact:
      topCandidate.severity === "low"
        ? "low"
        : topCandidate.severity === "medium"
          ? "medium"
          : "high",
    confidence: topCandidate.confidence.toString(),
    recommendedAction:
      "Rewrite the page title and meta description to better match what this query's searchers are looking for.",
    status: "pending",
    aiGenerated: false,
    modelName: DEMO_SOURCE,
  });
}

async function main() {
  guardAgainstProduction();

  const { organizationId, userId } = await resolveOrganizationAndUser();
  const businessId = await upsertDemoBusiness(organizationId, userId);
  await seedIntegrationAndMetrics(organizationId, businessId);
  const { auditId, candidates } = await seedSeoAudit(organizationId, businessId);
  await seedReviews(organizationId, businessId);
  await seedRecommendation(organizationId, businessId, auditId, candidates);

  console.log("Seed complete.");
  console.log(`  organizationId: ${organizationId}`);
  console.log(`  businessId:     ${businessId}`);
  console.log(`  auditId:        ${auditId} (${candidates.length} issue(s) detected)`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
