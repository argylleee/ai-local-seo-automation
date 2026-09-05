import { describe, expect, it } from "vitest";
import { formatManilaDate, formatPhp } from "./format";

describe("formatPhp", () => {
  it("formats an amount with the peso sign and two decimals", () => {
    expect(formatPhp(1500)).toBe("₱1,500.00");
  });

  it("formats zero and fractional amounts", () => {
    expect(formatPhp(0)).toBe("₱0.00");
    expect(formatPhp(19.5)).toBe("₱19.50");
  });
});

describe("formatManilaDate", () => {
  it("renders a date using Asia/Manila local time regardless of the host timezone", () => {
    // 2026-01-01T16:30:00Z is 2026-01-02 00:30 in Asia/Manila (UTC+8) —
    // a date that would print as a different calendar day than UTC.
    const date = new Date("2026-01-01T16:30:00Z");
    expect(formatManilaDate(date)).toBe("Jan 2, 2026");
  });
});
