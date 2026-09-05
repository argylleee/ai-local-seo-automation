# API Contracts

## Principles

- RESTful resource naming
- JSON
- Zod validation
- consistent error envelope
- authenticated server-side access
- organization authorization

## Example

```http
POST /api/audits
```

Request:

```json
{
  "businessId": "business_123",
  "locationId": "location_456"
}
```

Response:

```json
{
  "id": "audit_789",
  "status": "QUEUED",
  "createdAt": "..."
}
```

## Error format

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this resource."
  }
}
```

Do not expose stack traces.

## Internal n8n callback

Use a separate authenticated internal endpoint.

Example:

```text
POST /api/internal/automation-runs/:id/events
```

Validate:
- service authentication
- run ID
- event type
- payload schema
- idempotency key
