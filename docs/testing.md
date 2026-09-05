# Testing Strategy

## Unit tests

Cover:
- SEO scoring
- keyword classification
- CTR opportunity rules
- URL normalization
- tenant authorization
- schema validation

## Integration tests

Cover:
- database repositories
- authenticated API routes
- organization isolation
- integration adapters

## Workflow testing

The developer manually tests n8n workflows.

Agents may produce:
- sample payloads
- expected outputs
- test matrices
- troubleshooting documentation

Agents must not execute or alter production workflows.

## AI testing

Use fixed fixtures.

Test:
- valid structured output
- malformed JSON
- unsupported claims
- missing evidence
- long outputs
- adversarial input

AI tests must not depend exclusively on exact wording.

## Security tests

At minimum:
- IDOR/tenant isolation
- auth bypass
- SSRF
- webhook authentication
- secret leakage
- unsafe redirects
