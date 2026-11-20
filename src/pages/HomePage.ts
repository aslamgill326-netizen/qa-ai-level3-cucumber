import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly productsLink: Locator;
  readonly cartLink: Locator;
  readonly signupLoginLink: Locator;

  constructor(private readonly page: Page) {
    this.productsLink = page.getByRole('link', { name: /Products/ });
    this.cartLink = page.getByRole('link', { name: /Cart/ });
    this.signupLoginLink = page.getByRole('link', { name: /Signup \/ Login/ });
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  async openProducts(): Promise<void> {
    await this.productsLink.click();
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }

  async openSignupLogin(): Promise<void> {
    await this.signupLoginLink.click();
  }
}
