import { describe, expect, it } from "vitest";
import { MOCK_SEARCH_ROWS } from "../fixtures";
import { detectHighVisibilityLowCtr } from "./high-visibility-low-ctr";

describe("detectHighVisibilityLowCtr", () => {
  it("fires when position is in range, impressions clear the threshold, and CTR is below expected", () => {
    const candidate = detectHighVisibilityLowCtr(MOCK_SEARCH_ROWS[0]!);
    expect(candidate).not.toBeNull();
    expect(candidate?.code).toBe("HIGH_VISIBILITY_LOW_CTR");
    expect(candidate?.category).toBe("KEYWORDS");
    expect(candidate?.confidence).toBeGreaterThan(0);
    expect(candidate?.confidence).toBeLessThanOrEqual(1);
  });

  it("does not fire when CTR already meets or beats the benchmark", () => {
    expect(detectHighVisibilityLowCtr(MOCK_SEARCH_ROWS[2]!)).toBeNull();
  });

  it("does not fire below the impressions threshold, even with a real CTR gap", () => {
    expect(detectHighVisibilityLowCtr(MOCK_SEARCH_ROWS[3]!)).toBeNull();
  });

  it("does not fire outside the 4-15 position window", () => {
    expect(
      detectHighVisibilityLowCtr({
        query: "top ranked query",
        page: "https://example.ph/",
        impressions: 1000,
        clicks: 50,
        ctr: 0.05,
        position: 1,
      }),
    ).toBeNull();
  });

  it("assigns higher severity to a larger CTR gap", () => {
    const smallGap = detectHighVisibilityLowCtr({
      query: "q",
      page: "p",
      impressions: 200,
      clicks: 9,
      ctr: 0.045, // just under the ~0.05 benchmark at position 6
      position: 6,
    });
    const largeGap = detectHighVisibilityLowCtr({
      query: "q",
      page: "p",
      impressions: 200,
      clicks: 1,
      ctr: 0.005, // far under the benchmark
      position: 6,
    });
    expect(smallGap?.severity).toBe("low");
    expect(largeGap?.severity).toBe("high");
  });
});
