# FI-02 — Controlled network fault
**Status:** NOT YET EXECUTED. This is a safe exercise plan, not evidence.

**Goal:** In a dedicated local test context, use Playwright `page.route()` to abort one selected GET request to a test page, capture the request failure and classify ENVIRONMENT_OR_NETWORK (test-controlled). Do not disrupt the live website or repeat unsafe writes.

**Proposed isolated snippet** (adapt to actual page fixture and URL):
```ts
let injected = false;
await page.route('**/products*', async route => {
  if (!injected && route.request().method() === 'GET') {
    injected = true;
    await route.abort('failed');
    return;
  }
  await route.continue();
});
```
**Validation:** Ensure the request was intercepted, capture sanitized network log and screenshot, then remove interception and rerun the same test. Expected class: ENVIRONMENT_OR_NETWORK, with the injection disclosed.

**Evidence to add:** branch/commit, original pass, injected failure, RCA JSON + alternatives, human review, restored pass, CI status/artifact links.
