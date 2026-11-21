# RCA Skill — Contract
**Trigger:** Failed scenario or controlled injection.
**Inputs:** scenario ID, error/stack, result JSON, retry history, screenshot/trace, console/network, code diff.
**Evidence order:** failing assertion and stack → prior step/state → trace/screenshot → network/console → commit diff → isolated reproduction.
**Classes:** PRODUCT_DEFECT, TEST_SCRIPT_DEFECT, LOCATOR_OR_UI_CHANGE, TEST_DATA_OR_STATE, ENVIRONMENT_OR_NETWORK, TIMING_OR_FLAKINESS, THIRD_PARTY_DEPENDENCY, UNKNOWN.
**Output:** JSON matching `docs/rca-schema.json`, Markdown summary, alternatives, confidence and missing evidence.
**Confidence:** 0.85–1.0 only with direct reproducible evidence; 0.6–0.84 with strong partial evidence; below 0.6 tentative. Missing critical evidence lowers confidence; classify UNKNOWN if unverifiable.
**Stop:** never auto-edit tests; no model-only conclusion promoted to fact. Human verifies before repair.
**Prompt:** “Classify this failure using only sanitized artifacts. List at least two competing hypotheses, evidence for/against, unknowns, and validation steps. Do not invent traces.”
