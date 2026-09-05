import { businessVisibilitySnapshots } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zNumeric } from "./_numeric";

// Manual GBP-insights stand-in while API access is pending Google's
// approval (docs/integrations.md) — only ever populated from what the
// business owner actually observed, never fabricated.
export const businessVisibilitySnapshotSelectSchema = createSelectSchema(
  businessVisibilitySnapshots,
  { value: zNumeric },
);
export const businessVisibilitySnapshotInsertSchema = createInsertSchema(
  businessVisibilitySnapshots,
  { value: zNumeric },
);

export const createBusinessVisibilitySnapshotRequestSchema =
  businessVisibilitySnapshotInsertSchema
    .omit({
      id: true,
      organizationId: true,
      source: true,
      capturedAt: true,
      createdAt: true,
    })
    .extend({
      metricType: z.enum([
        "map_pack_position",
        "profile_views",
        "search_views",
        "website_clicks",
        "call_clicks",
        "direction_requests",
      ]),
    });

export type BusinessVisibilitySnapshot = z.infer<typeof businessVisibilitySnapshotSelectSchema>;
