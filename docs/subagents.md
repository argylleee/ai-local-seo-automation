# Parallel Sub-Agent Development

## Objective

Allow multiple agents to work in parallel without conflicts.

## Recommended workstreams

### Agent A — Frontend
Owns:
- app UI
- components
- dashboard
- UX
- client-side state

### Agent B — Backend
Owns:
- API routes
- domain services
- auth integration
- authorization

### Agent C — Database
Owns:
- schema
- migrations
- repositories
- seed data

### Agent D — SEO Engine
Owns:
- deterministic SEO rules
- scoring
- normalization
- SEO domain logic

### Agent E — AI Layer
Owns:
- prompt templates
- AI provider adapters
- schemas
- AI tests

### Agent F — Crawler
Owns:
- crawling
- extraction
- URL safety
- crawler tests

### Agent G — Documentation/QA
Owns:
- docs
- test plans
- fixtures
- architecture consistency review

## Conflict prevention

Each agent must have an explicit file ownership scope.

Do not allow concurrent edits to:
- package lockfiles
- shared configuration
- database schema files
- root TypeScript config
- CI configuration

unless coordinated.

## Integration protocol

Before merging:
1. run tests
2. run type checking
3. run lint
4. inspect diff
5. report changed files
6. report assumptions
7. report migration requirements

## n8n restriction

No sub-agent owns production n8n workflow creation or modification.

The developer owns n8n.
