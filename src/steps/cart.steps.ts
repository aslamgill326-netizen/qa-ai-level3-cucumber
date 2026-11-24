import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AppWorld } from '../support/world';
import { navigateWithRecovery } from '../utils/selfHealing';
import { verifySiteHealth } from '../utils/siteHealth';

const UI_TIMEOUT = 15000;

async function openCartAfterSingleAdd(world: AppWorld, quantity: number): Promise<void> {
  const modal = world.page.locator('#cartModal');
  const viewCart = modal.locator('a[href="/view_cart"]');
  let recovered = false;
  try {
    await expect(modal).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(viewCart).toBeVisible({ timeout: UI_TIMEOUT });
    await viewCart.click({ timeout: UI_TIMEOUT });
    await verifySiteHealth(world.page);
  } catch (error) {
    recovered = true;
    world.healingEvents.push({
      name: 'Cart state recovery', strategy: 'environment', candidate: 1,
      timestamp: new Date().toISOString(), status: 'attempted',
      message: `Checking cart without repeating Add to Cart: ${String(error)}`,
    });
    await navigateWithRecovery(world.page, '/view_cart', world.healingEvents);
  }
  await verifySiteHealth(world.page);
  await expect(world.page.locator('#cart_info_table')).toBeVisible({ timeout: UI_TIMEOUT });
  await expect(world.page.locator('#product-1')).toBeVisible({ timeout: UI_TIMEOUT });
  await expect(world.page.locator('#product-1 .cart_quantity button'))
    .toHaveText(String(quantity), { timeout: UI_TIMEOUT });
  if (recovered) {
    world.healingEvents.push({
      name: 'Cart state recovery', strategy: 'environment', candidate: 2,
      timestamp: new Date().toISOString(), status: 'recovered',
      message: 'Expected product and quantity verified; Add to Cart not repeated.',
    });
  }
}

async function addFirstProduct(world: AppWorld, quantity = 1): Promise<void> {
  await navigateWithRecovery(world.page, '/product_details/1', world.healingEvents);
  await verifySiteHealth(world.page);
  await expect(world.page.locator('.product-information h2')).toBeVisible({ timeout: UI_TIMEOUT });
  await world.page.locator('#quantity').fill(String(quantity));
  await world.page.locator('button.cart').click();
  await openCartAfterSingleAdd(world, quantity);
}

When('I add the first product to my cart', async function (this: AppWorld) {
  await addFirstProduct(this);
});

Then('the product should appear in my cart', async function (this: AppWorld) {
  await verifySiteHealth(this.page);
  await expect(this.page.locator('#product-1')).toBeVisible({ timeout: UI_TIMEOUT });
});

Given('I have added a product to my cart', async function (this: AppWorld) {
  await addFirstProduct(this);
});

When('I remove the product from my cart', async function (this: AppWorld) {
  await verifySiteHealth(this.page);
  await this.page.locator('#product-1 .cart_quantity_delete').click();
});

Then('the product should no longer appear in my cart', async function (this: AppWorld) {
  await verifySiteHealth(this.page);
  await expect(this.page.locator('#product-1')).toHaveCount(0, { timeout: UI_TIMEOUT });
});

Given("I am viewing a product's details", async function (this: AppWorld) {
  await navigateWithRecovery(this.page, '/product_details/1', this.healingEvents);
  await verifySiteHealth(this.page);
  await expect(this.page.locator('.product-information h2')).toBeVisible({ timeout: UI_TIMEOUT });
});

When('I add the product with quantity {int}', async function (this: AppWorld, quantity: number) {
  await verifySiteHealth(this.page);
  await this.page.locator('#quantity').fill(String(quantity));
  await this.page.locator('button.cart').click();
  await openCartAfterSingleAdd(this, quantity);
});

Then('the cart should show quantity {int} for that product', async function (this: AppWorld, quantity: number) {
  await verifySiteHealth(this.page);
  await expect(this.page.locator('#product-1 .cart_quantity button')).toHaveText(String(quantity), { timeout: UI_TIMEOUT });
});
