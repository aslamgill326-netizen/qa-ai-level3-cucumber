
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AppWorld } from '../support/world';
import { navigateWithRecovery } from '../utils/selfHealing';

Given('I am on the Automation Exercise homepage', async function(this: AppWorld) {
  await navigateWithRecovery(this.page, '/', this.healingEvents);
});

When('I subscribe using a valid disposable email', async function(this: AppWorld) {
  await this.page.locator('#susbscribe_email').fill(this.account.email);
  await this.page.locator('#subscribe').click();
});

Then('I should see the subscription success message', async function(this: AppWorld) {
  await expect(this.page.locator('#success-subscribe')).toContainText(
    'You have been successfully subscribed!'
  );
});

When('I subscribe using an invalid email', async function(this: AppWorld) {
  await this.page.locator('#susbscribe_email').fill('invalid-email');
  await this.page.locator('#subscribe').click();
});

Then('the subscription form should reject the submission', async function(this: AppWorld) {
  const valid = await this.page.locator('#susbscribe_email').evaluate(
    (element: HTMLInputElement) => element.checkValidity()
  );
  expect(valid).toBe(false);
  await expect(this.page.locator('#success-subscribe')).not.toBeVisible();
});
