# Integrations & Free-First Policy

## Approved development stack

### Google Search Console API
Use for:
- queries
- pages
- clicks
- impressions
- CTR
- average position

Treat quota as finite. Cache and incrementally synchronize data.

### Google Business Profile APIs
Use only after obtaining required Google access approval.

Important: GBP APIs are not automatically available to every developer. Google requires eligibility/access approval and the user must have access to the relevant Business Profile.

Development must not depend exclusively on GBP availability.

Fallback:
- manually entered business information
- website audit
- Search Console data
- manually imported review/test fixtures

### PageSpeed Insights API
Use for technical performance/SEO signals where useful.

### AI

Preferred free-first option:
- Gemini API free tier for development/testing
- local open models through Ollama when practical

Do not use paid AI APIs unless explicitly approved.

Important:
Free-tier availability, quotas, and eligible models can change. Verify current limits before implementation.

### Website crawling

Prefer:
- Node.js
- Cheerio
- Playwright only when rendering is necessary

Do not introduce paid scraping APIs for MVP.

### Storage

Preferred:
- PostgreSQL
- local Docker PostgreSQL for development
- Supabase free tier if suitable

### Redis

Optional. Prefer local Redis or a free development tier.

Do not add Redis merely for architecture aesthetics.

### Notifications

Prefer email providers with a usable free development allowance or local/dev SMTP.

Avoid making a paid notification provider a core dependency.

## Prohibited by default

Do not introduce:
- paid SERP APIs
- paid keyword APIs
- paid web scraping services
- paid LLM APIs
- paid SEO suites
- paid proxy services

without explicit developer approval.

## Data integrity rule

Never fabricate:
- search volume
- ranking
- CTR benchmarks
- review counts
- competitor metrics
- business profile information

If unavailable, mark it unavailable.
