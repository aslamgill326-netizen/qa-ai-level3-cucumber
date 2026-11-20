import { expect, test } from '../../src/fixtures/test';
import { verifySiteHealth } from '../../src/utils/siteHealth';

test('@P0 @AE-01 creates a disposable account and signs in the new user', async ({
  page,
  registerPage,
  testAccount,
}) => {
  await registerPage.open();
  await registerPage.submitSignup(testAccount.name, testAccount.email);
  await expect(registerPage.accountInformationHeading).toBeVisible();

  await registerPage.completeAccountInformation(testAccount);

  await expect(registerPage.accountCreatedHeading).toBeVisible();
  await registerPage.continueAfterAccountCreated();

await verifySiteHealth(page);

await expect(page).toHaveURL('/');

await expect(registerPage.loggedInUser)
  .toContainText(testAccount.name);
});
