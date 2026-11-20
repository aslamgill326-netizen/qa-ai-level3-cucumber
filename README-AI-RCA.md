# Phase 1 — Cloud AI RCA integration

## Requirements
Node.js 18+, existing Cucumber JSON `reports/cucumber/results.json`, `dotenv` installed, OpenAI API key with access to chosen model.

## Opt-in environment (project-root `.env`, never commit)
```
AI_RCA_ENABLED=true
AI_RCA_ALLOW_CLOUD=true
AI_RCA_MODEL=gpt-4.1-mini
OPENAI_API_KEY=your-key-here
```
Add `.env`, `reports/`, and `*.key` to `.gitignore`. Do not paste API keys into chat or commits.

## Run
`node tools/report/ai-rca.cjs` after a test execution; no tests are rerun. Open `reports/cucumber/ai-rca.html`. Output also available in `ai-rca.json`.

## Integrate with runner
After `const merge = run(merger);` (or equivalent) and before dashboard generation:
```
console.log('\n=== AI RCA ===');
const ai = run(path.join(__dirname, 'ai-rca.cjs'));
if (ai.status !== 0) console.warn('AI RCA unavailable; tests remain authoritative.');
```
The standalone `ai-rca.html` works immediately. To add its link/tab to your custom dashboard, inspect your actual dashboard-generator.cjs and add a link to `ai-rca.html`; do not overwrite the generator blindly.

## Privacy
Cloud request is opt-in and sends **only** abstract failure categories, setup/step/teardown labels, status sequences and counts (up to 10 failed scenarios). Does not send raw error text, source code, scenario names, URLs, file paths, screenshots, videos, traces, accounts or credentials. It sends `store:false` to the Responses API; this is not a guarantee of zero provider retention. Obtain organization approval for external processing before enabling. Do not publish the local JSON/HTML without reviewing contents.

## Validation
With 26 passing scenarios, mode is `no-failures` and no API call occurs. To validate actual AI RCA, use a **separate controlled failed run**, retain original evidence locally, and inspect `ai-rca.json` for `mode: ai-generated`. Human must approve any proposed change.
