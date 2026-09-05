import { describe, expect, it, vi } from "vitest";
import { assertSafeHost, assertSafeUrl, isBlockedIp, SsrfBlockedError } from "../src/ssrf-guard";

describe("isBlockedIp", () => {
  it("blocks loopback", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("::1")).toBe(true);
  });

  it("blocks link-local, including the cloud metadata address", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
    expect(isBlockedIp("169.254.1.1")).toBe(true);
  });

  it("blocks RFC1918 private ranges", () => {
    expect(isBlockedIp("10.0.0.5")).toBe(true);
    expect(isBlockedIp("172.16.5.5")).toBe(true);
    expect(isBlockedIp("172.31.255.255")).toBe(true);
    expect(isBlockedIp("192.168.1.1")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 private addresses", () => {
    expect(isBlockedIp("::ffff:10.0.0.1")).toBe(true);
  });

  it("blocks IPv6 unique-local and link-local", () => {
    expect(isBlockedIp("fc00::1")).toBe(true);
    expect(isBlockedIp("fd12:3456::1")).toBe(true);
    expect(isBlockedIp("fe80::1")).toBe(true);
  });

  it("allows ordinary public IPs", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("93.184.216.34")).toBe(false);
  });

  it("fails closed on garbage input", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});

describe("assertSafeHost", () => {
  it("rejects the literal hostname 'localhost'", async () => {
    await expect(assertSafeHost("localhost")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects a literal private IP without needing DNS", async () => {
    await expect(assertSafeHost("127.0.0.1")).rejects.toThrow(SsrfBlockedError);
    await expect(assertSafeHost("169.254.169.254")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects a hostname that resolves to a private IP (DNS rebinding)", async () => {
    vi.resetModules();
    vi.doMock("node:dns", () => ({
      promises: { lookup: vi.fn().mockResolvedValue([{ address: "127.0.0.1", family: 4 }]) },
    }));
    const { assertSafeHost: freshAssertSafeHost, SsrfBlockedError: FreshError } =
      await import("../src/ssrf-guard");
    await expect(freshAssertSafeHost("attacker-controlled.example")).rejects.toThrow(FreshError);
    vi.doUnmock("node:dns");
    vi.resetModules();
  });
});

describe("assertSafeUrl", () => {
  it("rejects non-http(s) protocols", async () => {
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow(SsrfBlockedError);
    await expect(assertSafeUrl("ftp://example.com/")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects an unparsable URL", async () => {
    await expect(assertSafeUrl("not a url")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects a URL pointing at a private IP", async () => {
    await expect(assertSafeUrl("http://127.0.0.1/admin")).rejects.toThrow(SsrfBlockedError);
    await expect(assertSafeUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow(
      SsrfBlockedError,
    );
  });
});
