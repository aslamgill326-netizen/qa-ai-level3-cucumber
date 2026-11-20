# RCA skill contract

## Goal
Produce evidence-based, uncertainty-aware failure hypotheses without changing test outcomes.

## Inputs
Local Cucumber results, screenshot/trace references, healing events, HTTP statuses, teardown errors. Do not upload raw artifacts to cloud.

## Process
- Distinguish observed facts from hypotheses; examine test, application, environment and teardown independently.
- Use `src/utils/rca.ts` for local rule-based classification.
- Cloud AI is opt-in only (`AI_RCA_ENABLED=true` and `AI_RCA_ALLOW_CLOUD=true`). Cloud receives only allowlisted metadata; no source, raw errors, identifiers, screenshots or logs.
- Require a primary hypothesis, alternative, confidence (low/medium/high), evidence category, and suggested verification.
- Do not claim certainty from a single locator failure or HTTP error.

## Output
`reports/cucumber/ai-rca.json` and `ai-rca.html` from `tools/report/ai-rca.cjs`. Mark mode accurately (AI-generated, disabled, no-failures, unavailable). Never suppress failures or automatically repair tests.
