import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken } from "./google-oauth";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildAuthorizationUrl", () => {
  it("requests offline access and includes the caller's state and scopes", () => {
    const url = new URL(
      buildAuthorizationUrl({
        scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        state: "org_123:business_456",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/integrations/google/callback",
    );
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("state")).toBe("org_123:business_456");
    expect(url.searchParams.get("scope")).toBe(
      "https://www.googleapis.com/auth/webmasters.readonly",
    );
  });
});

function mockFetchOnce(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 400,
      json: () => Promise.resolve(body),
    }),
  );
}

describe("exchangeCodeForTokens", () => {
  it("posts the authorization code to Google's token endpoint", async () => {
    mockFetchOnce({
      access_token: "access-123",
      refresh_token: "refresh-123",
      expires_in: 3600,
      scope: "openid",
      token_type: "Bearer",
    });

    const tokens = await exchangeCodeForTokens("auth-code-abc");

    expect(tokens.access_token).toBe("access-123");
    expect(fetch).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    const body = new URLSearchParams(init!.body as string);
    expect(body.get("code")).toBe("auth-code-abc");
    expect(body.get("grant_type")).toBe("authorization_code");
  });

  it("throws instead of returning a partial result on a non-OK response", async () => {
    mockFetchOnce({ error: "invalid_grant" }, false);
    await expect(exchangeCodeForTokens("bad-code")).rejects.toThrow();
  });
});

describe("refreshAccessToken", () => {
  it("sends the refresh_token grant", async () => {
    mockFetchOnce({
      access_token: "new-access-token",
      expires_in: 3600,
      scope: "openid",
      token_type: "Bearer",
    });

    await refreshAccessToken("stored-refresh-token");

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    const body = new URLSearchParams(init!.body as string);
    expect(body.get("refresh_token")).toBe("stored-refresh-token");
    expect(body.get("grant_type")).toBe("refresh_token");
  });
});
