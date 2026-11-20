
import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import { AppWorld } from '../support/world';

Then(
  'the intentionally missing RCA element should be visible',
  async function (this: AppWorld) {
    await expect(
      this.page.locator('#rca-intentionally-missing-element')
    ).toBeVisible({ timeout: 3000 });
  }
);
