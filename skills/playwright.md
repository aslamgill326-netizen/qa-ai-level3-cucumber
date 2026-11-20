# Playwright Automation Skill — Contract
**Trigger:** Approved test design.
**Inputs:** approved Gherkin, page structure, existing page objects, API contract, fixtures.
**Allowed tools:** edit code on isolated branch, run typecheck/targeted tests, inspect traces. No protected-branch push.
**Locator policy:** prefer role/label/test ID and stable scoped selectors; fallback only to reviewed unique visible candidates. Avoid brittle indexes.
**Fixture policy:** isolated browser context, deterministic disposable data, cleanup in success/failure paths; record cleanup.
**Assertions:** verify business outcomes and data integrity; never weaken assertions to make runs green.
**API:** validate transport status and business response; retry only safe repeatable operations.
**Evidence:** screenshot, trace, sanitized console/network, commit SHA, scenario ID.
**Review checklist:** correctness, negative case, state isolation, safe retries, security, maintainability.
**Exit:** typecheck and targeted regression pass; PR reviewed.
