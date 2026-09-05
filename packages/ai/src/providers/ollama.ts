const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.1";

export class OllamaUnavailableError extends Error {}

/**
 * Calls a local Ollama instance — the second link in docs/free-tooling.md's
 * AI fallback chain (Gemini -> Ollama -> deterministic). Same contract
 * as callGemini: guarantees valid JSON syntax only, never a specific
 * shape.
 */
export async function callOllama(prompt: string): Promise<unknown> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL;
  const model = process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
    });
  } catch {
    throw new OllamaUnavailableError(`Could not reach Ollama at ${baseUrl}.`);
  }

  if (!response.ok) {
    throw new OllamaUnavailableError(`Ollama returned ${response.status}.`);
  }

  const body = (await response.json()) as { response?: string };
  if (!body.response) {
    throw new OllamaUnavailableError("Ollama returned no content.");
  }

  try {
    return JSON.parse(body.response);
  } catch {
    throw new OllamaUnavailableError("Ollama did not return valid JSON.");
  }
}
