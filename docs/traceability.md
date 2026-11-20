
# Requirements Traceability Matrix

**Project:** AI Level-3 Quality Engineering — Playwright + Agentic RCA  
**Application:** https://automationexercise.com  
**Framework:** Playwright + TypeScript  
**Document Version:** 1.1  
**Total Scenarios:** 24

## 1. Purpose

This document maps assignment requirements to automated test
scenarios, risk priorities, expected results, test paths,
execution evidence, and implementation status.

All scenarios must be independently validated before being
marked as Passed.

## 2. Status Definitions

- **Passed:** Executed successfully with supporting evidence.
- **Failed:** Executed and failed; investigation required.
- **Ready for validation:** Code provided or implemented but
  execution has not been verified.
- **Partially implemented:** Some required coverage is missing.
- **Not implemented:** Automation has not been developed.
- **Blocked:** Execution prevented by a documented issue.

## 3. Requirements Traceability Matrix

| ID | Assignment Scenario / Requirement | Risk | Expected Result | Test Path | Evidence | Status |
|---|---|---|---|---|---|---|
| AE-01 | Account Registration | P0 | Unique disposable account is created; account-created confirmation and logged-in username are verified; account is deleted after testing. | `tests/ui/ae-01-registration.spec.ts` | Chromium execution: 1 passed. Account-created confirmation and username verified. API teardown returned `Account deleted!`. | Passed |
| AE-02 | Valid Login / Logout | P0 | Registered user logs in with valid credentials, username is displayed, logout succeeds, and user can log in again. | `tests/ui/ae-02-04-auth.spec.ts` | Pending execution and cleanup verification. | Ready for validation |
| AE-03 | Invalid Login | P0 | Invalid credentials produce the expected error message; user remains unauthenticated. | `tests/ui/ae-02-04-auth.spec.ts` | Pending execution. | Ready for validation |
| AE-04 | Duplicate Registration | P1 | Registration using an existing email is rejected with the expected duplicate-email message. | `tests/ui/ae-02-04-auth.spec.ts` | Pending execution and cleanup verification. | Ready for validation |
| AE-05 | Login API Validation | P1 | Verify login API behavior for valid credentials, invalid credentials, missing parameters, and unsupported methods. | `tests/api/ae-05-login-api.spec.ts` | Negative API test code provided; positive login validation and execution pending. | Partially implemented |
| AE-06 | Product Catalogue | P0 | Products page loads, product catalogue is populated, and product details are accessible and consistent with API data. | `tests/ui/products.spec.ts`; `tests/api/products.api.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-07 | Search Relevance | P0 | Product search returns relevant products matching the search term; UI and API results are validated. | `tests/ui/search.spec.ts`; `tests/api/search.api.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-08 | Search Empty / Invalid | P1 | Empty, invalid, and zero-result search inputs are handled according to observed application behavior; missing API search parameter is validated. | `tests/ui/search.spec.ts`; `tests/api/search.api.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-09 | Category Filtering | P1 | Selecting a product category displays products associated with that category. | `tests/ui/category.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-10 | Brand Filtering | P1 | Selecting a brand displays relevant products; brand information is checked against API data where supported. | `tests/ui/brands.spec.ts`; `tests/api/brands.api.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-11 | Cart Multiple Items | P0 | Multiple distinct products can be added to the cart; product names, prices, quantities, and line totals are correct. | `tests/ui/cart.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-12 | Quantity Calculation | P0 | Product quantity is updated correctly; cart quantity and calculated line total match expected arithmetic. | `tests/ui/cart.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-13 | Remove From Cart | P0 | Selected product is removed from the cart; remaining items and totals are updated correctly. | `tests/ui/cart.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-14 | Cart Persists On Login | P0 | Products added before login remain in the cart after authentication, according to the documented application flow. | `tests/ui/cart-persistence.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-15 | End-to-End Order | P0 | Disposable customer completes product selection, cart validation, checkout, dummy payment, and order confirmation. | `tests/ui/checkout.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-16 | Address Consistency | P0 | Checkout delivery and billing addresses match the account fixture and stored account details. | `tests/ui/checkout.spec.ts`; `tests/api/account.api.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-17 | Invoice Download | P1 | Invoice download completes; downloaded file exists, is non-empty, and has plausible content/type. | `tests/ui/invoice.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-18 | Product Review | P1 | Customer submits a product review and receives the expected submission confirmation. | `tests/ui/reviews.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-19 | Contact Form Upload | P1 | Contact form accepts valid data and a test attachment; expected success confirmation is displayed. | `tests/ui/contact.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-20 | Subscriptions | P2 | Subscription is supported from the relevant site sections and displays the expected confirmation. | `tests/ui/subscription.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-21 | Recommended Items | P2 | Recommended products are displayed and can be added to the cart with correct product details. | `tests/ui/recommended.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-22 | Account API CRUD | P1 | Account API supports create, read, update, and delete operations; responses and data consistency are validated. | `tests/api/account.api.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-23 | API Method Validation | P1 | Unsupported API methods return documented error codes and messages without unintended data changes. | `tests/api/method-validation.api.spec.ts` | Pending implementation and execution. | Not implemented |
| AE-24 | UI / API Consistency | P1 | Product and brand information shown in the UI is consistent with corresponding API responses. | `tests/integration/ui-api-consistency.spec.ts` | Pending implementation and execution. | Not implemented |

## 4. Assignment Coverage Requirements

| Requirement | Target | Current Evidence |
|---|---|---|
| UI automated scenarios | At least 18 | AE-01 verified |
| API checks | At least 8 | Pending execution |
| Negative / edge cases | At least 6 | Pending verification |
| Functional areas | At least 6 | In progress |
| Critical journey assertions | Required | AE-01 verified |
| Reusable test data | Required | Initial implementation present |
| Account cleanup | Required | AE-01 verified |
| HTML / JSON / JUnit reports | Required | Configured; validate outputs |
| AI RCA artifacts | Required | Pending |
| Fault-injection exercises | 2 | Pending |
| GitHub Actions PR execution | Required | Pending |
| Daily CI execution | 05:00 Asia/Karachi | Pending |
| Consecutive smoke runs | 3 | Pending |

## 5. Risk Prioritization

### P0 — Critical

Business-critical journeys that require strong assertions,
reliable execution, and priority investigation on failure.

Scenarios:
AE-01, AE-02, AE-03, AE-06, AE-07,
AE-11, AE-12, AE-13, AE-14, AE-15, AE-16.

### P1 — High

Important functionality, API validation, negative cases,
and supporting customer workflows.

Scenarios:
AE-04, AE-05, AE-08, AE-09, AE-10,
AE-17, AE-18, AE-19, AE-22, AE-23, AE-24.

### P2 — Medium

Supporting functionality with lower business impact.

Scenarios:
AE-20, AE-21.

## 6. Test Design Standards

Every automated scenario must:

1. Use the assigned AE scenario ID.
2. Include the appropriate risk tag: @P0, @P1, or @P2.
3. Use maintainable Playwright locators.
4. Include meaningful business assertions.
5. Avoid arbitrary fixed waits.
6. Use isolated test data where applicable.
7. Clean up disposable accounts and test state.
8. Capture failure evidence.
9. Record execution status accurately.
10. Support evidence-based RCA classification.

## 7. Evidence Requirements

For every executed scenario, retain:

- Scenario ID and test title
- Execution date and environment
- Browser/project
- Actual result
- Relevant assertions
- Failure screenshots and traces where applicable
- Test data cleanup status where applicable
- CI run URL when executed in GitHub Actions
- RCA artifact reference for investigated failures

Do not mark scenarios as Passed without actual execution
evidence.

## 8. Execution Commands

Run authentication UI tests:

    npx playwright test tests/ui/ae-02-04-auth.spec.ts --project=chromium

Run login API tests:

    npx playwright test tests/api/ae-05-login-api.spec.ts --project=chromium

Run all Chromium tests:

    npx playwright test --project=chromium

Open the existing custom report:

    Start-Process .\reports\index.html

## 9. Next Implementation Priority

1. Validate AE-02, AE-03, and AE-04.
2. Complete positive and negative AE-05 API coverage.
3. Confirm account cleanup and test isolation.
4. Implement AE-06 through AE-10.
5. Continue cart, checkout, and invoice scenarios.
6. Complete API and UI/API integration coverage.
7. Implement AI RCA, fault injection, CI/CD, and quality reporting.

## 10. Important Notes

- Test paths for unimplemented scenarios are planned paths,
  not confirmation that files currently exist.
- AE-02 through AE-05 require execution verification.
- Existing working tests must not be overwritten unnecessarily.
- All AI-generated changes require human review.
- Application behavior must be verified against actual evidence.
- Reported failures must not be hidden by weakening assertions.
