import { integrations, oauthConnections } from "@local-seo/db/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const integrationSelectSchema = createSelectSchema(integrations);

/**
 * Encrypted-at-rest token columns must never reach the browser (docs/security.md).
 * `oauthConnectionSelectSchema` exists for internal/server-side use only —
 * API responses must use `oauthConnectionPublicSchema` instead, which omits
 * the token material and only reports connection status/metadata.
 */
export const oauthConnectionSelectSchema = createSelectSchema(oauthConnections);

export const oauthConnectionPublicSchema = oauthConnectionSelectSchema.omit({
  accessTokenEncrypted: true,
  refreshTokenEncrypted: true,
});

export type Integration = z.infer<typeof integrationSelectSchema>;
export type OauthConnectionPublic = z.infer<typeof oauthConnectionPublicSchema>;
