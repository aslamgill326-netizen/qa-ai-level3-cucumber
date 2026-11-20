import { test as base, expect } from '@playwright/test';
import { deleteDisposableAccount } from '../api/accountApi';
import { HomePage } from '../pages/HomePage';
import { RegisterPage } from '../pages/RegisterPage';
import { createDisposableTestAccount, type DisposableTestAccount } from '../utils/testData';

interface AppFixtures {
  homePage: HomePage;
  registerPage: RegisterPage;
  testAccount: DisposableTestAccount;
  accountCleanup: void;
}

export const test = base.extend<AppFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  testAccount: async ({}, use) => {
    await use(createDisposableTestAccount());
  },

  accountCleanup: [async ({ page, request, testAccount }, use) => {
    let accountWasCreated = false;
    const observeAccountCreation = (response: import('@playwright/test').Response): void => {
      const request = response.request();
      const responseUrl = new URL(response.url());
      const requestBody = request.postData() ?? '';

      if (
        request.method() === 'POST' &&
        responseUrl.pathname === '/signup' &&
        requestBody.includes('form_type=create_account') &&
        response.status() === 302
      ) {
        accountWasCreated = true;
      }
    };

    page.on('response', observeAccountCreation);
    try {
      await use();
    } finally {
      page.off('response', observeAccountCreation);
      if (accountWasCreated) {
        await deleteDisposableAccount(request, testAccount);
        console.log('Disposable registration account cleanup succeeded.');
      }
    }
  }, { auto: true }],
});

export { expect };
