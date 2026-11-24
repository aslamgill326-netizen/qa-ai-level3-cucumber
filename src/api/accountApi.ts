import type { APIRequestContext } from '@playwright/test';
import type { DisposableTestAccount } from '../utils/testData';

type AccountState = 'exists' | 'absent' | 'unknown';

interface ApiResult {
  responseCode: number;
  message: string;
}

function isApiResult(value: unknown): value is ApiResult {
  return typeof value === 'object' && value !== null &&
    'responseCode' in value && typeof value.responseCode === 'number' &&
    'message' in value && typeof value.message === 'string';
}

function isOverloaded(status: number, body: string): boolean {
  return [429, 502, 503, 504].includes(status) ||
    /under heavy load|queue full|service unavailable/i.test(body);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Read-only verification; never assume an API/network error means absence. */
async function readAccountState(
  request: APIRequestContext,
  email: string,
): Promise<AccountState> {
  try {
    const response = await request.get('/api/getUserDetailByEmail', {
      params: { email },
      timeout: 15000,
    });
    const body = await response.text();
    if (isOverloaded(response.status(), body)) return 'unknown';

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return 'unknown';
    }

    if (typeof payload !== 'object' || payload === null ||
        !('responseCode' in payload)) return 'unknown';
    const code = payload.responseCode;
    if (code === 200) return 'exists';
    if (code === 404) return 'absent';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Verify an account is absent after a deletion request.
 * A single 404 is not sufficient when the preceding operation was uncertain.
 */
async function verifyAbsent(
  request: APIRequestContext,
  email: string,
): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await readAccountState(request, email);
    if (state === 'exists') return false;
    if (state === 'absent') return true;
    if (attempt < 2) await delay(1500);
  }
  return false;
}

/**
 * Delete a disposable test account without blindly repeating a DELETE.
 * An already-absent account is accepted only after a read-only API check.
 */
export async function deleteDisposableAccount(
  request: APIRequestContext,
  account: DisposableTestAccount,
): Promise<void> {
  let response;
  try {
    response = await request.delete('/api/deleteAccount', {
      form: { email: account.email, password: account.password },
      timeout: 30000,
    });
  } catch (error) {
    if (await verifyAbsent(request, account.email)) {
      console.warn('ACCOUNT_CLEANUP_ALREADY_ABSENT: Account confirmed absent after an uncertain DELETE request.');
      return;
    }
    throw new Error(`ACCOUNT_CLEANUP_REQUEST_ERROR: Deletion outcome unconfirmed. ${String(error)}`);
  }

  const status = response.status();
  const rawBody = await response.text();

  if (isOverloaded(status, rawBody)) {
    // A 503 is ambiguous: the server may have processed the DELETE.
    // Retry a mutation only after a read-only lookup proves the account still exists.
    for (let check = 1; check <= 3; check++) {
      const state = await readAccountState(request, account.email);
      if (state === 'absent') {
        console.warn(`ACCOUNT_CLEANUP_ALREADY_ABSENT: Absence confirmed after HTTP ${status}.`);
        return;
      }
      if (state === 'exists') {
        console.warn(`ACCOUNT_CLEANUP_RECOVERY: Account still exists after HTTP ${status}; one verified retry.`);
        await delay(2000);
        let retry;
        try {
          retry = await request.delete('/api/deleteAccount', {
            form: { email: account.email, password: account.password },
            timeout: 30000,
          });
        } catch (error) {
          if (await verifyAbsent(request, account.email)) return;
          throw new Error(`ENVIRONMENT_UNAVAILABLE: Verified cleanup retry outcome unknown. ${String(error)}`);
        }
        const retryBody = await retry.text();
        if (!isOverloaded(retry.status(), retryBody)) {
          let result: unknown;
          try { result = JSON.parse(retryBody); } catch { /* verified below */ }
          if (isApiResult(result) && retry.ok() &&
              result.responseCode === 200 && result.message === 'Account deleted!') {
            console.log('ACCOUNT_CLEANUP_SUCCESS: Account deleted on verified retry.');
            return;
          }
        }
        if (await verifyAbsent(request, account.email)) {
          console.warn('ACCOUNT_CLEANUP_ALREADY_ABSENT: Absence confirmed after verified retry.');
          return;
        }
        throw new Error(`ENVIRONMENT_UNAVAILABLE: Cleanup retry not confirmed. HTTP ${retry.status()}.`);
      }
      if (check < 3) await delay(1500);
    }
    throw new Error(`ENVIRONMENT_UNAVAILABLE: Account cleanup returned HTTP ${status}; read-only account state remained unknown.`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new Error(`ACCOUNT_CLEANUP_INVALID_JSON: HTTP ${status}. Response: ${rawBody.slice(0, 300)}`);
  }

  if (!isApiResult(payload)) {
    throw new Error('ACCOUNT_CLEANUP_INVALID_RESPONSE: Unexpected account deletion response structure.');
  }

  if (response.ok() && payload.responseCode === 200 && payload.message === 'Account deleted!') {
    console.log('ACCOUNT_CLEANUP_SUCCESS: Account deleted successfully.');
    return;
  }

  if (payload.responseCode === 404 && /account not found/i.test(payload.message)) {
    if (await verifyAbsent(request, account.email)) {
      console.warn('ACCOUNT_CLEANUP_ALREADY_ABSENT: API returned 404; independent account lookup confirmed absence.');
      return;
    }
    throw new Error('ACCOUNT_CLEANUP_UNCONFIRMED: DELETE returned account not found, but independent lookup did not confirm absence.');
  }

  throw new Error(
    `ACCOUNT_CLEANUP_FAILED: HTTP ${status}. API code ${payload.responseCode}. Message: ${payload.message}`,
  );
}
