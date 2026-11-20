import type { Page, Locator, Response, APIResponse } from '@playwright/test';
import { verifySiteHealth } from './siteHealth';

export interface HealingEvent {
  name: string;
  strategy: 'primary' | 'fallback' | 'environment';
  candidate: number;
  timestamp: string;
  status?: 'attempted' | 'recovered' | 'failed';
  message?: string;
}

export interface RecoveryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

export type RecoveryOperation = 'navigation' | 'read-only-api' | 'registration' | 'logout';
export type RecoveryDecision = 'retry' | 'verify-state' | 'stop';

const DEFAULT_OPTIONS: Required<RecoveryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1500,
  maxDelayMs: 6000,
  timeoutMs: 15000,
};

const TRANSIENT_STATUSES = new Set([429, 502, 503, 504]);
const ENVIRONMENT_PATTERN = /ENVIRONMENT_UNAVAILABLE|queue full|under heavy load|HTTP (429|502|503|504)|service unavailable/i;
const TIMEOUT_PATTERN = /Timeout \d+ms exceeded|TimeoutError|ETIMEDOUT|ESOCKETTIMEDOUT/i;

function normalizeOptions(options: RecoveryOptions = {}): Required<RecoveryOptions> {
  const positive = (value: number | undefined, fallback: number): number =>
    Number.isFinite(value) && (value as number) > 0 ? Math.floor(value as number) : fallback;
  return {
    maxAttempts: positive(options.maxAttempts, DEFAULT_OPTIONS.maxAttempts),
    initialDelayMs: positive(options.initialDelayMs, DEFAULT_OPTIONS.initialDelayMs),
    maxDelayMs: positive(options.maxDelayMs, DEFAULT_OPTIONS.maxDelayMs),
    timeoutMs: positive(options.timeoutMs, DEFAULT_OPTIONS.timeoutMs),
  };
}

function logEvent(events: HealingEvent[] | undefined, event: Omit<HealingEvent, 'timestamp'>): void {
  events?.push({ ...event, timestamp: new Date().toISOString() });
}

function delay(attempt: number, options: Required<RecoveryOptions>): Promise<void> {
  const ms = Math.min(options.initialDelayMs * 2 ** (attempt - 1), options.maxDelayMs);
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRecoverable(error: unknown): boolean {
  return ENVIRONMENT_PATTERN.test(String(error)) || TIMEOUT_PATTERN.test(String(error));
}

export function decideRecovery(operation: RecoveryOperation, status: number): RecoveryDecision {
  if (!TRANSIENT_STATUSES.has(status)) return 'stop';
  return operation === 'navigation' || operation === 'read-only-api' ? 'retry' : 'verify-state';
}

/** GET navigation only. Does not replay POST forms or open a new tab. */
export async function navigateWithRecovery(
  page: Page,
  url: string,
  events: HealingEvent[],
  options: RecoveryOptions = {},
): Promise<Response | null> {
  const cfg = normalizeOptions(options);
  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: cfg.timeoutMs,
      });
      await verifySiteHealth(page, response);
      if (attempt > 1) {
        logEvent(events, {
          name: `Navigation: ${url}`, strategy: 'environment', candidate: attempt,
          status: 'recovered', message: `Recovered on attempt ${attempt}`,
        });
      }
      return response;
    } catch (error) {
      if (!isRecoverable(error) || page.isClosed()) throw error;
      logEvent(events, {
        name: `Navigation: ${url}`, strategy: 'environment', candidate: attempt,
        status: attempt === cfg.maxAttempts ? 'failed' : 'attempted',
        message: String(error),
      });
      if (attempt === cfg.maxAttempts) {
        throw new Error(
          `ENVIRONMENT_UNAVAILABLE: GET navigation failed after ${attempt} attempts. ` +
          `URL: ${url}. Last error: ${String(error)}`,
        );
      }
      await delay(attempt, cfg);
    }
  }
  throw new Error(`ENVIRONMENT_UNAVAILABLE: Navigation recovery exhausted for ${url}`);
}

/**
 * For explicitly approved repeatable requests ONLY (for example, negative login
 * validation). Never use for registration, deletion, or logout.
 * An HTTP response with a non-transient status is returned to the caller,
 * which remains responsible for checking the application response body.
 */
export async function retryApiOnOverload(
  operation: () => Promise<APIResponse>,
  maxAttempts = 3,
  events?: HealingEvent[],
  operationName = 'API request',
): Promise<APIResponse> {
  const cfg = normalizeOptions({ maxAttempts });
  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      const response = await operation();
      if (!TRANSIENT_STATUSES.has(response.status())) {
        if (attempt > 1) {
          logEvent(events, {
            name: operationName, strategy: 'environment', candidate: attempt,
            status: 'recovered', message: `Received HTTP ${response.status()}`,
          });
        }
        return response;
      }
      const status = response.status();
      if (attempt === cfg.maxAttempts) {
        const body = await response.text().catch(() => '');
        logEvent(events, {
          name: operationName, strategy: 'environment', candidate: attempt,
          status: 'failed', message: `HTTP ${status}: ${body.slice(0, 200)}`,
        });
        throw new Error(
          `ENVIRONMENT_UNAVAILABLE: ${operationName} returned HTTP ${status} ` +
          `after ${attempt} attempts. ${body.slice(0, 200)}`,
        );
      }
      logEvent(events, {
        name: operationName, strategy: 'environment', candidate: attempt,
        status: 'attempted', message: `HTTP ${status}; retry scheduled`,
      });
    } catch (error) {
      if (!TIMEOUT_PATTERN.test(String(error))) throw error;
      logEvent(events, {
        name: operationName, strategy: 'environment', candidate: attempt,
        status: attempt === cfg.maxAttempts ? 'failed' : 'attempted',
        message: `Request timeout: ${String(error)}`,
      });
      if (attempt === cfg.maxAttempts) {
        throw new Error(
          `ENVIRONMENT_UNAVAILABLE: ${operationName} timed out after ` +
          `${attempt} attempts. ${String(error)}`,
        );
      }
    }
    await delay(attempt, cfg);
  }
  throw new Error(`ENVIRONMENT_UNAVAILABLE: ${operationName} recovery exhausted`);
}

