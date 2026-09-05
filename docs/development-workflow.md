# Development Workflow

## Branching

Use feature branches:

```text
feature/auth
feature/seo-engine
feature/reviews
feature/dashboard
feature/crawler
```

## Commit style

Use clear commits:

```text
feat: add organization authorization
fix: prevent cross-tenant business access
test: add SEO CTR opportunity cases
docs: document GBP integration
```

## Before implementation

- inspect relevant docs
- identify dependencies
- identify affected database tables
- identify security impact
- identify external side effects

## Before merge

```text
typecheck
lint
unit tests
integration tests
build
```

## Database changes

Every schema change requires:
- migration
- updated schema types
- tests where appropriate
- backward compatibility consideration

## External integrations

Wrap external providers behind adapters.

Do not scatter provider-specific HTTP calls across the codebase.
