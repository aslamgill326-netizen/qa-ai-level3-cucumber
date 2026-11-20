
import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly loginError: Locator;
  readonly logoutLink: Locator;
  readonly loggedInUser: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.locator(
      'form[action="/login"] input[data-qa="login-email"]'
    );

    this.passwordInput = page.locator(
      'form[action="/login"] input[data-qa="login-password"]'
    );

    this.loginButton = page.locator(
      'button[data-qa="login-button"]'
    );

    this.loginError = page.getByText(
      'Your email or password is incorrect!'
    );

    this.logoutLink = page.getByRole('link', {
      name: /Logout/i
    });

    this.loggedInUser = page.getByText('Logged in as', {
      exact: false
    });
  }

  async open(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async logout(): Promise<void> {
    await this.logoutLink.click();
  }

  async submitWithMissingField(
    field: 'email' | 'password'
  ): Promise<void> {
    await this.emailInput.fill(
      field === 'email' ? '' : 'test@example.com'
    );

    await this.passwordInput.fill(
      field === 'password' ? '' : 'TestPassword123!'
    );

    await this.loginButton.click();
  }

  async verifyRequiredFieldValidation(): Promise<void> {
    const invalidEmail = await this.emailInput.evaluate(
      (element: HTMLInputElement) => !element.checkValidity()
    );

    const invalidPassword = await this.passwordInput.evaluate(
      (element: HTMLInputElement) => !element.checkValidity()
    );

    expect(invalidEmail || invalidPassword).toBe(true);

    await expect(this.page).toHaveURL(/\/login(?:[/?#]|$)/);
    await expect(this.logoutLink).toHaveCount(0);
  }
}
