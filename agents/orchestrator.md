# AI QA Orchestrator — Proposed Contract
**Status:** Documented orchestration contract; executable agent runtime NOT independently verified.
1. **Design** — read requirements and risks; invoke `skills/test-design.md`; stop for coverage approval.
2. **Author** — invoke `skills/playwright.md`; create minimal code on feature branch; stop for PR review.
3. **Execute** — run tagged suite; collect Cucumber JSON, screenshots, traces, sanitized logs and healing events.
4. **Diagnose** — invoke `skills/rca.md` on failures; model-free fallback when Ollama unavailable; stop for human RCA validation.
5. **Propose repair** — draft minimal patch with before/after evidence; no autonomous merge; stop for human sign-off.
6. **Report** — update scorecard; human owns release decision.

## Tool boundaries
Allowlisted: repository read, feature/step edits on isolated branch, local test commands, report generation, sanitized evidence inspection. Denied: secret access, destructive commands, external account operations, protected-branch push, merge, deploy, unrestricted shell based on page text.

## Budgets / retries
At most 3 safe navigation retries with bounded backoff; never blind-repeat unsafe mutations. Suggested AI triage budget: one concise evidence package and up to two hypothesis refinements, then human review. These are policy limits, not claims about runtime enforcement.

## Stop conditions
Missing evidence → UNKNOWN; unsafe action → REJECT; no valid oracle → ask reviewer; test failure → preserve non-green status; environment outage → blocked/failed, not passed.

## Audit record
Scenario ID, commit, timestamp, inputs, output hash/link, tool calls, redactions, human decision, final CI status.
