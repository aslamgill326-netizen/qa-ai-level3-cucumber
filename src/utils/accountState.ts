import type { Page } from '@playwright/test';
export type AccountState = 'exists' | 'absent' | 'unknown';

export async function getAccountState(
  page: Page,
  email: string
): Promise<AccountState> {
  try {
    const response = await page.request.get(
      'https://automationexercise.com/api/getUserDetailByEmail',
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