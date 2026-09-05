import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLogger", () => {
  it("emits a JSON line with level, message, and merged context/meta", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const log = createLogger({ correlationId: "run-1" });
    log.info("sync started", { businessId: "biz-1" });

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("sync started");
    expect(parsed.correlationId).toBe("run-1");
    expect(parsed.businessId).toBe("biz-1");
    expect(typeof parsed.time).toBe("string");
  });

  it("never logs a sensitive field even if a caller passes one in meta", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = createLogger();
    log.error("token refresh failed", { accessToken: "ya29.real" });

    const parsed = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(parsed.accessToken).toBe("[REDACTED]");
  });

  it("child() merges parent context into subsequent log lines", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const parent = createLogger({ correlationId: "run-1" });
    const child = parent.child({ businessId: "biz-1" });
    child.warn("slow response");

    const parsed = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(parsed.correlationId).toBe("run-1");
    expect(parsed.businessId).toBe("biz-1");
  });
});
