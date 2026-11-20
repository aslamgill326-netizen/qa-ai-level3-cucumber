import type { Locator, Page } from '@playwright/test';

export class ProductsPage {
  readonly heading: Locator;
  private readonly productCards: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /All Products/i });
    this.productCards = page.locator('.product-image-wrapper');
  }

  async open(): Promise<void> {
    await this.page.goto('/products');
  }

  async addProductToCart(productName: string): Promise<void> {
    const product = this.productCards.filter({ hasText: productName }).first();
    await product.getByRole('link', { name: /Add to cart/i }).first().click();
  }
}
