# Philippine Local SEO Automation Platform

Production-oriented portfolio project for an AI-assisted Local SEO SaaS targeting Philippine businesses.

## Core principle

AI is an **analysis/recommendation component**, not an autonomous developer or autonomous operator.

The developer manually builds and maintains all application code and n8n workflows. AI must not create, modify, deploy, or execute workflows unless the developer explicitly instructs it to do so.

## Architecture

- Next.js + React + TypeScript frontend/backend
- PostgreSQL as source of truth
- n8n as manually authored automation/orchestration layer
- Node.js crawler service
- Google Search Console API
- Google Business Profile APIs when access is approved
- PageSpeed Insights API
- Gemini API free tier or another explicitly approved free/local model
- Redis only when needed for caching/locks
- Sentry or another free development-tier observability option

## Free-first rule

Use free/open-source/local tooling during development. Never introduce a paid API/service without explicit developer approval.

Do not assume an API is free merely because the library is free. Record pricing/quota assumptions in `docs/integrations.md`.

## Automation ownership

n8n workflows are manually designed by the developer.

Agents/sub-agents may:
- inspect workflows
- explain workflows
- suggest changes
- generate documentation
- generate test fixtures
- review workflow JSON supplied by the developer

Agents/sub-agents must NOT:
- create workflows
- edit workflow files
- import workflows into n8n
- publish/activate workflows
- create credentials
- modify production automations
- call external APIs to perform business actions

unless the developer explicitly authorizes that exact action.
