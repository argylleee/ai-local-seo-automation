import { organizationMembers, organizations, users } from "@local-seo/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const organizationSelectSchema = createSelectSchema(organizations);
export const organizationInsertSchema = createInsertSchema(organizations);

// Client-facing: id/timestamps are server-assigned.
export const createOrganizationRequestSchema = organizationInsertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const userSelectSchema = createSelectSchema(users);
export const userInsertSchema = createInsertSchema(users, {
  email: (schema) => schema.email.email(),
});

export const organizationMemberSelectSchema = createSelectSchema(organizationMembers);
export const organizationMemberInsertSchema = createInsertSchema(organizationMembers);

// Client-facing: organizationId is resolved server-side from the session,
// never trusted from the request body — see docs/security.md.
export const addOrganizationMemberRequestSchema = organizationMemberInsertSchema.omit({
  id: true,
  organizationId: true,
  createdAt: true,
});

export type Organization = z.infer<typeof organizationSelectSchema>;
export type User = z.infer<typeof userSelectSchema>;
export type OrganizationMember = z.infer<typeof organizationMemberSelectSchema>;
