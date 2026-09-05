import { describe, expect, it } from "vitest";
import { extractSeoData } from "../src/extract/extract-seo-data";

const PAGE_URL = "https://demo.example.ph/";

describe("extractSeoData", () => {
  it("extracts a well-formed page cleanly", () => {
    const html = `<!doctype html><html><head>
      <title>Demo Sari-Sari Store | Quezon City</title>
      <meta name="description" content="A neighborhood store in Quezon City." />
      <link rel="canonical" href="https://demo.example.ph/" />
      <meta name="viewport" content="width=device-width" />
      <script type="application/ld+json">{"@type":"LocalBusiness"}</script>
    </head><body>
      <h1>Welcome to Demo Sari-Sari Store</h1>
      <p>${"word ".repeat(300)}</p>
      <img src="/logo.png" alt="Store logo" />
      <img src="/banner.png" />
      <a href="/about">About</a>
      <a href="https://other.ph/">External</a>
    </body></html>`;

    const result = extractSeoData(html, PAGE_URL, 200);

    expect(result.title).toBe("Demo Sari-Sari Store | Quezon City");
    expect(result.metaDescription).toBe("A neighborhood store in Quezon City.");
    expect(result.canonicalUrl).toBe("https://demo.example.ph/");
    expect(result.h1Texts).toEqual(["Welcome to Demo Sari-Sari Store"]);
    expect(result.wordCount).toBeGreaterThan(290);
    expect(result.imageCount).toBe(2);
    expect(result.imagesMissingAlt).toBe(1);
    expect(result.hasStructuredData).toBe(true);
    expect(result.isNoindex).toBe(false);
    expect(result.hasViewportMeta).toBe(true);
    expect(result.internalLinkCount).toBe(1);
    expect(result.externalLinkCount).toBe(1);
  });

  it("reports missing title/description/canonical/h1 as null/empty rather than throwing", () => {
    const result = extractSeoData("<html><head></head><body></body></html>", PAGE_URL, 200);
    expect(result.title).toBeNull();
    expect(result.metaDescription).toBeNull();
    expect(result.canonicalUrl).toBeNull();
    expect(result.h1Texts).toEqual([]);
    expect(result.hasStructuredData).toBe(false);
  });

  it("detects a noindex robots meta tag", () => {
    const html =
      '<html><head><meta name="robots" content="noindex, nofollow" /></head><body></body></html>';
    expect(extractSeoData(html, PAGE_URL, 200).isNoindex).toBe(true);
  });

  it("skips mailto/tel/anchor links when counting internal/external links", () => {
    const html = `<html><body>
      <a href="#top">Top</a>
      <a href="mailto:hi@example.ph">Email</a>
      <a href="tel:+63900000000">Call</a>
      <a href="/contact">Contact</a>
    </body></html>`;
    const result = extractSeoData(html, PAGE_URL, 200);
    expect(result.internalLinkCount).toBe(1);
    expect(result.externalLinkCount).toBe(0);
  });
});
