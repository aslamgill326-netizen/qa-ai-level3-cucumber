
import { Given, When, Then } from '@cucumber/cucumber';
import { AppWorld } from '../support/world';
import { ContactPage } from '../pages/ContactPage';

Given('I am on the contact us page', async function(this: AppWorld) {
  await new ContactPage(this.page).open(this.healingEvents);
});

When('I submit the contact form with valid details', async function(this: AppWorld) {
  await new ContactPage(this.page).submit(
    this.account.name,
    this.account.email
  );
});

Then('I should see the contact submission confirmation', async function(this: AppWorld) {
  await new ContactPage(this.page).verifySuccess();
});
