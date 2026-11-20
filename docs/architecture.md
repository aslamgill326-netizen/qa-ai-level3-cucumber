# Framework architecture

The project is a standalone Playwright Test TypeScript application and does not modify or depend on the parent Playwright source tree.

```text
tests/                  Specs grouped by UI, API, and integration
src/pages/              Page objects using observed application behavior
src/api/                Reusable API operations, including scoped test-account cleanup
src/fixtures/           Shared Playwright fixtures and per-test setup
src/utils/              Unique disposable test data
config/                 Reserved for shared framework configuration
docs/                   Strategy, architecture, and requirements traceability
skills/, agents/        Contracts for future agent-assisted work
tools/rca/              Reserved for future RCA tooling; no RCA implementation yet
reports/                Pulse dashboard, separate media folders, and Playwright test artifacts
```

The base Playwright `page` fixture supplies a fresh browser context for each test. The shared `test` fixture exposes page objects and a unique disposable account. A test must explicitly mark its generated account as created before teardown will call the documented account-deletion API.

Page objects encapsulate locators and user actions. Assertions remain in tests. Locators are based on accessible roles/names where observed, with narrowly scoped application selectors only where necessary.

The Chromium-only configuration uses one worker initially, a 60-second test timeout, a 10-second assertion timeout, no local retries, and one retry when `CI` is set. The Pulse reporter creates a local dashboard, keeps the last 20 run summaries, and organizes screenshots, videos, and traces into separate folders. It opens the dashboard automatically after local runs. CI workflows and RCA implementation are intentionally out of scope for this phase.
