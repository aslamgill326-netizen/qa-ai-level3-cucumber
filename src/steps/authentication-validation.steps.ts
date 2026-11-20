
import { When, Then } from '@cucumber/cucumber';
import { AppWorld } from '../support/world';
import { verifySiteHealth } from '../utils/siteHealth';

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
    await verifySiteHealth(this.page);
    await this.registerPage.verifyAccountDeleted();

    // Prevent the After hook from deleting it again.
    this.accountCreated = false;
  }
);
