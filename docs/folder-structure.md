# Folder Structure

```text
local-seo-platform/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── dashboard/
│   │   │   ├── businesses/
│   │   │   ├── settings/
│   │   │   └── api/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── businesses/
│   │   │   ├── seo/
│   │   │   ├── reviews/
│   │   │   ├── recommendations/
│   │   │   └── integrations/
│   │   ├── lib/
│   │   └── tests/
│   │
│   └── crawler/
│       ├── src/
│       │   ├── crawl/
│       │   ├── extract/
│       │   ├── normalize/
│       │   └── jobs/
│       └── tests/
│
├── packages/
│   ├── db/
│   ├── schemas/
│   ├── seo-engine/
│   ├── ai/
│   ├── integrations/
│   ├── logger/
│   └── shared/
│
├── n8n/
│   ├── docs/
│   └── examples/
│
├── docs/
├── scripts/
├── .env.example
├── AGENTS.md
├── CLAUDE.md
└── README.md
```

## n8n directory rule

Do not store production workflow exports automatically.

The `n8n/` directory contains:
- manually written workflow documentation
- architecture diagrams
- payload contracts
- example/test fixtures

If the developer intentionally exports a workflow for version control, it must be explicitly supplied/approved.
