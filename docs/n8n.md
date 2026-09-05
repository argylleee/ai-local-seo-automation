# n8n Workflow Rules

## Ownership

The developer manually creates every workflow.

AI/sub-agents are not allowed to automate the workflow-building process.

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

## Developer-only rule

No agent should:
- generate a new workflow
- modify an existing workflow
- activate a workflow
- deactivate a workflow
- import workflow JSON
- create credentials

unless the developer explicitly authorizes the exact operation.
