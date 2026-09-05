# n8n Workflow Rules

## Ownership

By default, the developer manually creates every workflow, and
AI/sub-agents are not allowed to automate the workflow-building
process — see "Agent-built workflows" below for the standing exception
currently in effect for this project.

## Workflow responsibilities

n8n should handle:
- schedules
- synchronization
- API orchestration
- transformation
- retries
- notifications
- AI calls
- callback events

## Keep workflows small

Prefer:

```text
01_sync_search_console
02_sync_gbp
03_crawl_website
04_analyze_reviews
05_generate_recommendations
06_send_report
```

over one giant workflow.

## Workflow contract

Every workflow should document:
- purpose
- trigger
- inputs
- outputs
- credentials required
- retry behavior
- rate limits
- idempotency strategy
- failure behavior
- database tables touched

## Idempotency

Every externally triggered job should have a stable job/run ID.

Repeated execution must not duplicate records.

## Failure handling

Use:
- explicit error branches
- retries with bounded attempts
- backoff
- dead-letter/manual-review state where appropriate
- automation run logging

## Human approval

Actions that affect public business data should stop at:

```text
AI recommendation
 -> PENDING_APPROVAL
```

The user must approve before an action workflow continues.

## Developer-only rule (default)

No agent should:
- generate a new workflow
- modify an existing workflow
- activate a workflow
- deactivate a workflow
- import workflow JSON
- create credentials

unless the developer explicitly authorizes the exact operation, or the
standing exception below is in effect.

## Agent-built workflows (standing exception)

**In effect since 2026-09-06**, the developer authorized Claude to
build this project's n8n workflows directly against the developer's
self-hosted n8n instance, via n8n MCP tooling, because hand-writing
workflow-export JSON produced files that didn't import cleanly. This
replaces the one-off "authorize the exact operation" model with a
standing, project-scoped authorization — recorded here so it survives
across sessions instead of relying on a verbal override in one
conversation.

Scope of the exception:
- **Covers**: creating and updating this project's own automation
  workflows (the ones named in "Keep workflows small" above, or their
  documented successors) — using search/read/create/update workflow
  tools, so long as each workflow follows this doc's contract and
  matches `docs/architecture.md`'s division of responsibility.
- **Does not cover**: activating a workflow. Every agent-created or
  agent-modified workflow is left **inactive** by default; the
  developer reviews it in the n8n UI and activates it themselves. This
  boundary stands even though workflow creation itself is now
  authorized, because activation is what actually turns a design into
  a live, scheduled, side-effect-producing process.
- **Does not cover**: creating credentials with real secret values
  (SMTP passwords, API keys, OAuth client secrets, etc.). An agent may
  reference a credential by name/type in a workflow (so the developer
  just has to pick or fill in the right one in n8n's UI) but must never
  be given, generate, or type in the actual secret material.
- **Does not cover**: executing a workflow (or a node with a real
  external side effect — sending an email, posting to a live API)
  against production data. Validating a workflow's structure and
  testing it against safe/idempotent endpoints (the app's own
  internal read/audit endpoints) is fine; firing a real notification
  or write to an external service is not, without asking first.
- Revoking or narrowing this exception is a deliberate edit to this
  section (or asking for it in chat, then updating this doc to match)
  — not something that lapses on its own or needs to be re-asked every
  session, but also not something an agent should assume covers a
  future, materially different kind of automation (e.g. GBP-writing
  workflows once that's unblocked) without re-checking scope here.
