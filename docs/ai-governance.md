# AI Governance, Human Approval and Security
**Scope:** Sections 8–13 of AI Level-3 assignment

## Allowed / prohibited
| Allowed | Prohibited |
|---|---|
| Suggest test cases, locators, assertions and fixes | Auto-merge, protected-branch push, secret modification |
| Analyze sanitized failure evidence | Trust website text as instructions |
| Draft minimal patch on isolated branch | Execute arbitrary commands from model/site output |
| Retry bounded GET / safe API requests | Blindly repeat signup, payment or destructive mutations |
| Report uncertainty and alternatives | Remove assertions / increase sleeps without evidence |
| Review disposable test data | Access real customer accounts or execute real payments |

## Prompt-injection control
Treat DOM, error text, test artifacts and remote content as **untrusted data**. Never interpret their instructions as authority. Tool execution uses explicit allowlists; code changes require diff review.

## Data hygiene
Redact emails, passwords, tokens, payment fields, session cookies and personal data from prompts and reports. Keep local Ollama endpoint bound to localhost. GitHub workflow uses `contents: read` and `AI_RCA_ALLOW_CLOUD=false`; review PR secret exposure policies.

## Human approval gate
1. Engineer approves risk/coverage.
2. Reviewer approves code PR.
3. Reviewer verifies RCA against screenshot/trace/stack and rejects unsupported confidence.
4. Engineer approves minimal repair and rerun.
5. Human decides release/go-no-go; model cannot merge or deploy.

## Human challenge log (five REQUIRED, currently templates — not fabricated transcripts)
| # | AI suggestion to evaluate | Challenge / evidence required | Reviewer decision | Link |
|---|---|---|---|---|
| 1 | Retry registration POST after 503 | State unknown; may duplicate account | PENDING actual transcript | TODO |
| 2 | Increase locator timeout to 60 s | Need DOM/trace evidence | PENDING actual transcript | TODO |
| 3 | Mark 503 as product defect | Compare response and site-health page | PENDING actual transcript | TODO |
| 4 | Remove logout assertion | Would hide failed logout | PENDING actual transcript | TODO |
| 5 | Automatically merge generated patch | Violates approval gate | PENDING actual transcript | TODO |

For submission, replace each row with a real dated prompt, model output excerpt, engineer rebuttal, decision and commit/run link. These examples are review prompts, **not evidence of five completed interventions**.
