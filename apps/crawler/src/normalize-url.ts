/**
 * Normalizes a URL for consistent storage/comparison: lowercases the
 * host, strips the fragment, drops a trailing slash on paths deeper
 * than root, and removes default ports. docs/testing.md explicitly
 * calls out "URL normalization" as something unit tests should cover.
 */
export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}
