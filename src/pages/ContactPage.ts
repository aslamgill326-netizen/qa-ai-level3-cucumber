
import { expect, type Page } from '@playwright/test';
import {
  navigateWithRecovery,
  type HealingEvent
} from '../utils/selfHealing';

export class ContactPage {
  constructor(private readonly page: Page) {}

  async open(events: HealingEvent[]): Promise<void> {
    await navigateWithRecovery(
      this.page,
      '/contact_us',
      events
    );

    await expect(
      this.page.getByText('GET IN TOUCH')
    ).toBeVisible();
  }

  async submit(name: string, email: string): Promise<void> {
    await this.page.locator('[data-qa="name"]').fill(name);
    await this.page.locator('[data-qa="email"]').fill(email);
    await this.page.locator('[data-qa="subject"]').fill(
      'QA Automation Test'
    );

    await this.page.locator('[data-qa="message"]').fill(
      'Automated contact form test.'
    );

    this.page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await this.page.locator(
      '[data-qa="submit-button"]'
    ).click();
  }

  async verifySuccess(): Promise<void> {
    await expect(
      this.page.locator('#contact-page .status.alert-success')
    ).toContainText(
      'Success! Your details have been submitted successfully.'
    );
  }
}
