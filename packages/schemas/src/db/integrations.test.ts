import { describe, expect, it } from "vitest";
import { oauthConnectionPublicSchema } from "./integrations";

describe("oauthConnectionPublicSchema", () => {
  // docs/security.md: "Never expose access/refresh tokens to the browser."
  it("strips token material even if present on the source row", () => {
    const row = {
      id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      organizationId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      integrationId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      provider: "google_search_console",
      accessTokenEncrypted: "should-never-leave-the-server",
      refreshTokenEncrypted: "should-never-leave-the-server",
      scope: "readonly",
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = oauthConnectionPublicSchema.parse(row);

    expect(result).not.toHaveProperty("accessTokenEncrypted");
    expect(result).not.toHaveProperty("refreshTokenEncrypted");
  });
});
