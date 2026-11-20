
import { test, expect } from '../../src/fixtures/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { verifySiteHealth } from '../../src/utils/siteHealth';

test.describe('Authentication UI Tests', () => {

  test('@P0 @AE-02 valid login and logout', async ({
    page,
    registerPage,
    testAccount,
  }) => {
    const loginPage = new LoginPage(page);

    // Step 1: Open registration page.
    await registerPage.open();
    await verifySiteHealth(page);

    // Step 2: Submit new account details.
    await registerPage.submitSignup(
      testAccount.name,
      testAccount.email,
    );

    await verifySiteHealth(page);

    await expect(
      registerPage.accountInformationHeading,
    ).toBeVisible();

    // Step 3: Complete registration.
    await registerPage.completeAccountInformation(
      testAccount,
    );

    await verifySiteHealth(page);

    await expect(
      registerPage.accountCreatedHeading,
    ).toBeVisible();

    // Step 4: Continue to logged-in homepage.
    await registerPage.continueAfterAccountCreated();

    await verifySiteHealth(page);

    await expect(
      loginPage.loggedInUser,
    ).toContainText(testAccount.name);

    // Step 5: Logout.
    await loginPage.logout();

    await verifySiteHealth(page);

    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

    // Step 6: Login again using the same account.
    await loginPage.login(
      testAccount.email,
      testAccount.password,
    );

    await verifySiteHealth(page);

    await expect(
      loginPage.loggedInUser,
    ).toContainText(testAccount.name);
  });

  test('@P0 @AE-03 invalid login', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    // Step 1: Open login page.
    await loginPage.open();
    await verifySiteHealth(page);

    // Step 2: Attempt login with invalid credentials.
    await loginPage.login(
      'invalid-user@example.test',
      'IncorrectPassword123!',
    );

    await verifySiteHealth(page);

    // Step 3: Verify error message.
    await expect(
      loginPage.loginError,
    ).toBeVisible();

    // Step 4: Verify user is not logged in.
    await expect(
      loginPage.logoutLink,
    ).toHaveCount(0);
  });

  test('@P1 @AE-04 duplicate registration', async ({
    page,
    registerPage,
    testAccount,
  }) => {
    const loginPage = new LoginPage(page);

    // Step 1: Open registration page.
    await registerPage.open();
    await verifySiteHealth(page);

    // Step 2: Register a new disposable account.
    await registerPage.submitSignup(
      testAccount.name,
      testAccount.email,
    );

    await verifySiteHealth(page);

    await expect(
      registerPage.accountInformationHeading,
    ).toBeVisible();

    // Step 3: Complete account registration.
    await registerPage.completeAccountInformation(
      testAccount,
    );

    await verifySiteHealth(page);

    await expect(
      registerPage.accountCreatedHeading,
    ).toBeVisible();

    // Step 4: Continue to homepage.
    await registerPage.continueAfterAccountCreated();

    await verifySiteHealth(page);

    // Step 5: Logout.
    await loginPage.logout();

    await verifySiteHealth(page);

    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);

    // Step 6: Open signup page again.
    await registerPage.open();
    await verifySiteHealth(page);

    // Step 7: Attempt registration with existing email.
    await registerPage.submitSignup(
      testAccount.name,
      testAccount.email,
    );

    await verifySiteHealth(page);

    // Step 8: Verify duplicate registration error.
    await expect(
      page.getByText('Email Address already exist!'),
    ).toBeVisible();

    // Step 9: Verify no second account was created.
    await expect(
      registerPage.accountInformationHeading,
    ).toHaveCount(0);
  });

});
