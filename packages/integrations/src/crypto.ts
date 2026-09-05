import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended nonce length for GCM
const KEY_LENGTH = 32; // AES-256

function loadKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Copy .env.example to .env and fill it in " +
        "(generate one with: openssl rand -base64 32).",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}). ` +
        "Generate one with: openssl rand -base64 32.",
    );
  }
  return key;
}

/**
 * Encrypts OAuth access/refresh tokens before they are written to
 * oauth_connections, per docs/security.md: "Store refresh tokens
 * encrypted at rest." Never call this with a key sourced from anywhere
 * but the server-side TOKEN_ENCRYPTION_KEY env var.
 *
 * Output format: `${iv}:${authTag}:${ciphertext}`, each base64.
 */
export function encryptToken(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(
    ":",
  );
}

/** Reverses {@link encryptToken}. Throws if the payload was tampered with. */
export function decryptToken(payload: string): string {
  const key = loadKey();
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted token payload.");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
