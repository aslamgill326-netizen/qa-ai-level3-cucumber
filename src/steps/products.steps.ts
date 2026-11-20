
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import { AppWorld } from '../support/world';
import { navigateWithRecovery } from '../utils/selfHealing';

// --------------------------------------------------
// PRODUCTS PAGE
// --------------------------------------------------

Given('I am on the products page', async function (this: AppWorld) {
  await navigateWithRecovery(
    this.page,
    '/products',
    this.healingEvents
  );

  await expect(
    this.page.locator('.features_items .product-image-wrapper').first()
  ).toBeVisible();
});

Then('I should see the available products', async function (this: AppWorld) {
  expect(
    await this.page.locator(
      '.features_items .product-image-wrapper'
    ).count()
  ).toBeGreaterThan(0);
});

// --------------------------------------------------
// SEARCH PRODUCTS
// --------------------------------------------------

When('I search for product {string}', async function (
  this: AppWorld,
  name: string
) {
  await this.page.locator('#search_product').fill(name);
  await this.page.locator('#submit_search').click();
});

Then('I should see matching search results for {string}', async function (
  this: AppWorld,
  name: string
) {
  await expect(
    this.page.getByText('SEARCHED PRODUCTS')
  ).toBeVisible();

  await expect(
    this.page
      .locator('.features_items .productinfo p')
      .filter({ hasText: name })
      .first()
  ).toBeVisible();
});

Then('no matching products should be displayed', async function (
  this: AppWorld
) {
  await expect(
    this.page.getByText('SEARCHED PRODUCTS')
  ).toBeVisible();

  await expect(
    this.page.locator('.features_items .product-image-wrapper')
  ).toHaveCount(0);
});

// --------------------------------------------------
// PRODUCT DETAILS
// --------------------------------------------------

When('I open the details of the first product', async function (
  this: AppWorld
) {
  await this.page
    .locator('a[href^="/product_details/"]')
    .first()
    .click();
});

Then('I should see its name price and availability', async function (
  this: AppWorld
) {
  await expect(
    this.page.locator('.product-information h2')
  ).toBeVisible();

  await expect(
    this.page
      .locator('.product-information')
      .getByText(/Rs\./)
  ).toBeVisible();

  await expect(
    this.page
      .locator('.product-information')
      .getByText(/Availability:/)
  ).toBeVisible();
});

// --------------------------------------------------
// NEW UI TEST 1: EMPTY SEARCH
// --------------------------------------------------

When('I search for a product with an empty keyword', async function (
  this: AppWorld
) {
  await this.page.locator('#search_product').fill('');
  await this.page.locator('#submit_search').click();
});


Then(
  'the empty search should be handled correctly',
  async function (this: AppWorld) {
    const searchInput = this.page.locator('#search_product');

    // Empty input should remain empty.
    await expect(searchInput).toHaveValue('');

    // The application should remain on a valid products page.
    await expect(this.page).toHaveURL(
      /\/products(?:\?.*)?$/
    );

    // The search form should remain available.
    await expect(
      this.page.locator('#submit_search')
    ).toBeVisible();
  }
);


// --------------------------------------------------
// NEW UI TEST 2: BACK NAVIGATION
// --------------------------------------------------

When('I navigate back to the products page', async function (
  this: AppWorld
) {
  await this.page.goBack();

  await expect(
    this.page
  ).toHaveURL(/\/products(?:\?.*)?$/);
});
