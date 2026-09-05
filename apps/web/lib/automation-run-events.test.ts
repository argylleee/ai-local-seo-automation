import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyInternalServiceSecret } from "./automation-run-events";

describe("verifyInternalServiceSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when the provided secret matches N8N_INTERNAL_SECRET", () => {
    vi.stubEnv("N8N_INTERNAL_SECRET", "top-secret-value");
    expect(verifyInternalServiceSecret("top-secret-value")).toBe(true);
  });

  it("returns false when the provided secret doesn't match", () => {
    vi.stubEnv("N8N_INTERNAL_SECRET", "top-secret-value");
    expect(verifyInternalServiceSecret("wrong-value")).toBe(false);
  });

  it("returns false when no secret is configured (fails closed)", () => {
    vi.stubEnv("N8N_INTERNAL_SECRET", "");
    expect(verifyInternalServiceSecret("anything")).toBe(false);
  });

  it("returns false when no secret is provided", () => {
    vi.stubEnv("N8N_INTERNAL_SECRET", "top-secret-value");
    expect(verifyInternalServiceSecret(null)).toBe(false);
  });

  it("returns false for a different-length secret without throwing", () => {
    vi.stubEnv("N8N_INTERNAL_SECRET", "short");
    expect(verifyInternalServiceSecret("a-much-longer-value")).toBe(false);
  });
});
