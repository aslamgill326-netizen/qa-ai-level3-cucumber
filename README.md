# AI Level-3 QA Automation

Standalone Playwright + TypeScript framework for [Automation Exercise](https://automationexercise.com).

## Requirements

- Node.js 24 LTS (Node.js 20 or newer is supported by this project and Playwright)
- npm

## Setup

```powershell
npm ci
npx playwright install chromium
```

`BASE_URL` defaults to `https://automationexercise.com`. `.env.example` documents the supported variable; the project does not load `.env` files automatically. To override the URL in PowerShell, set `$env:BASE_URL` before running tests.

## Run

```powershell
npm run typecheck
npm run test:smoke
npm test
npm run report
npm run report:playwright
```

The Pulse dashboard opens automatically when a local test run finishes. Set `PLAYWRIGHT_PULSE_NO_OPEN=1` to suppress auto-opening (for example, in a headless local run). `npm run test:report` runs tests with the same automatic behavior. `npm run report` serves the latest Pulse dashboard and its media; `npm run report:playwright` opens Playwright's built-in report.

Each test run creates the Pulse dashboard at `reports/index.html`, local run history, Playwright's built-in HTML report, JSON results, and a JUnit report. Screenshots, videos, and failure traces are copied into separate `reports/screenshots/`, `reports/videos/`, and `reports/traces/` folders; the dashboard previews and links to those files. AI Analysis is an informational placeholder; AI-assisted RCA is not implemented.

## Project status

This phase provides the framework foundation, starter page objects, fixtures, and one smoke test. Assignment scenarios AE-01 through AE-24 are placeholders in the traceability document. AI-assisted RCA and GitHub Actions execution are not implemented.

Tests use Playwright's isolated browser context per test. Account cleanup is restricted to accounts created from the disposable test-account fixture; it is not run by the smoke test.
