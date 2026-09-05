const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export class GroqUnavailableError extends Error {}

/**
 * Calls Groq's free developer tier (OpenAI-compatible chat completions
 * API) — the first link in the AI fallback chain per docs/free-tooling.md:
 * Groq -> Gemini -> Ollama -> deterministic. No credit card required for
 * the free tier, but it's still rate-limited, so callers must treat a
 * 429 the same as any other unavailability and fall through.
 */
export async function callGroq(prompt: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GroqUnavailableError("GROQ_API_KEY is not set.");
  }

  const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (response.status === 429) {
    throw new GroqUnavailableError("Groq free-tier rate limit exceeded.");
  }
  if (!response.ok) {
    throw new GroqUnavailableError(`Groq API returned ${response.status}.`);
  }

  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content;
  if (!text) {
    throw new GroqUnavailableError("Groq returned no content.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GroqUnavailableError("Groq did not return valid JSON.");
  }
}
