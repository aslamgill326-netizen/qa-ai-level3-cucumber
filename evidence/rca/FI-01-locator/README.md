# FI-01 — Controlled locator fault
**Status:** Injected failure screenshot provided; full RCA package pending.

**Observed:** `@rca-validation` deliberately checks `#rca-intentionally-missing-element`; Playwright reports element not found after 3000ms. This is a **known test-controlled script fault**, not a website defect.

**Expected RCA class:** TEST_SCRIPT_DEFECT. **Confidence:** Do not claim a numeric model score until generated and reviewed.

**Missing evidence:** injection commit SHA, before/after run URLs, actual RCA JSON, model output (if invoked), reviewer rebuttal/approval, validated fix run.

**Run:** `npm run test:dashboard -- --tags "@rca-validation"` (expected nonzero exit). Keep excluded from green regression.

**Reviewer template:** Hypothesis ___; alternative ___; evidence ___; rebuttal ___; decision ___; date ___.
