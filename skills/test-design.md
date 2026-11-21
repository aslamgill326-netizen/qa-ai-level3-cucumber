# Test Design Skill — Contract
**Trigger:** New/changed requirement or coverage gap.
**Inputs:** requirement text, risk matrix, reference mapping, environment assumptions.
**Allowed tools:** read requirements/features, search test inventory, generate draft cases. No production mutations.
**Output:** scenario ID, requirement ID, risk (P0–P2), preconditions, data, steps, expected oracle, negative/boundary cases, missing-oracle questions.
**Human gate:** reviewer approves priority and expected behavior before automation.
**Exit:** every P0 has approved oracle or explicitly documented UNKNOWN.
**Prompt template:** “Given [requirement] and [risk], propose traceable UI/API BDD cases. Do not invent unsupported behavior. Ask about ambiguous oracles.”
