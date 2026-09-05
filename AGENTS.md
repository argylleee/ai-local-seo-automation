# Agent Rules

## Mission

Build a robust, maintainable Local SEO SaaS for Philippine businesses.

## Non-negotiable constraints

1. The developer owns all n8n automation design.
2. Do not autonomously create, edit, import, activate, delete, or deploy n8n workflows.
3. Do not create or modify API credentials.
4. Do not send external business-side effects without explicit approval.
5. Do not introduce paid APIs/services without explicit approval.
6. Prefer deterministic code over LLM reasoning whenever rules can solve the problem.
7. AI output must be validated against schemas.
8. Never treat LLM output as trusted data.
9. PostgreSQL is the source of truth.
10. Every tenant-owned record must be organization-scoped.
11. Never expose OAuth tokens, API keys, service credentials, or secrets to the browser.
12. Do not invent SEO metrics, search volume, rankings, reviews, business facts, or competitor data.
13. Do not automatically publish AI-generated content or review responses.
14. Human approval is required for externally visible business actions.
15. Keep changes small and reviewable.

## Sub-agent rules

Sub-agents work in parallel only on isolated scopes.

Each sub-agent must:
- read `docs/architecture.md`
- read `docs/security.md`
- read `docs/design.md`
- read `docs/subagents.md`
- identify affected modules before editing
- avoid unrelated files
- report files changed
- report tests run
- report unresolved assumptions

Never allow two agents to concurrently edit the same file.

## Definition of done

A feature is complete only when:
- implementation exists
- validation exists
- authorization is checked
- errors are handled
- tests cover important paths
- documentation is updated where architecture/API behavior changed
- no secrets are committed
- no paid dependency was introduced without approval
