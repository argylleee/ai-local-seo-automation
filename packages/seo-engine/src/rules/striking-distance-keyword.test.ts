import { describe, expect, it } from "vitest";
import { MOCK_SEARCH_ROWS } from "../fixtures";
import { detectStrikingDistanceKeyword } from "./striking-distance-keyword";

describe("detectStrikingDistanceKeyword", () => {
  it("fires for a query ranking just off page one with real volume", () => {
    const candidate = detectStrikingDistanceKeyword(MOCK_SEARCH_ROWS[1]!);
    expect(candidate?.code).toBe("STRIKING_DISTANCE_KEYWORD");
    expect(candidate?.category).toBe("KEYWORDS");
  });

  it("does not fire for a page-one ranking", () => {
    expect(detectStrikingDistanceKeyword(MOCK_SEARCH_ROWS[2]!)).toBeNull();
  });

  it("does not fire below the impressions threshold", () => {
    expect(
      detectStrikingDistanceKeyword({
        query: "q",
        page: "p",
        impressions: 5,
        clicks: 0,
        ctr: 0,
        position: 12,
      }),
    ).toBeNull();
  });

  it("does not fire beyond position 20", () => {
    expect(
      detectStrikingDistanceKeyword({
        query: "q",
        page: "p",
        impressions: 500,
        clicks: 0,
        ctr: 0,
        position: 25,
      }),
    ).toBeNull();
  });
});
