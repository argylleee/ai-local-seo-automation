import type { captureRequestError } from "@sentry/nextjs";

/**
 * Sentry wiring, entirely opt-in via SENTRY_DSN (docs/environment.md
 * already names this var). Deliberately minimal: no withSentryConfig
 * wrapping of next.config.ts (that requires SENTRY_AUTH_TOKEN for
 * source-map upload, which would fail the build for anyone who hasn't
 * set one up) and no client-side config — just server-side error
 * capture via Next's instrumentation hooks. With SENTRY_DSN unset,
 * both hooks below are no-ops and nothing about the build changes;
 * the SDK itself is only ever imported (dynamically) when it's set.
 */
export async function register(): Promise<void> {
  if (!process.env.SENTRY_DSN || process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export async function onRequestError(
  ...args: Parameters<typeof captureRequestError>
): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
