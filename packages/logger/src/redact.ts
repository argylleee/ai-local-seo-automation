// Field names that must never reach a log line, per docs/security.md:
// "Never log: access tokens, refresh tokens, API keys, passwords, full
// sensitive request bodies." Matched case-insensitively against object
// keys anywhere in the structure, not just top-level.
const SENSITIVE_KEY_PATTERN =
  /token|secret|password|api[_-]?key|authorization|cookie|refresh[_-]?token|access[_-]?token/i;

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;

/**
 * Deep-clones `value`, replacing any value whose key matches a known
 * sensitive pattern with a fixed placeholder. Applied to every log call
 * so sensitive data can't leak through by accident — callers don't have
 * to remember to scrub things themselves.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (value instanceof Date) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(val, depth + 1);
  }
  return result;
}
