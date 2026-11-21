# Quality Scorecard
**Evidence date:** 20 Nov 2026 | **Status:** Baseline only; do not claim unmeasured metrics

| Metric | Observed value | Calculation / evidence | Confidence |
|---|---|---|---|
| Local regression pass rate | **100%** | 26 passed / 26 executed | Screenshot |
| Local regression failed | **0** | Successful dashboard | Screenshot |
| Local regression recorded duration | **152.2 s** | Successful dashboard | Screenshot |
| Local average scenario duration | **5.9 s** | Successful dashboard | Screenshot |
| GitHub PR pipeline result | **Passed** | Workflow run #5 | Screenshot |
| GitHub PR pipeline duration | **7m 38s** | Workflow run #5 | Screenshot |
| Another PR pipeline result | **Passed** | Workflow run #6 | Screenshot |
| Flaky / retry rate | **Not measured** | Need repeated independent runs and retry/healing logs | Pending |
| RCA known-fault accuracy | **Not measured** | Need 2 injected faults and classifications | Pending |
| Time to triage | **Not measured** | Need failure timestamp and reviewed RCA timestamp | Pending |
| Maintenance effort | **Not measured** | Need time and commits for reviewed fix | Pending |
| Scheduled execution evidence | **Not yet provided** | Cron configured; capture actual schedule run | Pending |
| Screenshot / video availability in CI | **Not independently verified** | Download artifact ZIP, inspect files | Pending |

## Measurement plan
1. Execute 5–10 comparable runs, retaining run IDs and retry counts.
2. Flaky scenario rate = scenarios with both pass and fail across repeated runs / scenarios exercised.
3. Retry rate = retried scenarios / executed scenarios; also report safe-navigation recovery attempts separately.
4. RCA classification accuracy = correct reviewed known-fault classifications / injected cases with known labels.
5. Time to triage = timestamp of validated human RCA decision minus failure timestamp.
6. Maintenance effort = engineer minutes from accepted defect diagnosis to verified patch.
7. Report denominators, test environment and any blocked runs; do not reclassify failures as passes.
