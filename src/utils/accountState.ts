import type { Page } from '@playwright/test';
export type AccountState = 'exists' | 'absent' | 'unknown';

export async function getAccountState(
  page: Page,
  email: string
): Promise<AccountState> {
  try {
    const response = await page.request.get(
      new URL('/api/getUserDetailByEmail', page.url()).toString(),
      {
        params: { email },
        timeout: 15000
      }
    );

    if (response.status() >= 500 || response.status() === 429) {
      return 'unknown';
    }

    const data = await response.json();

    if (data.responseCode === 200) return 'exists';
    if (data.responseCode === 404) return 'absent';

    return 'unknown';
  } catch {
    return 'unknown';
  }
}
/** Poll a read-only endpoint after an ambiguous create response; never replay POST. */
export async function waitForAccountState(
  page: Page, email: string, attempts = 4, intervalMs = 1500
): Promise<AccountState> {
  let uncertain = false;
  for (let i = 0; i < attempts; i++) {
    const state = await getAccountState(page, email);
    if (state === 'exists') return 'exists';
    if (state === 'unknown') uncertain = true;
    if (i + 1 < attempts) {
      await new Promise<void>(resolve => setTimeout(resolve, intervalMs));
    }
  }
  return uncertain ? 'unknown' : 'absent';
}
