import { assertSafeUrl } from "./ssrf-guard";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB — plenty for HTML, guards against huge bodies
const MAX_REDIRECTS = 5;
const USER_AGENT = "LocalSeoPlatformBot/1.0 (+https://github.com/anthropics)";

export class FetchSafeError extends Error {}

export interface SafeFetchResult {
  finalUrl: string;
  status: number;
  html: string;
}

/**
 * A fetch wrapper hardened per docs/security.md's web-crawling rules:
 * timeout, response-size cap, and — critically — each redirect hop is
 * independently re-validated by the SSRF guard rather than trusting
 * fetch's built-in redirect following, which would happily land on a
 * private IP a malicious/compromised site redirects to.
 */
export async function fetchSafe(rawUrl: string): Promise<SafeFetchResult> {
  let currentUrl = (await assertSafeUrl(rawUrl)).toString();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (hop === MAX_REDIRECTS) {
      throw new FetchSafeError(`Too many redirects starting from ${rawUrl}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });
    } catch (error) {
      throw new FetchSafeError(`Request to ${currentUrl} failed: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new FetchSafeError(`Redirect from ${currentUrl} had no Location header`);
      }
      currentUrl = (await assertSafeUrl(new URL(location, currentUrl).toString())).toString();
      continue;
    }

    const html = await readBodyWithLimit(response);
    return { finalUrl: currentUrl, status: response.status, html };
  }

  throw new FetchSafeError(`Too many redirects starting from ${rawUrl}`);
}

async function readBodyWithLimit(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new FetchSafeError(`Response exceeded ${MAX_RESPONSE_BYTES} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
