
import { When, Then } from '@cucumber/cucumber';
import { AppWorld } from '../support/world';
import { verifySiteHealth } from '../utils/siteHealth';
import { getAccountState } from '../utils/accountState';

const DELETION_CHECK_ATTEMPTS = 3;

async function verifyDeletionAfterOverload(world: AppWorld): Promise<void> {
  for (let attempt = 1; attempt <= DELETION_CHECK_ATTEMPTS; attempt++) {
    const state = await getAccountState(world.page, world.account.email);
    world.healingEvents.push({
      name: 'Account deletion verification',
      strategy: 'environment',
      candidate: attempt,
      timestamp: new Date().toISOString(),
      status: state === 'absent' ? 'recovered' :
        attempt === DELETION_CHECK_ATTEMPTS ? 'failed' : 'attempted',
      message: `Read-only account lookup: ${state}. UI confirmation unavailable.`,
    });
    if (state === 'absent') return;
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
      // Recover only from a confirmed server overload, not a healthy UI defect.
      if (!/ENVIRONMENT_UNAVAILABLE.*(?:under heavy load|queue full|service unavailable|HTTP (429|502|503|504|520|521|522|523|524))/i.test(String(error))) {
        throw error;
      }
      await verifyDeletionAfterOverload(this);
    }

    // Prevent the After hook from deleting it again.
    this.accountCreated = false;
  }
);
