import type { z } from "zod";
import { callGemini } from "./providers/gemini";
import { callGroq } from "./providers/groq";
import { callOllama } from "./providers/ollama";

export type AiSource = "groq" | "gemini" | "ollama";

/**
 * Tries Groq, then Gemini, then Ollama, validating each raw response
 * against `schema` before accepting it (docs/security.md: "Treat model
 * output as untrusted" / "Never present model confidence as statistical
 * certainty" applies at the call sites that set confidence values).
 * A provider that responds but returns a malformed shape is treated the
 * same as one that's unreachable — move to the next link in the chain.
 * Returns null if every provider is unavailable or invalid; callers
 * MUST have a deterministic fallback for that case, per
 * docs/free-tooling.md: "The product should degrade gracefully rather
 * than fail because AI is unavailable."
 */
export async function generateStructuredOutput<T>(
  schema: z.ZodType<T>,
  prompt: string,
): Promise<{ data: T; source: AiSource } | null> {
  for (const [source, call] of [
    ["groq", callGroq],
    ["gemini", callGemini],
    ["ollama", callOllama],
  ] as const) {
    try {
      const raw = await call(prompt);
      const parsed = schema.safeParse(raw);
      if (parsed.success) {
        return { data: parsed.data, source };
      }
    } catch {
      // Provider unavailable — fall through to the next one.
    }
  }
  return null;
}
