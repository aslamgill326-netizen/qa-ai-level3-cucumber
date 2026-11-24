
import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AppWorld } from '../support/world';
import { verifySiteHealth } from '../utils/siteHealth';
import { getAccountState } from '../utils/accountState';

const DELETION_CHECK_ATTEMPTS = 3;

async function verifyDeletionState(world: AppWorld): Promise<void> {
  for (let attempt = 1; attempt <= DELETION_CHECK_ATTEMPTS; attempt++) {
    const state = await getAccountState(world.page, world.account.email);

    world.healingEvents.push({
      name: 'Account deletion API verification',
      strategy: 'environment',
      candidate: attempt,
      timestamp: new Date().toISOString(),
      status: state === 'absent' ? 'recovered' :
        attempt === DELETION_CHECK_ATTEMPTS ? 'failed' : 'attempted',
      message: `Account state: ${state}. UI confirmation unavailable.`,
    });

    if (state === 'absent') {
      world.accountCreated = false;
      return;
    }

    if (attempt === DELETION_CHECK_ATTEMPTS) {
      throw new Error(`DELETION_STATE_${state.toUpperCase()}: Account deletion not confirmed.`);
    }

    await new Promise<void>(resolve => setTimeout(resolve, 2000));
  }
}

When('I submit login without a password', async function (this: AppWorld) {
  await this.loginPage.submitWithMissingField('password');
});

When('I submit login without an email', async function (this: AppWorld) {
  await this.loginPage.submitWithMissingField('email');
});

Then('the login form should reject the submission', async function (this: AppWorld) {
  await verifySiteHealth(this.page);
  await this.loginPage.verifyRequiredFieldValidation();
});

When('I submit registration with missing required fields', async function (this: AppWorld) {
  await this.registerPage.submitWithMissingFields();
});

Then('the registration form should reject the submission', async function (this: AppWorld) {
  await verifySiteHealth(this.page);
  await this.registerPage.verifyRequiredFieldValidation();
});

When('I delete my disposable account', async function (this: AppWorld) {
  await verifySiteHealth(this.page);
  await this.registerPage.deleteAccount();
});

Then('the account should be deleted successfully', async function (this: AppWorld) {
  try {
    await verifySiteHealth(this.page);
    await this.registerPage.verifyAccountDeleted();
    await verifySiteHealth(this.page);
  } catch (error) {
    let healthError: unknown;

    try {
      await verifySiteHealth(this.page);
    } catch (failure) {
      healthError = failure;
    }

    const unavailable =
      /ENVIRONMENT_UNAVAILABLE/i.test(String(error)) ||
      /ENVIRONMENT_UNAVAILABLE/i.test(String(healthError));

    // Equivalent UI confirmation locator.
    if (!unavailable && /\/delete_account\/?$/.test(new URL(this.page.url()).pathname)) {
      const heading = this.page.locator('[data-qa="account-deleted"]');

      if (await heading.count() === 1 && await heading.isVisible()) {
        await expect(heading).toHaveText(/^Account Deleted!$/i);
        await expect(this.registerPage.deleteAccountLink).toHaveCount(0);
        await verifySiteHealth(this.page);
        this.accountCreated = false;
        return;
      }
    }

    // Verify account absence before cleanup, without repeating deletion.
    await verifyDeletionState(this);

    if (!unavailable) {
      throw new Error(
        `DELETION_UI_UNCONFIRMED: Account absent, but UI confirmation failed. ${String(error)}`
      );
    }

    await this.log(
      `Account absence confirmed after environment interruption. UI confirmation not verified. ` +
      `${String(healthError ?? error)}`
    );
  }

  this.accountCreated = false;
});
