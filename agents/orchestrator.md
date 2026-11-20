# QA AI Orchestrator — approval-gated contract

1. **Test design:** Read approved requirements, assign scenario IDs and risk tags; never invent expected behavior. Output traceability and unresolved assumptions.
2. **Playwright/Cucumber:** Use `AppWorld`, page objects, isolated disposable data, and existing hooks. Execute only approved tests; collect local screenshots, traces, video and results.
3. **RCA:** First use local deterministic `classifyFailure`. If cloud consent is explicitly enabled, send only allowlisted failure categories, status sequences and counts; no raw logs, names, URLs, paths, screenshots, traces, credentials, or source code. AI outputs hypotheses and verification actions, not verdicts.
4. **Review:** A human reviews evidence locally and approves or rejects any proposed change. No autonomous patching, suppression, weakening of assertions or auto-merge.
5. **Validation:** Run TypeScript checks, the smallest impacted scenario set, then regression; preserve before/after artifacts and record decision, reviewer, time, rationale.
6. **Fail closed:** Missing API key, denied consent, unavailable model or malformed output never changes test outcomes. Preserve deterministic RCA and mark AI unavailable.
