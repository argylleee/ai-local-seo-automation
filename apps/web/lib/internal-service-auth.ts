import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison against N8N_INTERNAL_SECRET (docs/security.md:
 * "Use authentication on internal callbacks"). Returns false (never
 * throws) when the secret isn't configured, so a misconfigured
 * deployment fails closed instead of accepting every request. Shared by
 * every /api/internal/* route — n8n is the only caller of any of them.
 */
export function verifyInternalServiceSecret(providedSecret: string | null): boolean {
  const expected = process.env.N8N_INTERNAL_SECRET;
  if (!expected || !providedSecret) return false;

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(providedSecret);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

/** Shared path-param validation for every /api/internal/* route. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
