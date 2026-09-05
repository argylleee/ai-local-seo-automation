# Architecture

## Architectural style

Use a modular monolith for the application plus separately deployable automation/crawler services.

```text
Browser
  |
  v
Next.js application
  |-- UI
  |-- API/Route Handlers
  |-- Auth/session handling
  |-- Domain services
  |
  +----> PostgreSQL (source of truth)
  |
  +----> n8n webhooks/internal trigger API
                |
                +--> Google Search Console
                +--> Google Business Profile (when approved)
                +--> PageSpeed Insights
                +--> crawler service
                +--> AI provider
                +--> notifications
```

## Responsibilities

### Next.js
Owns:
- authentication/session
- authorization
- tenant isolation
- business rules
- API contracts
- CRUD
- dashboard
- approval state
- integration configuration
- job creation/status

### PostgreSQL
Owns persistent state:
- users
- organizations
- businesses
- locations
- integrations
- SEO data
- reviews
- recommendations
- audit logs
- automation runs

### n8n
Owns:
- scheduling
- integration orchestration
- data synchronization
- notification workflows
- AI workflow execution
- retry/orchestration logic

n8n is NOT the source of truth.

### Crawler
Owns:
- fetching website pages
- extracting technical SEO data
- link graph collection
- structured data extraction

### AI
Owns:
- interpretation
- classification
- summarization
- recommendation wording

AI does NOT own:
- authorization
- scoring rules
- persistence decisions
- publishing decisions
- credential management

## Data flow

1. User connects an integration.
2. Backend securely stores authorized connection metadata.
3. Developer manually activates an n8n workflow.
4. n8n retrieves source data.
5. n8n normalizes data.
6. Deterministic analysis identifies candidate issues.
7. AI explains/classifies candidates.
8. Backend validates and stores results.
9. UI displays recommendations.
10. User approves/rejects actionable recommendations.
11. Only approved actions may trigger external side effects.

## No microservices by default

Do not split the application into multiple backend services unless there is a demonstrated operational reason.

The crawler is separated because browser/network crawling has different resource characteristics.
