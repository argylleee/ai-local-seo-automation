import { describe, expect, it } from "vitest";
import { normalizeUrl } from "../src/normalize-url";

describe("normalizeUrl", () => {
  it("lowercases the hostname", () => {
    expect(normalizeUrl("https://Example.PH/")).toBe("https://example.ph/");
  });

  it("strips the fragment", () => {
    expect(normalizeUrl("https://example.ph/page#section")).toBe("https://example.ph/page");
  });

  it("removes a trailing slash on non-root paths", () => {
    expect(normalizeUrl("https://example.ph/page/")).toBe("https://example.ph/page");
  });

  it("keeps the root path as a single slash", () => {
    expect(normalizeUrl("https://example.ph/")).toBe("https://example.ph/");
  });

  it("drops default ports", () => {
    expect(normalizeUrl("https://example.ph:443/page")).toBe("https://example.ph/page");
    expect(normalizeUrl("http://example.ph:80/page")).toBe("http://example.ph/page");
  });

  it("keeps a non-default port", () => {
    expect(normalizeUrl("http://example.ph:8080/page")).toBe("http://example.ph:8080/page");
  });
});
