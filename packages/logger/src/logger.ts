import { redact } from "./redact";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogMeta {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  /** Returns a new logger with `context` merged into every future log line. */
  child(context: LogMeta): Logger;
}

function write(level: LogLevel, context: LogMeta, message: string, meta?: LogMeta): void {
  const line = {
    level,
    time: new Date().toISOString(),
    message,
    ...(redact(context) as LogMeta),
    ...(meta ? (redact(meta) as LogMeta) : {}),
  };
  // Looked up at call time (not captured in a module-level map) so
  // that spying/mocking console methods in tests actually intercepts
  // these calls.
  console[level](JSON.stringify(line));
}

/**
 * Structured JSON logger. Use `correlationId` (a request/job id) instead
 * of logging full payloads, per docs/security.md — every value is
 * redacted (packages/logger/src/redact.ts) before it's ever serialized,
 * so a caller can't accidentally leak a token by passing it as meta.
 */
export function createLogger(context: LogMeta = {}): Logger {
  return {
    debug: (message, meta) => write("debug", context, message, meta),
    info: (message, meta) => write("info", context, message, meta),
    warn: (message, meta) => write("warn", context, message, meta),
    error: (message, meta) => write("error", context, message, meta),
    child: (childContext) => createLogger({ ...context, ...childContext }),
  };
}

export const logger = createLogger();