/** Alias for explicitly approved repeatable API operations. */
export const retrySafeApiRequest = (
  operation: () => Promise<APIResponse>,
  events: HealingEvent[],
  operationName: string,
  maxAttempts = 3,
): Promise<APIResponse> => retryApiOnOverload(operation, maxAttempts, events, operationName);

/**
 * Negative-login recovery is opt-in. It may replay a failed authentication
 * attempt only when the expected error is absent and the page is unavailable.
 */
export async function recoverInvalidLogin(
  page: Page,
  loginError: Locator,
  loginAction: () => Promise<void>,
  events: HealingEvent[],
): Promise<void> {
  if (await loginError.isVisible().catch(() => false)) return;
  try {
    await verifySiteHealth(page);
    return; // Healthy page: let the scenario assertion report the real defect.
  } catch (error) {
    if (!ENVIRONMENT_PATTERN.test(String(error))) throw error;
  }
  logEvent(events, {
    name: 'Invalid login recovery', strategy: 'environment', candidate: 1,
    status: 'attempted', message: 'Restoring login page after server error',
  });
  await navigateWithRecovery(page, '/login', events);
  await loginAction();
  await verifySiteHealth(page);
  if (!(await loginError.isVisible().catch(() => false))) {
    logEvent(events, {
      name: 'Invalid login recovery', strategy: 'environment', candidate: 2,
      status: 'failed', message: 'Expected validation message not found',
    });
    throw new Error('LOGIN_VALIDATION_FAILED: Expected invalid credentials error not found.');
  }
  logEvent(events, {
    name: 'Invalid login recovery', strategy: 'environment', candidate: 2,
    status: 'recovered', message: 'Expected invalid credentials message verified',
  });
}

/** Safe GET recovery only after registration was independently confirmed. */
export async function recoverRegistrationNavigation(
  page: Page,
  accountConfirmed: boolean,
  loggedInUser: Locator,
  expectedName: string,
  events: HealingEvent[],
): Promise<void> {
  if (!accountConfirmed) {
    throw new Error(
      'REGISTRATION_STATE_UNKNOWN: Account creation not confirmed; submission will not be repeated.',
    );
  }
  try {
    await verifySiteHealth(page);
    if (await loggedInUser.isVisible().catch(() => false)) {
      const text = await loggedInUser.textContent();
      if (text?.includes(expectedName)) return;
    }
  } catch (error) {
    if (!ENVIRONMENT_PATTERN.test(String(error))) throw error;
  }
  logEvent(events, {
    name: 'Registration navigation recovery', strategy: 'environment', candidate: 1,
    status: 'attempted', message: 'Recovering homepage without resubmitting registration',
  });
  await navigateWithRecovery(page, '/', events);
  const visible = await loggedInUser.isVisible().catch(() => false);
  const name = visible ? await loggedInUser.textContent() : null;
  if (!visible || !name?.includes(expectedName)) {
    logEvent(events, {
      name: 'Registration navigation recovery', strategy: 'environment', candidate: 2,
      status: 'failed', message: 'Expected authenticated user not visible',
    });
    throw new Error('REGISTRATION_RECOVERY_FAILED: Signed-in user could not be verified.');
  }
  logEvent(events, {
    name: 'Registration navigation recovery', strategy: 'environment', candidate: 2,
    status: 'recovered', message: 'Homepage and signed-in user verified',
  });
}

/** Only approved, unique, visible locator candidates may be used. */
export async function resolveLocator(
  page: Page,
  name: string,
  candidates: Locator[],
  events: HealingEvent[],
): Promise<Locator> {
  await verifySiteHealth(page);
  for (let i = 0; i < candidates.length; i++) {
    const locator = candidates[i];
    const count = await locator.count();
    if (count !== 1 || !(await locator.isVisible().catch(() => false))) continue;
    logEvent(events, {
      name, strategy: i === 0 ? 'primary' : 'fallback', candidate: i,
      status: i === 0 ? undefined : 'recovered',
      message: i === 0 ? 'Primary locator resolved' : `Fallback locator ${i} resolved`,
    });
    return locator;
  }
  await verifySiteHealth(page);
  logEvent(events, {
    name, strategy: 'fallback', candidate: -1,
    status: 'failed', message: 'No unique visible approved locator found',
  });
  throw new Error(`LOCATOR_UNRESOLVED: ${name}; no unique visible approved candidate`);
}
