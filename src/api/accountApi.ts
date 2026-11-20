
import type { APIRequestContext } from '@playwright/test';
import type { DisposableTestAccount } from '../utils/testData';

interface DeleteAccountResponse {
  responseCode: number;
  message: string;
}

function isDeleteAccountResponse(
  value: unknown,
): value is DeleteAccountResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'responseCode' in value &&
    typeof value.responseCode === 'number' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deleteDisposableAccount(
  request: APIRequestContext,
  account: DisposableTestAccount,
): Promise<void> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response;

    try {
      response = await request.delete('/api/deleteAccount', {
        form: {
          email: account.email,
          password: account.password,
        },
        timeout: 30000,
      });
    } catch (error) {
      // Network errors are not automatically safe to retry:
      // the server may already have processed the deletion.
      throw new Error(
        `ACCOUNT_CLEANUP_REQUEST_ERROR: ${String(error)}`,
      );
    }

    const status = response.status();
    const contentType =
      response.headers()['content-type'] ?? 'unknown';

    const rawBody = await response.text();

    // Handle temporary server overload.
    if (status === 503 || status === 429) {
      if (attempt < maxAttempts) {
        const delay = 2000 * Math.pow(2, attempt - 1);

        console.warn(
          `ENVIRONMENT_UNAVAILABLE: Account cleanup ` +
          `returned HTTP ${status}. ` +
          `Retrying in ${delay}ms ` +
          `(attempt ${attempt}/${maxAttempts}).`,
        );

        await sleep(delay);
        continue;
      }

      throw new Error(
        `ENVIRONMENT_UNAVAILABLE: Account cleanup ` +
        `failed after ${maxAttempts} attempts. ` +
        `HTTP ${status}. ` +
        `Response: ${rawBody.slice(0, 300)}`,
      );
    }

    // Validate HTTP response.
    if (!response.ok()) {
      throw new Error(
        `ACCOUNT_CLEANUP_FAILED: HTTP ${status}. ` +
        `Content-Type: ${contentType}. ` +
        `Response: ${rawBody.slice(0, 300)}`,
      );
    }

    // Detect queue-full pages even if HTTP status is 200.
    if (
      rawBody.includes('This website is under heavy load') ||
      rawBody.includes('queue full')
    ) {
      throw new Error(
        'ENVIRONMENT_UNAVAILABLE: Automation Exercise ' +
        'returned a queue-full page during account cleanup.',
      );
    }
    // Some Automation Exercise endpoints return valid JSON
// with an incorrect text/html Content-Type.
// Parse the body and validate its actual structure instead.
if (!contentType.toLowerCase().includes('json')) {
  console.warn(
    `ACCOUNT_CLEANUP_CONTENT_TYPE_MISMATCH: ` +
    `Received ${contentType}; validating response body.`,
  );
}

    // Safely parse JSON.
    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error(
        `ACCOUNT_CLEANUP_INVALID_JSON: HTTP ${status}. ` +
        `Response: ${rawBody.slice(0, 300)}`,
      );
    }

    // Validate API response structure.
    if (!isDeleteAccountResponse(payload)) {
      throw new Error(
        'ACCOUNT_CLEANUP_INVALID_RESPONSE: ' +
        'Account cleanup returned an unexpected response shape.',
      );
    }

    // Verify deletion succeeded.
    if (
      payload.responseCode !== 200 ||
      payload.message !== 'Account deleted!'
    ) {
      throw new Error(
        `ACCOUNT_CLEANUP_FAILED: ` +
        `API code ${payload.responseCode}. ` +
        `Message: ${payload.message}`,
      );
    }

    console.log(
      `Account cleanup verified successfully ` +
      `(attempt ${attempt}/${maxAttempts}): ${payload.message}`,
    );

    return;
  }

  throw new Error(
    'ACCOUNT_CLEANUP_FAILED: Maximum attempts exhausted.',
  );
}
