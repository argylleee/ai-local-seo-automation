import { describe, expect, it } from "vitest";
import { EXPECTED_CTR_BY_POSITION, getExpectedCtr } from "./thresholds";

describe("getExpectedCtr", () => {
  it("returns the documented table value for an exact position", () => {
    expect(getExpectedCtr(1)).toBe(EXPECTED_CTR_BY_POSITION[1]);
    expect(getExpectedCtr(10)).toBe(EXPECTED_CTR_BY_POSITION[10]);
  });

  it("rounds fractional average positions to the nearest whole position", () => {
    expect(getExpectedCtr(6.2)).toBe(EXPECTED_CTR_BY_POSITION[6]);
  });

  it("interpolates a declining curve for positions 11-20", () => {
    const at11 = getExpectedCtr(11);
    const at15 = getExpectedCtr(15);
    const at20 = getExpectedCtr(20);
    expect(at11).toBeLessThan(EXPECTED_CTR_BY_POSITION[10]!);
    expect(at15).toBeLessThan(at11);
    expect(at20).toBeLessThan(at15);
  });

  it("falls back to a flat low value beyond position 20", () => {
    expect(getExpectedCtr(45)).toBe(getExpectedCtr(30));
  });
});
