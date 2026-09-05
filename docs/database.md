# Database Rules

## Core entities

```text
users
organizations
organization_members
businesses
business_locations
integrations
oauth_connections
keywords
keyword_rankings
search_console_metrics
seo_audits
seo_issues
reviews
review_analysis
competitors
competitor_metrics
recommendations
recommendation_actions
automation_runs
notifications
audit_logs
```

## Tenant isolation

Every tenant-owned entity must be linked to an organization.

All queries must enforce organization scope.

## Auditability

Keep:
- created_at
- updated_at
- created_by where useful
- source
- source_updated_at
- data freshness

## External data

Store source identifiers so records can be reconciled.

Examples:
- Google resource/location ID
- Search Console query/page dimensions
- crawl URL
- external review ID

## Raw vs normalized data

Keep raw external payloads only where useful and safe.

Normalize fields needed for analytics.

Avoid unbounded JSON blobs.

## Deletion

Use explicit deletion/retention policies.

Do not delete historical analytics just because an integration disconnects.
