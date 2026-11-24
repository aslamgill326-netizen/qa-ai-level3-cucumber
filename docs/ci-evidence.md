# CI/CD Evidence Manifest
**Repository:** https://github.com/aslamgill326-netizen/qa-ai-level3-cucumber
**Workflow:** `.github/workflows/qa-automation.yml`

## Confirmed from supplied screenshots
- Successful PR workflow run **#5**, branch `feature/Failure-Test`, PR #2, duration **7m 38s**.
- Successful PR workflow run **#6**, branch `feature/Failure-Test`, duration **8m 10s**.
- Earlier failed runs also appear; do not hide them. Explain the changes and final status with commit links.
- Local dashboard reports **26 passed / 26**, **152.2s**.

## Workflow configuration confirmed from supplied YAML
- PRs to `main`; pushes to `main` and `feature/github-actions-cicd`; manual `workflow_dispatch`.
- `schedule: '0 0 * * *'` = **05:00 Asia/Karachi (PKT)**.
- Node 22, `npm ci`, Chromium, FFmpeg, Ollama `llama3.2:3b`, typecheck, Cucumber regression.
- Regression excludes `@rca-validation`; fallback RCA/dashboard steps run `if: always()`.
- Upload `reports/`, `test-results/`, `playwright-report/` with 14-day retention.
- Final enforcement fails workflow if typecheck or test step failed.

## Evidence still to capture
| Item | Link / file | Status |
|---|---|---|
| PR #2 run #5 screenshot | Previously shared | CONFIRMED |
| PR run #6 screenshot | Previously shared | CONFIRMED |
| Latest successful `main` run | TODO | PENDING |
| Manual `workflow_dispatch` run | TODO | PENDING |
| Actual `schedule` run (if elapsed) | TODO | PENDING |
| Downloaded `qa-reports-<run_id>` manifest | TODO | PENDING |
| Failure run with RCA artifact and non-green job | TODO | PENDING |
| Video and trace file presence | TODO | PENDING |

**Note:** A green PR run is not proof that daily schedule already executed. GitHub scheduled runs use the default branch and can be delayed.
