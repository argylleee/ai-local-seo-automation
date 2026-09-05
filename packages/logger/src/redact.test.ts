import { describe, expect, it } from "vitest";
import { redact } from "./redact";

describe("redact", () => {
  it("redacts known sensitive keys", () => {
    const result = redact({
      accessToken: "ya29.real-token",
      refresh_token: "1//real-refresh",
      apiKey: "sk-real-key",
      password: "hunter2",
      Authorization: "Bearer real-token",
      cookie: "session=real",
    }) as Record<string, unknown>;

    for (const value of Object.values(result)) {
      expect(value).toBe("[REDACTED]");
    }
  });

  it("leaves non-sensitive fields untouched", () => {
    const result = redact({ businessId: "abc-123", count: 5 });
    expect(result).toEqual({ businessId: "abc-123", count: 5 });
  });

  it("redacts sensitive keys nested inside objects and arrays", () => {
    const result = redact({
      user: { email: "a@b.com", secret: "shh" },
      items: [{ token: "abc" }, { name: "ok" }],
    }) as Record<string, unknown>;

    expect((result.user as Record<string, unknown>).secret).toBe("[REDACTED]");
    expect((result.user as Record<string, unknown>).email).toBe("a@b.com");
    const items = result.items as Record<string, unknown>[];
    expect(items[0]!.token).toBe("[REDACTED]");
    expect(items[1]!.name).toBe("ok");
  });

  it("does not mutate the original object", () => {
    const original = { accessToken: "real-token" };
    redact(original);
    expect(original.accessToken).toBe("real-token");
  });

  it("passes through primitives, null, and dates unchanged", () => {
    expect(redact("hello")).toBe("hello");
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBeNull();
    const date = new Date();
    expect(redact(date)).toBe(date);
  });
});
