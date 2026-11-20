# Initial test strategy

## Scope

- Establish a reliable Chromium smoke check against the public Automation Exercise site.
- Prepare separate locations for UI, API, and integration coverage.
- Add reusable page objects and test fixtures without implementing the full AE-01 through AE-24 suite.
- Keep account data disposable, unique per test, and eligible for cleanup only after the test explicitly confirms creation.
- Avoid real personal information, real payment details, forced clicks, and arbitrary sleeps.

## Risk-based organization

Tag tests in their title with `@P1` through `@P4`, and add a capability tag such as `@smoke`, `@registration`, or `@checkout`. Use `--grep` to select tags. Initial priority guidance:

| Priority | Meaning |
| --- | --- |
| P1 | Critical account access, registration, or purchase-flow behavior |
| P2 | Important product discovery and cart behavior |
| P3 | Secondary content and non-critical interaction behavior |
| P4 | Low-impact presentation or exploratory coverage |

Final priorities and scenario-to-requirement mappings should be reviewed against the assignment before implementing those scenarios.

## Execution and evidence

Run `npm run typecheck` before `npm run test:smoke`. Each run produces the local Pulse dashboard plus Playwright HTML, JSON, and JUnit reports. Screenshots and videos are recorded for every test and linked from both HTML reports; traces are retained on failure. Use `npm run report` to open the Pulse dashboard or `npm run test:report` to run the suite and then open it. The dashboard's AI Analysis tab is informational only; RCA is not implemented. Local retries are disabled to preserve first-run evidence; CI retries are configured but no CI workflow is included in this phase.

The public site may emit mixed-content or third-party advertising errors unrelated to the tested application path. Record such failures as environment observations and do not weaken assertions to hide them.
