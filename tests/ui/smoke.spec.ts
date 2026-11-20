import { expect, test } from '../../src/fixtures/test';

test('@P1 @smoke home page exposes primary navigation', async ({ homePage, page }) => {
  await homePage.open();

  await expect(page).toHaveTitle(/Automation Exercise/);
  await expect(homePage.productsLink).toBeVisible();
  await expect(homePage.cartLink).toBeVisible();
  await expect(homePage.signupLoginLink).toBeVisible();
});
