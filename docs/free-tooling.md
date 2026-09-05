# Free Tooling Baseline

This is the default development baseline.

## Local development

- Node.js
- pnpm
- Docker
- PostgreSQL
- Redis (optional)
- Ollama (optional local AI)
- n8n self-hosted

## Free APIs / services to prioritize

- Google Search Console API
- Google Business Profile APIs, subject to access approval
- PageSpeed Insights API
- Gemini API free tier for development/testing
- OpenStreetMap data where licensing/usage requirements are followed
- local crawler implementation

## Important

"Free" means free within current documented quotas/terms, not unlimited.

Before implementation, verify current:
- quota
- rate limits
- authentication requirements
- commercial-use restrictions
- data-use policies
- attribution requirements

Do not build the architecture around undocumented scraping or bypassing API restrictions.

## No paid dependency rule

If a proposed dependency requires payment:
1. stop
2. document the reason
3. propose a free/local alternative
4. wait for explicit developer approval

## AI model fallback

Preferred:

```text
Gemini free tier
     ↓ unavailable/quota exceeded
Ollama local model
     ↓ unavailable
deterministic fallback
```

The product should degrade gracefully rather than fail because AI is unavailable.
