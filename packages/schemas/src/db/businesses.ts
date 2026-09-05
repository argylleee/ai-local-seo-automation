import { businessLocations, businesses } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zNumeric } from "./_numeric";

export const businessSelectSchema = createSelectSchema(businesses);
export const businessInsertSchema = createInsertSchema(businesses, {
  name: (schema) => schema.name.min(1, "Name is required."),
  website: (schema) => schema.website.url(),
});

// Client-facing create: organizationId comes from the session, id/timestamps
// are server-assigned, createdBy is derived from the authenticated user.
export const createBusinessRequestSchema = businessInsertSchema.omit({
  id: true,
  organizationId: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export const businessLocationSelectSchema = createSelectSchema(businessLocations, {
  latitude: zNumeric,
  longitude: zNumeric,
});
export const businessLocationInsertSchema = createInsertSchema(businessLocations, {
  latitude: zNumeric,
  longitude: zNumeric,
});

export const createBusinessLocationRequestSchema = businessLocationInsertSchema.omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
});

export type Business = z.infer<typeof businessSelectSchema>;
export type BusinessLocation = z.infer<typeof businessLocationSelectSchema>;
