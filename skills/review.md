# Security and Human Review Skill — Contract
**Trigger:** Proposed AI test, patch, RCA or report.
**Inputs:** diff, evidence, risk, prompt/output, artifact policy.
**Checks:** secret/PII leakage, prompt injection, tool allowlist, arbitrary commands, unsupported assertion removal, blind retries, hard sleeps, unsafe network traffic, unapproved merges.
**Decision:** APPROVE / REQUEST_CHANGES / REJECT with reason and reviewer identity.
**Evidence:** dated review note, diff, test run and commit.
**Exit:** no unresolved critical guardrail violations; no auto-merge.
