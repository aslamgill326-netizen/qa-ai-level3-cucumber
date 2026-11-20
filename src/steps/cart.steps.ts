
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AppWorld } from '../support/world';
import { navigateWithRecovery } from '../utils/selfHealing';
import { verifySiteHealth } from '../utils/siteHealth';

const TIMEOUT = 10000;
const CART_URL = /\/view_cart(?:[/?#]|$)/;


async function openCart(world: AppWorld): Promise<void> {
  const page = world.page;
  const modal = page.locator('#cartModal');
  const cart = page.locator('#cart_info_table');
  const product = page.locator('#product-1');

  const modalVisible = await modal
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (modalVisible) {
    await modal.locator('a[href="/view_cart"]').click();
  } else {
    await verifySiteHealth(page);
    await navigateWithRecovery(page, '/view_cart', world.healingEvents);
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    const cartVisible = await cart.isVisible().catch(() => false);

    if (cartVisible) {
      await verifySiteHealth(page);
      await expect(product).toBeVisible({ timeout: 10000 });
      return;
    }

    if (attempt === 3) break;

    // Recover navigation only; never repeat Add to Cart.
    await navigateWithRecovery(
      page,
      '/view_cart',
      world.healingEvents
    );
  }

  await verifySiteHealth(page);

  throw new Error(
    `CART_STATE_UNCONFIRMED: Cart table not found at ${page.url()}. ` +
    'Add to Cart was not repeated.'
  );
}

async function addFirstProduct(world: AppWorld, quantity = 1) {
  await navigateWithRecovery(world.page, '/product_details/1', world.healingEvents);
  await expect(world.page.locator('.product-information h2')).toBeVisible({ timeout: TIMEOUT });
  await world.page.locator('#quantity').fill(String(quantity));
  await world.page.locator('button.cart').click();
  await openCart(world);
}

When('I add the first product to my cart', async function (this: AppWorld) {
  await addFirstProduct(this);
});

Then('the product should appear in my cart', async function (this: AppWorld) {
  await verifySiteHealth(this.page);
  await expect(this.page.locator('#product-1')).toBeVisible({ timeout: TIMEOUT });
});

Given('I have added a product to my cart', async function (this: AppWorld) {
  await addFirstProduct(this);
});

When('I remove the product from my cart', async function (this: AppWorld) {
  await this.page.locator('#product-1 .cart_quantity_delete').click();
});

Then('the product should no longer appear in my cart', async function (this: AppWorld) {
  await verifySiteHealth(this.page);
  await expect(this.page.locator('#product-1')).toHaveCount(0, { timeout: TIMEOUT });
});

Given("I am viewing a product's details", async function (this: AppWorld) {
  await navigateWithRecovery(this.page, '/product_details/1', this.healingEvents);
  await expect(this.page.locator('.product-information h2')).toBeVisible({ timeout: TIMEOUT });
});

When('I add the product with quantity {int}', async function (this: AppWorld, quantity: number) {
  await this.page.locator('#quantity').fill(String(quantity));
  await this.page.locator('button.cart').click();
  await openCart(this);
});

Then('the cart should show quantity {int} for that product', async function (this: AppWorld, quantity: number) {
  await verifySiteHealth(this.page);
  await expect(this.page.locator('#product-1 .cart_quantity button')).toHaveText(String(quantity), { timeout: TIMEOUT });
});
