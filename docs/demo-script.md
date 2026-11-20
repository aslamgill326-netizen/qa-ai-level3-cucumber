# Manager Demo: Sections 8–13 (10 minutes) + Live Defense (20 minutes)
**Use only observed evidence; demonstrate planned items live rather than claiming they already happened.**

| Time | Screen / action | What to say |
|---|---|---|
| 0:00–1:00 | README + strategy | Risk-based UI/API coverage and disposable data |
| 1:00–2:30 | Architecture + skills | Six responsibilities; human approvals and stop conditions |
| 2:30–4:00 | 26/26 dashboard | Local regression success, time, screenshot/video artifacts |
| 4:00–6:00 | `@rca-validation` failure | Intentionally missing locator; error, evidence, rule-based RCA; explain no product defect |
| 6:00–7:00 | FI-02 network injection (only if prepared) | Test-controlled failure, network evidence, classify environment |
| 7:00–8:30 | GitHub Actions | PR run green, `workflow_dispatch`, 05:00 PKT cron, artifacts, failure propagation |
| 8:30–9:30 | Ollama RCA | Model is advisory; compare hypotheses, confidence and human decision |
| 9:30–10:00 | Limitations + scorecard | Site overload, unmeasured flake rate, next steps |

## Live defense rehearsal (20 minutes)
- Explain why retrying a registration POST is unsafe after ambiguous server response.
- Show how a locator fallback is constrained to approved candidates.
- Show evidence distinguishing environment outage from product bug.
- Demonstrate one minimal test edit on a feature branch and a targeted rerun.
- Explain why a green no-failures AI tab shows no findings.
- Show how `continue-on-error` allows artifacts but final step preserves failure.
- Explain prompt-injection boundary and secret handling.
- Answer which requirements are implemented vs only documented.

## Demo commands (verify scripts in current `package.json`)
```powershell
npm run typecheck
npm run test:dashboard -- --tags "not @rca-validation"
npm run test:dashboard -- --tags "@rca-validation"
```
The controlled validation command **should fail**. Do not include it in the normal regression.
