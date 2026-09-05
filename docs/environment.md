# Environment Variables

Never commit real values.

Example:

```env
DATABASE_URL=
DIRECT_URL=

AUTH_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

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
