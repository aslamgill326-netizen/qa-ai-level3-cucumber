
import type { Page, Response } from '@playwright/test';

export interface SiteHealthResult {
  healthy: boolean;
  status: number | null;
  url: string;
  reason: string;
}

const ERROR_STATUSES = new Set([
  429, 500, 502, 503, 504, 520, 521, 522, 523, 524,
]);

const ERROR_TEXT =
  /under heavy load|queue full|service unavailable|too many requests|bad gateway|gateway timeout|internal server error/i;

export function isAdvertisementInterruption(url: string): boolean {
  return /#google_vignette(?:$|[?&])/i.test(url);
}

export async function verifySiteHealth(
  page: Page,
  response?: Response | null,
): Promise<SiteHealthResult> {
  if (page.isClosed()) {
    throw new Error('ENVIRONMENT_UNAVAILABLE: Browser page is closed.');
  }

  const url = page.url();
  const status = response?.status() ?? null;

  if (isAdvertisementInterruption(url)) {
    throw new Error(`ENVIRONMENT_UNAVAILABLE: ADVERTISEMENT_INTERRUPTION. URL: ${url}`);
  }

  if (status !== null && ERROR_STATUSES.has(status)) {
    throw new Error(`ENVIRONMENT_UNAVAILABLE: HTTP ${status}. URL: ${url}`);
  }

  let bodyText: string;
  try {
    bodyText = await page.locator('body').innerText({ timeout: 5000 });
  } catch (error) {
    throw new Error(`SITE_HEALTH_UNKNOWN: Could not inspect page at ${url}. ${String(error)}`);
  }

  if (isAdvertisementInterruption(page.url())) {
    throw new Error(`ENVIRONMENT_UNAVAILABLE: ADVERTISEMENT_INTERRUPTION. URL: ${page.url()}`);
  }

  if (ERROR_TEXT.test(bodyText)) {
    throw new Error(
      `ENVIRONMENT_UNAVAILABLE: Error page detected (${bodyText.match(ERROR_TEXT)?.[0]}). URL: ${url}`
    );
  }

  return {
    healthy: true,
    status,
    url: page.url(),
    reason: 'No known environment error detected.',
  };
}
