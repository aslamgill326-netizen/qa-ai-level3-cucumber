
import { When, Then } from '@cucumber/cucumber';
import { AppWorld } from '../support/world';
import { verifySiteHealth } from '../utils/siteHealth';
import { expect } from '@playwright/test';
import { getAccountState } from '../utils/accountState';

const DELETION_CHECK_ATTEMPTS = 3;

async function verifyDeletionAfterOverload(world: AppWorld): Promise<void> {
  for (let attempt = 1; attempt <= DELETION_CHECK_ATTEMPTS; attempt++) {
    const state = await getAccountState(world.page, world.account.email);
    world.healingEvents.push({
      name: 'Account deletion API state verification',
      strategy: 'environment',
      candidate: attempt,
      timestamp: new Date().toISOString(),
      status: state === 'absent' ? 'recovered' :
        attempt === DELETION_CHECK_ATTEMPTS ? 'failed' : 'attempted',
      message: `Read-only account lookup: ${state}. UI confirmation unavailable.`,
    });
    if (state === 'absent') {
      world.accountCreated = false;
      return;
    }
    if (attempt === DELETION_CHECK_ATTEMPTS) {
      throw new Error(`DELETION_STATE_${state.toUpperCase()}: Account deletion not confirmed. Original deletion was not repeated.`);
    }
    await new Promise<void>(resolve => setTimeout(resolve, attempt * 3000));
  }
}

When(
  'I submit login without a password',
  async function (this: AppWorld) {
    await this.loginPage.submitWithMissingField('password');
  }
);

When(
  'I submit login without an email',
  async function (this: AppWorld) {
    await this.loginPage.submitWithMissingField('email');
  }
);

Then(
  'the login form should reject the submission',
  async function (this: AppWorld) {
    await verifySiteHealth(this.page);
    await this.loginPage.verifyRequiredFieldValidation();
  }
);

When(
  'I submit registration with missing required fields',
  async function (this: AppWorld) {
    await this.registerPage.submitWithMissingFields();
  }
);

Then(
  'the registration form should reject the submission',
  async function (this: AppWorld) {
    await verifySiteHealth(this.page);
    await this.registerPage.verifyRequiredFieldValidation();
  }
);

When(
  'I delete my disposable account',
  async function (this: AppWorld) {
    await this.registerPage.deleteAccount();
  }
);

Then(
  'the account should be deleted successfully',
  async function (this: AppWorld) {
    try {
      await verifySiteHealth(this.page);
      await this.registerPage.verifyAccountDeleted();
    } catch (error) {
      // Recheck after the assertion timeout: the response may have changed.
      let healthError: unknown;
      try { await verifySiteHealth(this.page); } catch (failure) { healthError = failure; }
      const status = this.lastNavigationStatus;
      const unavailable = /ENVIRONMENT_UNAVAILABLE/i.test(String(error)) ||
        /ENVIRONMENT_UNAVAILABLE/i.test(String(healthError)) ||
        (status !== null && [429, 500, 502, 503, 504, 520, 521, 522, 523, 524].includes(status));
      // A second, equivalent confirmation locator is allowed on a healthy page.
      if (!unavailable && /\/delete_account\/?$/.test(new URL(this.page.url()).pathname)) {
        const heading = this.page.locator('[data-qa="account-deleted"]');
        if (await heading.count() === 1 && await heading.isVisible()) {
          await expect(heading).toHaveText(/^Account Deleted!$/i);
          await expect(this.registerPage.deleteAccountLink).toHaveCount(0);
          this.accountCreated = false;
          return;
        }
      }
      await verifyDeletionAfterOverload(this);
      if (!unavailable) {
        // Business outcome confirmed, but a healthy UI missing confirmation is a defect.
        throw new Error(`DELETION_UI_UNCONFIRMED: Account absent before cleanup; original UI assertion failed. URL=${this.page.url()}; HTTP=${status}; ${String(error)}`);
      }
      // Existing scenario verifies deletion outcome; UI confirmation remains unverified.
      await this.log('Account absence confirmed by API after environment failure; UI confirmation not verified.');
    }

    // Prevent the After hook from deleting it again.
    this.accountCreated = false;
  }
);
