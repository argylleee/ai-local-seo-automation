import { promises as dns } from "node:dns";
import { isIP } from "node:net";

export class SsrfBlockedError extends Error {}

/**
 * IPv4 ranges that must never be crawled — loopback, private, link-local
 * (which includes the 169.254.169.254 cloud metadata endpoint), and a
 * few other reserved blocks. docs/security.md: "Prevent SSRF against
 * private IP ranges... Block localhost, link-local, metadata, and
 * private network targets."
 */
const BLOCKED_IPV4_RANGES: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local + cloud metadata (169.254.169.254)
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4], // multicast
];

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number.parseInt(octet, 10), 0);
}

function isBlockedIpv4(ip: string): boolean {
  const target = ipv4ToInt(ip);
  return BLOCKED_IPV4_RANGES.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (-1 << (32 - prefix)) >>> 0;
    return (target & mask) === (ipv4ToInt(base) & mask);
  });
}

/**
 * IPv6 loopback (::1), unique local (fc00::/7), and link-local
 * (fe80::/10, which also covers the IPv6 metadata address space).
 */
function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true; // fe80::/10
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  // IPv4-mapped IPv6 (::ffff:10.0.0.1) — check the embedded IPv4 too.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
  if (mapped) return isBlockedIpv4(mapped[1]!);
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true; // not a recognizable IP at all — fail closed
}

/**
 * Resolves `hostname` and throws if it (or any of its resolved
 * addresses) is a private/reserved IP. Resolving is essential, not
 * optional — checking only the literal hostname string is vulnerable
 * to DNS rebinding (a hostname that legitimately resolves to a private
 * IP at request time).
 */
export async function assertSafeHost(hostname: string): Promise<void> {
  if (hostname.toLowerCase() === "localhost") {
    throw new SsrfBlockedError(`Blocked crawl target: ${hostname}`);
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new SsrfBlockedError(`Blocked crawl target: ${hostname}`);
    }
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new SsrfBlockedError(`Could not resolve host: ${hostname}`);
  }

  if (addresses.length === 0 || addresses.some((a) => isBlockedIp(a.address))) {
    throw new SsrfBlockedError(`Blocked crawl target: ${hostname}`);
  }
}

/** Validates scheme + host safety for a URL before it's ever fetched. */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError(`Invalid URL: ${rawUrl}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfBlockedError(`Blocked protocol: ${url.protocol}`);
  }

  await assertSafeHost(url.hostname);
  return url;
}
