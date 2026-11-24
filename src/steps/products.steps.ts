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

  await verifySiteHealth(this.page);
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
  await verifySiteHealth(this.page);
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

// Scenario-local expected destination and product identity.
const expectedDetails = new WeakMap<AppWorld, { url: string; name: string }>();

When('I open the details of the first product', async function (this: AppWorld) {
  await verifySiteHealth(this.page);
  const link = this.page.locator('a[href^="/product_details/"]').first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  if (!href || !/^\/product_details\/\d+$/.test(href)) {
    throw new Error('PRODUCT_LINK_INVALID: Expected a product details link.');
  }
  const name = (await link.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " product-image-wrapper ")][1]').locator('.productinfo p').first().innerText({ timeout: 5000 })).trim();
  if (!name) throw new Error('PRODUCT_NAME_MISSING: Product card has no name.');
  const url = new URL(href, this.baseURL).toString();
  expectedDetails.set(this, { url, name });
  try {
    await link.click({ timeout: 15000 });
    await this.page.waitForURL(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
  } catch (error) {
    if (!/net::ERR_(CONNECTION_RESET|CONNECTION_CLOSED|CONNECTION_TIMED_OUT|TIMED_OUT|NETWORK_CHANGED|EMPTY_RESPONSE)|ECONNRESET/i.test(String(error))) throw error;
    await navigateWithRecovery(this.page, url, this.healingEvents);
  }
});

Then('I should see its name price and availability', async function (this: AppWorld) {
  const expected = expectedDetails.get(this);
  if (!expected) throw new Error('PRODUCT_STATE_UNKNOWN: No selected product recorded.');
  const productInfo = this.page.locator('.product-information');
  const heading = productInfo.locator('h2');
  try {
    await verifySiteHealth(this.page);
    await expect(heading).toBeVisible({ timeout: 20000 });
  } catch (error) {
    let healthError: unknown;
    try { await verifySiteHealth(this.page); } catch (failure) { healthError = failure; }
    const status = this.lastNavigationStatus;
    if (!/ENVIRONMENT_UNAVAILABLE/i.test(String(error)) &&
        !/ENVIRONMENT_UNAVAILABLE/i.test(String(healthError)) &&
        !(status !== null && [429, 500, 502, 503, 504, 520, 521, 522, 523, 524].includes(status))) {
      throw error;
    }
    await navigateWithRecovery(this.page, expected.url, this.healingEvents, {
      maxAttempts: 2, initialDelayMs: 1000, timeoutMs: 10000,
    });
  }
  await verifySiteHealth(this.page);
  await expect(this.page).toHaveURL(expected.url);
  await expect(heading).toBeVisible({ timeout: 10000 });
  await expect(heading).toHaveText(expected.name, { timeout: 5000 });
  await expect(productInfo.getByText(/Rs\.\s*\d+/)).toBeVisible({ timeout: 5000 });
  await expect(productInfo.getByText(/Availability:/i)).toBeVisible({ timeout: 5000 });
});


// --------------------------------------------------
// NEW UI TEST 1: EMPTY SEARCH
// --------------------------------------------------

When('I search for a product with an empty keyword', async function (
  this: AppWorld
) {
  await verifySiteHealth(this.page);
  await this.page.locator('#search_product').fill('');
  await this.page.locator('#submit_search').click();
});


Then(
  'the empty search should be handled correctly',
  async function (this: AppWorld) {
    const searchInput = this.page.locator('#search_product');

    // Distinguish an overloaded server page from a missing locator.
    await verifySiteHealth(this.page);
    await expect(searchInput).toHaveValue('', { timeout: 10000 });

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
