# Definition of Done

A feature is done only when:

## Functional
- happy path works
- validation works
- loading state exists
- empty state exists
- error state exists

## Security
- authentication checked
- authorization checked
- tenant isolation checked
- secrets protected
- external inputs validated

## Data
- persistence is correct
- idempotency considered
- timestamps/source tracked

## AI
- structured output validated
- unsupported claims prevented
- deterministic fallback exists where practical

## Automation
- workflow contract documented
- retry behavior documented
- failure state handled
- human approval used for external business actions

## Quality
- tests added
- typecheck passes
- lint passes
- docs updated
- no unnecessary dependency introduced

## Developer ownership
No autonomous AI/sub-agent action has changed n8n workflows or external business systems without explicit developer approval.
