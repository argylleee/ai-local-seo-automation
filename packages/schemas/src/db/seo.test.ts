import { describe, expect, it } from "vitest";
import { createAuditRequestSchema } from "./seo";

describe("createAuditRequestSchema", () => {
  it("accepts a businessId with an optional locationId", () => {
    const result = createAuditRequestSchema.parse({
      businessId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    });
    expect(result.locationId).toBeUndefined();
  });

  it("rejects a non-uuid businessId", () => {
    expect(() => createAuditRequestSchema.parse({ businessId: "not-a-uuid" })).toThrow();
  });
});
