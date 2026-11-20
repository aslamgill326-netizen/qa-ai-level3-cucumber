import type { Locator, Page } from '@playwright/test';

export class CheckoutPage {
  readonly commentField: Locator;
  readonly placeOrderLink: Locator;

  constructor(private readonly page: Page) {
    this.commentField = page.locator('textarea[name="message"]');
    this.placeOrderLink = page.getByRole('link', { name: 'Place Order', exact: true });
  }

  async open(): Promise<void> {
    await this.page.goto('/checkout');
  }

  async addOrderComment(comment: string): Promise<void> {
    await this.commentField.fill(comment);
  }

  async placeOrder(): Promise<void> {
    await this.placeOrderLink.click();
  }
}
