import { verifySiteHealth } from '../utils/siteHealth';
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
  this: AppWorld, name: string
) {
  const heading = this.page.getByText('SEARCHED PRODUCTS');
  try {
    await verifySiteHealth(this.page);
    await expect(heading).toBeVisible({ timeout: 10000 });
  } catch (error) {
    // A search result URL is a safe GET to retry. Never resubmit the search POST.
    const url = new URL(this.page.url());
    if (url.pathname !== '/products' || url.searchParams.get('search') !== name) {
      throw error;
    }
    await navigateWithRecovery(
      this.page, url.pathname + url.search, this.healingEvents
    );
    await expect(heading).toBeVisible({ timeout: 10000 });
  }
  await verifySiteHealth(this.page);
  await expect(
    this.page.locator('.features_items .productinfo p')
      .filter({ hasText: name }).first()
  ).toBeVisible({ timeout: 15000 });
});


Then('no matching products should be displayed', async function (
  this: AppWorld
) {
  const heading = this.page.getByText('SEARCHED PRODUCTS');

  try {
    await expect(heading).toBeVisible({ timeout: 10000 });
  } catch (error) {
    await verifySiteHealth(this.page);
    throw error;
  }

  await expect(
    this.page.locator('.features_items .product-image-wrapper')
  ).toHaveCount(0, { timeout: 10000 });
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
  const productInfo = this.page.locator('.product-information');

  // Wait for the product details to load.
  await expect(
    productInfo.locator('h2')
  ).toBeVisible({ timeout: 20000 });

  // Verify the product price.
  await expect(
    productInfo.getByText(/Rs\.\s*\d+/)
  ).toBeVisible({ timeout: 15000 });

  // Verify product availability.
  await expect(
    productInfo.getByText(/Availability:/i)
  ).toBeVisible({ timeout: 15000 });
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
