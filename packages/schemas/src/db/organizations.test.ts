import { describe, expect, it } from "vitest";
import {
  addOrganizationMemberRequestSchema,
  createOrganizationRequestSchema,
} from "./organizations";

describe("createOrganizationRequestSchema", () => {
  it("accepts a valid name/slug pair", () => {
    const result = createOrganizationRequestSchema.parse({ name: "Acme", slug: "acme" });
    expect(result).toEqual({ name: "Acme", slug: "acme" });
  });

  it("rejects a missing slug", () => {
    expect(() => createOrganizationRequestSchema.parse({ name: "Acme" })).toThrow();
  });
});

describe("addOrganizationMemberRequestSchema", () => {
  // docs/security.md: "Never trust organization_id supplied by the client."
  it("strips an organizationId supplied by the client instead of trusting it", () => {
    const result = addOrganizationMemberRequestSchema.parse({
      userId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      organizationId: "attacker-controlled-org-id",
    });
    expect(result).not.toHaveProperty("organizationId");
  });

  it("rejects a non-uuid userId", () => {
    expect(() => addOrganizationMemberRequestSchema.parse({ userId: "not-a-uuid" })).toThrow();
  });
});
