import { z } from "zod";

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

function redirectUri(): string {
  return `${requireEnv("APP_URL")}/api/integrations/google/callback`;
}

/**
 * Builds the consent-screen URL for connecting a Search Console/Business
 * Profile integration. This is a separate OAuth flow from the Google
 * login in apps/web/lib/auth.ts — that one only ever requests identity
 * scopes and never touches this module. `state` should be an
 * unguessable, per-request value the caller verifies on callback (CSRF
 * protection) and should encode which organization/business initiated
 * the connection.
 */
export function buildAuthorizationUrl(input: { scopes: string[]; state: string }): string {
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", requireEnv("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", input.scopes.join(" "));
  url.searchParams.set("state", input.state);
  return url.toString();
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  scope: z.string(),
  token_type: z.string(),
});

export type GoogleTokenResponse = z.infer<typeof tokenResponseSchema>;

async function postToTokenEndpoint(params: Record<string, string>): Promise<GoogleTokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });

  if (!response.ok) {
    // Never log the request body here — it contains the client secret
    // and, on refresh calls, a refresh token. See docs/security.md.
    throw new Error(`Google token endpoint returned ${response.status}`);
  }

  return tokenResponseSchema.parse(await response.json());
}

/** Exchanges an authorization code from the OAuth callback for tokens. */
export function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  return postToTokenEndpoint({
    code,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
}

/** Exchanges a stored (decrypted) refresh token for a new access token. */
export function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  return postToTokenEndpoint({
    refresh_token: refreshToken,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
}
