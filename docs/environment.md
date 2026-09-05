# Environment Variables

Never commit real values.

Example:

```env
DATABASE_URL=
DIRECT_URL=

AUTH_SECRET=

APP_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

TOKEN_ENCRYPTION_KEY=

PAGESPEED_API_KEY=

GROQ_API_KEY=

GEMINI_API_KEY=

N8N_BASE_URL=
N8N_INTERNAL_SECRET=

REDIS_URL=

SENTRY_DSN=
```

## Rules

- `.env` is local only.
- `.env.example` contains names only.
- CI secrets must be stored in the CI secret manager.
- Production secrets must not be copied into local documentation.
- `TOKEN_ENCRYPTION_KEY` encrypts OAuth tokens at rest (packages/integrations) — generate with `openssl rand -base64 32`. Rotating it invalidates every stored connection's tokens (they must be re-authorized).
- `APP_URL` is this app's own base URL, used to build OAuth redirect URIs — it must exactly match a redirect URI registered on the Google OAuth client.
- `GROQ_API_KEY` (packages/ai) is the first link in the AI fallback chain — Groq's free developer tier needs no credit card. `GROQ_MODEL` (optional) overrides the default (`groq/compound-mini`). Verify current free-tier model availability at console.groq.com before changing it — confirmed live that `llama-3.3-70b-versatile` had already been decommissioned by the time this was built, despite being a commonly-cited default elsewhere.
- `GEMINI_MODEL` (packages/ai, optional) overrides the default free-tier model name (`gemini-flash-latest`). Verify the current free-tier model before changing it — Google's lineup shifts.
- `OLLAMA_BASE_URL` / `OLLAMA_MODEL` (packages/ai, optional) point at a local Ollama instance for the third link in the AI fallback chain (default `http://localhost:11434`, model `llama3.1`). Not needed if you only rely on Groq/Gemini + the deterministic fallback.
- `SENTRY_DSN` (apps/web, optional) enables server-side error reporting (apps/web/instrumentation.ts). Left unset, it's a complete no-op — no build behavior changes and the Sentry SDK is never even imported.
