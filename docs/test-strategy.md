# Risk-based Test Strategy and Traceability
**Project:** AI Level-3 QA – Automation Exercise | **Status:** DRAFT – validate against committed `.feature` files

## Objective and scope
Validate critical user journeys and API contracts for https://automationexercise.com using Playwright, TypeScript and Cucumber BDD. Prioritize authentication, disposable account lifecycle, product search, shopping cart and API response correctness. Out of scope: live payments, brute force, load testing, vulnerability scanning and non-disposable user accounts.

## Assumptions and constraints
- Public site availability is outside our control; intermittent overload is an environment issue, not a reason to falsify test success.
- Test accounts must be disposable; cleanup must be logged and verified.
- UI and API behavior must be asserted against observed/approved requirements, not invented expectations.
- CI execution is headless on Linux; local tests may behave differently.
- Self-healing retries only safe repeatable operations and approved locator alternatives.

## Risk matrix
| Area | Likelihood | Impact | Priority | Test oracle |
|---|---|---|---|---|
| Signup / duplicate registration | Medium | High | P0 | Account created; duplicate email rejected |
| Login / logout | Medium | High | P0 | Authentication state transitions |
| Account cleanup | Medium | High | P0 | Disposable account removed; cleanup status logged |
| Product API contracts | Medium | High | P0 | Response codes, shape and required fields |
| Cart add/remove/quantity | Medium | High | P0 | Product ID, quantity and removal |
| Search / no results | Medium | Medium | P1 | Correct search result set / empty state |
| Contact form | Low | Medium | P2 | Submission confirmation |
| CI / RCA integrity | Medium | High | P0 | Failed tests stay failed; evidence retained |
| Site overload | High | Medium | P1 | Classified as environment, bounded safe recovery |

## Scenario catalogue and traceability
Assignment Section 14 requests a **24-scenario catalogue**; the supplied green dashboard reports **26 executed scenarios**. The following groups are supported by screenshots; **the exact scenario titles, scenario IDs, steps and per-scenario risk mapping require export from the real `.feature` files**.

| Scenario group observed | Count in screenshot | Priority | Feature / source | Evidence |
|---|---:|---|---|---|
| Login API contract | 3 | P0 | `features/api/` (verify exact file) | Green dashboard |
| Products API contract | 5 | P0 | `features/api/` (verify exact file) | Green dashboard |
| Duplicate registration prevention | 1 | P0 | `features/ui/authentication/duplicate-registration.feature` | Green dashboard |
| Authentication | 2 | P0 | `features/ui/authentication/login.feature` | Green dashboard |
| Registration validation and account lifecycle | 2 | P0 | Authentication features (verify) | Green dashboard |
| Disposable account registration | 1 | P0 | Authentication features (verify) | Green dashboard |
| Authentication form validation | 2 | P1 | Authentication features (verify) | Green dashboard |
| Shopping cart management | 3 | P0 | `features/ui/cart/cart.feature` | Green dashboard |
| Contact form | 1 | P2 | Contact feature (verify) | Green dashboard |
| Product browsing and search | 3 | P1 | `features/ui/products/products.feature` | Green dashboard |
| **Subtotal identifiable in screenshot** | **23** | | | |
| **Remaining scenarios** | **3 (unidentified)** | TBD | Inspect all `.feature` files | Dashboard total 26 |

Do **not** invent titles for the 3 unidentified scenarios. Before submission, run a Cucumber dry-run or inventory script to extract all actual scenario names and tags; replace this grouped table with a 26-row ID-to-requirement-to-evidence matrix. Record how the actual 26 map to the assignment's 24 baseline.

## Coverage gaps / verification gates
- Confirm rubric target of 18 UI + 8 API checks against actual scenario inventory (dashboard group counts alone do not prove it).
- Confirm invoice download, totals calculations, UI–API consistency and account cleanup implementation.
- Confirm no hidden retries mask application defects.
- Add isolated known-fault injection evidence and human review records.
- Record browser, environment, commit SHA and date for every run.

## Entry / exit criteria
Entry: dependencies installed; site reachable; clean test data; environment documented.
Exit: P0 scenarios passed; known environment blocks disclosed; no critical data leaks; artifacts available; human reviewer approves.
