import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Demo Organization")).toBe("demo-organization");
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugify("Juan's Sari-Sari Store!")).toBe("juan-s-sari-sari-store");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  Leading Space")).toBe("leading-space");
  });

  it("falls back to a default for an empty/unslugifiable input", () => {
    expect(slugify("")).toBe("org");
    expect(slugify("!!!")).toBe("org");
  });
});
