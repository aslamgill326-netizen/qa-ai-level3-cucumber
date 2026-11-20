
import { expect, type Locator, type Page } from '@playwright/test';
import type { DisposableTestAccount } from '../utils/testData';

export class RegisterPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly signupButton: Locator;
  readonly accountInformationHeading: Locator;
  readonly accountCreatedHeading: Locator;
  readonly loggedInUser: Locator;
  readonly passwordInput: Locator;
  readonly birthDaySelect: Locator;
  readonly birthMonthSelect: Locator;
  readonly birthYearSelect: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly addressInput: Locator;
  readonly countrySelect: Locator;
  readonly stateInput: Locator;
  readonly cityInput: Locator;
  readonly zipcodeInput: Locator;
  readonly mobileNumberInput: Locator;
  readonly createAccountButton: Locator;
  readonly continueButton: Locator;
  readonly deleteAccountLink: Locator;
  readonly accountDeletedHeading: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.locator('[data-qa="signup-name"]');
    this.emailInput = page.locator('[data-qa="signup-email"]');
    this.signupButton = page.locator('[data-qa="signup-button"]');

    this.accountInformationHeading = page.getByRole('heading', {
      name: 'Enter Account Information',
      exact: true
    });

    this.accountCreatedHeading = page.getByRole('heading', {
      name: /Account Created!/i,
      exact: true
    });

    this.loggedInUser = page.getByText('Logged in as', {
      exact: false
    });

    this.passwordInput = page.locator('#password');
    this.birthDaySelect = page.locator('#days');
    this.birthMonthSelect = page.locator('#months');
    this.birthYearSelect = page.locator('#years');

    this.firstNameInput = page.locator('#first_name');
    this.lastNameInput = page.locator('#last_name');
    this.addressInput = page.locator('#address1');
    this.countrySelect = page.locator('#country');
    this.stateInput = page.locator('#state');
    this.cityInput = page.locator('#city');
    this.zipcodeInput = page.locator('#zipcode');
    this.mobileNumberInput = page.locator('#mobile_number');

    this.createAccountButton = page.locator(
      '[data-qa="create-account"]'
    );

    this.continueButton = page.getByRole('link', {
      name: 'Continue',
      exact: true
    });

    this.deleteAccountLink = page.locator(
      'a[href="/delete_account"]'
    );

    this.accountDeletedHeading = page.getByRole('heading', {
      name: /Account Deleted!/i
    });
  }

  async open(): Promise<void> {
    await this.page.goto('/login');
  }

  async submitSignup(
    name: string,
    email: string
  ): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.signupButton.click();
  }

  async completeAccountInformation(
    account: DisposableTestAccount
  ): Promise<void> {
    await this.page.getByRole('radio', {
      name: account.title
    }).check();

    await this.passwordInput.fill(account.password);
    await this.birthDaySelect.selectOption(account.birthDay);

    await this.birthMonthSelect.selectOption({
      label: account.birthMonth
    });

    await this.birthYearSelect.selectOption(account.birthYear);
    await this.firstNameInput.fill(account.firstName);
    await this.lastNameInput.fill(account.lastName);
    await this.addressInput.fill(account.address);

    await this.countrySelect.selectOption({
      label: account.country
    });

    await this.stateInput.fill(account.state);
    await this.cityInput.fill(account.city);
    await this.zipcodeInput.fill(account.zipcode);
    await this.mobileNumberInput.fill(account.mobileNumber);

    await this.createAccountButton.click();
  }

  async continueAfterAccountCreated(): Promise<void> {
    await this.continueButton.click();
  }

  async submitWithMissingFields(): Promise<void> {
    await this.nameInput.fill('');
    await this.emailInput.fill('test@example.com');
    await this.signupButton.click();
  }

  async verifyRequiredFieldValidation(): Promise<void> {
    const invalid = await this.nameInput.evaluate(
      (element: HTMLInputElement) => !element.checkValidity()
    );

    expect(invalid).toBe(true);

    await expect(this.accountInformationHeading).toHaveCount(0);
    await expect(this.accountCreatedHeading).toHaveCount(0);
  }

  async deleteAccount(): Promise<void> {
    await expect(this.deleteAccountLink).toBeVisible();
    await this.deleteAccountLink.click();
  }

  async verifyAccountDeleted(): Promise<void> {
    await expect(this.accountDeletedHeading).toBeVisible({
      timeout: 15000
    });

    await expect(this.deleteAccountLink).toHaveCount(0);
  }
}
