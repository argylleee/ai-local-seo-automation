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
