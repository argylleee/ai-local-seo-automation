const DEFAULT_MODEL = "gemini-flash-latest";

export class GeminiUnavailableError extends Error {}

/**
 * Calls Gemini's free tier (docs/free-tooling.md preference order:
 * Gemini free tier -> Ollama -> deterministic fallback). Requests JSON
 * output directly; the caller is still responsible for validating the
 * result against a schema — this only guarantees valid JSON syntax, not
 * a particular shape (docs/security.md: "Treat model output as
 * untrusted").
 */
export async function callGemini(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiUnavailableError("GEMINI_API_KEY is not set.");
  }

  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (response.status === 429) {
    throw new GeminiUnavailableError("Gemini free-tier quota exceeded.");
  }
  if (!response.ok) {
    throw new GeminiUnavailableError(`Gemini API returned ${response.status}.`);
  }

  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiUnavailableError("Gemini returned no content.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiUnavailableError("Gemini did not return valid JSON.");
  }
}
