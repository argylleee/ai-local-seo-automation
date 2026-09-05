# SEO Engine

## Principle

Use deterministic rules for measurable SEO conditions. Use AI only for interpretation and recommendations.

## Example rule

```text
IF:
average_position >= 4
AND average_position <= 15
AND impressions >= threshold
AND CTR < expected_ctr

THEN:
candidate = HIGH_VISIBILITY_LOW_CTR
```

The exact thresholds must be documented and configurable.

## Recommendation pipeline

```text
raw data
 -> normalization
 -> deterministic rules
 -> candidate issues
 -> evidence collection
 -> AI explanation
 -> schema validation
 -> priority calculation
 -> persistence
```

## Local SEO categories

- LOCAL_VISIBILITY
- BUSINESS_PROFILE
- REVIEWS
- ON_PAGE
- TECHNICAL
- CONTENT
- KEYWORDS
- PERFORMANCE
- INTERNAL_LINKING
- COMPETITOR

## Scoring

Do not ask AI for the final SEO score.

Use deterministic weighted scoring.

AI may explain:
- why score changed
- what should be prioritized
- what evidence supports an issue

## Confidence

Confidence must be based on available evidence and documented heuristics.

Do not present model confidence as statistical certainty.

## No ranking guarantees

Never claim:
- guaranteed first-page ranking
- guaranteed traffic increase
- guaranteed Google Maps placement
