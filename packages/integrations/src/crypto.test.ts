import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./crypto";

describe("encryptToken/decryptToken", () => {
  it("round-trips a token", () => {
    const plaintext = "ya29.a0AfH6SMB_example_access_token";
    const encrypted = encryptToken(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const plaintext = "same-plaintext";
    expect(encryptToken(plaintext)).not.toBe(encryptToken(plaintext));
  });

  // docs/security.md: tokens must be encrypted at rest — a tampered
  // ciphertext (e.g. a compromised row) must not decrypt silently.
  it("rejects a tampered payload instead of returning corrupted plaintext", () => {
    const encrypted = encryptToken("a-refresh-token");
    const parts = encrypted.split(":");
    const tamperedCiphertext = Buffer.from(parts[2]!, "base64");
    tamperedCiphertext[0] = tamperedCiphertext[0]! ^ 0xff;
    const tampered = [parts[0], parts[1], tamperedCiphertext.toString("base64")].join(":");

    expect(() => decryptToken(tampered)).toThrow();
  });

  it("rejects a malformed payload", () => {
    expect(() => decryptToken("not-a-valid-payload")).toThrow();
  });
});
