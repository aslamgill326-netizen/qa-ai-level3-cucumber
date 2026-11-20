import type { Page, Response } from '@playwright/test';

export interface SiteHealthResult {
  healthy: boolean;
  status: number | null;
  url: string;
  reason: string;
}

const ERROR_STATUSES = new Set([429, 500, 502, 503, 504]);
const ERROR_TEXT = /under heavy load|queue full|service unavailable|too many requests|bad gateway|gateway timeout|internal server error/i;

/** Checks the currently displayed page; never navigates or retries a submission. */
export async function verifySiteHealth(
  page: Page,
  response?: Response | null,
): Promise<SiteHealthResult> {
  if (page.isClosed()) {
    throw new Error('ENVIRONMENT_UNAVAILABLE: Browser page is closed.');
  }

  const url = page.url();
  const status = response?.status() ?? null;

  if (status !== null && ERROR_STATUSES.has(status)) {
    throw new Error(`ENVIRONMENT_UNAVAILABLE: HTTP ${status}. URL: ${url}`);
  }

  // The hosting provider sometimes serves a queue-full HTML page with HTTP 200.
  // Use a short bounded check instead of a Playwright assertion stack trace.
  let bodyText: string;
  try {
    bodyText = await page.locator('body').innerText({ timeout: 5000 });
  } catch (error) {
    throw new Error(
      `SITE_HEALTH_UNKNOWN: Could not inspect page at ${url}. ${String(error)}`,
    );
  }

  if (ERROR_TEXT.test(bodyText)) {
    const match = bodyText.match(ERROR_TEXT)?.[0] ?? 'server error message';
    throw new Error(
      `ENVIRONMENT_UNAVAILABLE: Error page detected (${match}). URL: ${url}`,
    );
  }

  return {
    healthy: true,
    status,
    url,
    reason: 'No known environment error detected.',
  };
}
