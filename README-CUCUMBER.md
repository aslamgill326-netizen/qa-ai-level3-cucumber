# QA AI Level 3 — Cucumber BDD migration

This package was converted from the uploaded `playwright/qa-ai-level3` project. It preserves the original Playwright specs and reporter for comparison; **Cucumber is the default test runner**.

## Requirements
- Node.js 20+
- Windows PowerShell, macOS or Linux

## Setup
```powershell
npm install
npx playwright install chromium
npm run typecheck
```

## Run
```powershell
npm test
npm run test:auth
npm run test:api
$env:HEADED='1'; npm run test:auth
npm run report
Start-Process .\reports\cucumber\pulse.html
Start-Process .\reports\cucumber\cucumber.html
```

Run one tag: `npx cucumber-js --tags '@AE-02'`.

## Existing components retained
- Page Objects: `src/pages/*`
- API cleanup: `src/api/accountApi.ts`
- Test data and availability check: `src/utils/*`
- Existing Playwright Test specs: `tests/*` (legacy, use `npm run test:legacy`)
- Original Pulse reporter: `tools/report/pulse-reporter.cjs` (legacy)

## New components
- `features/**/*.feature`: AE-01 to AE-05 Gherkin scenarios (seven scenarios total)
- `src/steps`: Playwright-backed step definitions
- `src/support/world.ts`: independent browser/context/API per scenario
- `src/support/hooks.ts`: teardown, cleanup, screenshots, traces, RCA attachment
- `src/utils/selfHealing.ts`: bounded, approved-locator fallback with uniqueness and visibility checks
- `src/utils/rca.ts`: deterministic failure categorization
- `tools/report/cucumber-pulse.cjs`: Cucumber JSON → lightweight Pulse dashboard

## Important limitations
- **No live execution was performed** against the public Automation Exercise website when packaging. The site can return HTTP 503 queue-full errors.
- The healing layer is **rule-based, not AI/LLM-driven**. It does not generate new selectors or modify source code. It records approved fallback use.
- The new Pulse dashboard is a Cucumber-specific bridge; it does not yet reproduce all tabs/history/media previews of the original reporter. Detailed evidence is in the Cucumber HTML report.
- AE-05 positive login API test was not present in the original source and is not invented here.
- Product/cart/checkout Page Objects were preserved but no new test scenarios were invented for them.
- If registration succeeded but its network event was not observed, cleanup may be missed. Review accounts on the target test environment.
- A teardown failure is surfaced as a failure, not silently swallowed.


## Migration fix (navigation and API responses)
- Cucumber World now sets `baseURL` on the browser context so `page.goto('/login')` works.
- Login API steps validate HTTP status and parse the body safely; HTML queue-full pages are reported as `ENVIRONMENT_UNAVAILABLE`.
- Run `npm run typecheck`, then `npm test`. Live server availability may still affect results.
