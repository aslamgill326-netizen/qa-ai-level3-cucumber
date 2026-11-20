
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AppWorld } from '../support/world';
import { navigateWithRecovery } from '../utils/selfHealing';

async function addFirstProduct(world: AppWorld, quantity = 1) {
  await navigateWithRecovery(world.page, '/product_details/1', world.healingEvents);
  await expect(world.page.locator('.product-information h2')).toBeVisible();

  await world.page.locator('#quantity').fill(String(quantity));
  await world.page.locator('button.cart').click();

  await expect(world.page.locator('#cartModal')).toBeVisible();
  await world.page.locator('#cartModal a[href="/view_cart"]').click();

  await expect(world.page.locator('#cart_info_table')).toBeVisible();
}

When('I add the first product to my cart', async function(this: AppWorld) {
  await addFirstProduct(this);
});

Then('the product should appear in my cart', async function(this: AppWorld) {
  await expect(this.page.locator('#product-1')).toBeVisible();
});

Given('I have added a product to my cart', async function(this: AppWorld) {
  await addFirstProduct(this);
});

When('I remove the product from my cart', async function(this: AppWorld) {
  await this.page.locator('#product-1 .cart_quantity_delete').click();
});

Then('the product should no longer appear in my cart', async function(this: AppWorld) {
  await expect(this.page.locator('#product-1')).toHaveCount(0);
});

Given("I am viewing a product's details", async function(this: AppWorld) {
  await navigateWithRecovery(this.page, '/product_details/1', this.healingEvents);
  await expect(this.page.locator('.product-information h2')).toBeVisible();
});

When('I add the product with quantity {int}', async function(this: AppWorld, quantity: number) {
  await this.page.locator('#quantity').fill(String(quantity));
  await this.page.locator('button.cart').click();
  await expect(this.page.locator('#cartModal')).toBeVisible();
  await this.page.locator('#cartModal a[href="/view_cart"]').click();
});

Then('the cart should show quantity {int} for that product', async function(this: AppWorld, quantity: number) {
  await expect(this.page.locator('#product-1 .cart_quantity button')).toHaveText(String(quantity));
});
