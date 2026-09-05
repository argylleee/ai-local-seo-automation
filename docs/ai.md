# AI Layer

## AI role

AI assists the SEO engine; it does not operate the product.

## Allowed AI tasks

- sentiment classification
- review topic classification
- keyword clustering
- SEO issue explanation
- recommendation wording
- report summarization
- draft review response
- content brief generation

## Disallowed autonomous behavior

AI must not:
- modify database records directly
- change permissions
- create credentials
- publish content
- publish review responses
- change Google Business Profile data
- create/activate n8n workflows
- deploy code
- merge branches
- run destructive commands

## Structured output

Every model response must map to a schema.

Example:

```ts
const RecommendationSchema = z.object({
  title: z.string().min(1).max(200),
  rationale: z.string().min(1).max(2000),
  category: z.enum([...]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string()).max(20),
});
```

## Prompt design

Prompts must:
- define role
- provide evidence
- forbid unsupported claims
- require structured output
- specify uncertainty behavior

## Cost control

Prefer:
1. deterministic rules
2. small/local model
3. free Gemini model
4. larger model only when explicitly approved

Cache repeated analyses where appropriate.

Do not send an entire website to an LLM when a small relevant excerpt is sufficient.
