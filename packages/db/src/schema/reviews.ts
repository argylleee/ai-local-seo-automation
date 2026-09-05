import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { businessLocations, businesses } from "./businesses";
import { organizations } from "./organizations";
import { timestamps } from "./_shared";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => businessLocations.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull().default("google_business_profile"),
    externalReviewId: text("external_review_id").notNull(),
    authorName: text("author_name"),
    rating: integer("rating"),
    text: text("text"),
    // detected language of the review body: en, fil, or mixed Taglish
    language: text("language"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    source: text("source").notNull().default("google_business_profile"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("reviews_organization_id_idx").on(t.organizationId),
    index("reviews_business_id_idx").on(t.businessId),
    uniqueIndex("reviews_provider_external_id_idx").on(t.provider, t.externalReviewId),
  ],
);

export const reviewSentimentEnum = pgEnum("review_sentiment", ["positive", "neutral", "negative"]);

/**
 * AI-derived interpretation of a review. Never authoritative on its own —
 * always tied back to the source review text for evidence. See docs/ai.md.
 */
export const reviewAnalysis = pgTable(
  "review_analysis",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    sentiment: reviewSentimentEnum("sentiment").notNull(),
    // bounded array of topic strings, schema-validated before persistence
    topics: jsonb("topics").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    modelName: text("model_name").notNull(),
    modelVersion: text("model_version"),
    ...timestamps,
  },
  (t) => [
    index("review_analysis_organization_id_idx").on(t.organizationId),
    uniqueIndex("review_analysis_review_id_idx").on(t.reviewId),
  ],
);
