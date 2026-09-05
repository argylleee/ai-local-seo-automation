# Claude Code Project Instructions

Follow `AGENTS.md` as the highest project-level development rule.

Before implementing a task:
1. Inspect the relevant architecture and module docs.
2. Identify ownership boundaries.
3. Check whether the task affects tenant isolation, authentication, integrations, or automation.
4. Ask for clarification instead of guessing when a security or business-side effect is ambiguous.

## n8n

Default rule: the developer manually creates all n8n workflows, and an
agent may only document or review workflow designs supplied by the
developer.

**Standing exception in effect for this project** — see
`docs/n8n.md`'s "Agent-built workflows" section for the full scope and
history. Summary: Claude may use n8n MCP tooling to create/modify this
project's own workflows against the developer's self-hosted instance.
Even under the exception, do not:
- activate/deactivate a workflow (built workflows are left inactive
  for the developer to review and activate)
- create a credential with real secret material (reference credentials
  by name/type; the developer fills in actual secrets themselves)
- execute a node with a real external side effect (sending an email,
  writing to a live third-party API) against production data

`docs/n8n.md` is the source of truth if this exception is ever
narrowed or revoked — check there, not just here, before relying on it.

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
