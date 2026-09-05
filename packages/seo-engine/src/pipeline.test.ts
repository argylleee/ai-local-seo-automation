import { describe, expect, it } from "vitest";
import { MOCK_SEARCH_ROWS } from "./fixtures";
import { analyzeSearchConsoleRows } from "./pipeline";

describe("analyzeSearchConsoleRows", () => {
  it("detects issues across all rows and scores them deterministically", () => {
    const { candidates, score } = analyzeSearchConsoleRows(MOCK_SEARCH_ROWS);

    // Positions 11-15 fall inside both rule windows (4-15 and 11-20), so
    // the grocery-delivery row (position 13.5) legitimately triggers both.
    const codes = candidates.map((c) => c.code).sort();
    expect(codes).toEqual([
      "HIGH_VISIBILITY_LOW_CTR",
      "HIGH_VISIBILITY_LOW_CTR",
      "STRIKING_DISTANCE_KEYWORD",
    ]);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("returns a clean, unscored-down result for rows with no issues", () => {
    const clean = MOCK_SEARCH_ROWS.filter((r) => r.query === "example sari sari store");
    const { candidates, score } = analyzeSearchConsoleRows(clean);
    expect(candidates).toEqual([]);
    expect(score).toBe(100);
  });
});
