# Claude Code Project Instructions

Follow `AGENTS.md` as the highest project-level development rule.

Before implementing a task:
1. Inspect the relevant architecture and module docs.
2. Identify ownership boundaries.
3. Check whether the task affects tenant isolation, authentication, integrations, or automation.
4. Ask for clarification instead of guessing when a security or business-side effect is ambiguous.

## n8n

The developer manually creates all n8n workflows.

Do not:
- use n8n MCP/tooling to create workflows
- modify workflow definitions
- activate/deactivate workflows
- create credentials
- import/export workflows automatically
- call business-side-effect nodes on behalf of the developer

You may document or review workflow designs supplied by the developer.

## AI

AI is used inside the product for:
- review sentiment/topic analysis
- SEO issue explanation
- recommendation generation
- keyword clustering
- report summarization

AI is not authoritative. Validate output with Zod and deterministic business rules.

## Free-first

Use free/open-source/local alternatives. No paid API/service may be added without explicit approval.

## Code quality

Prefer:
- TypeScript strict mode
- Zod validation
- small modules
- explicit error handling
- repository/service boundaries
- typed API contracts
- parameterized queries/ORM
- tenant-aware authorization
- idempotent jobs
- structured logging
