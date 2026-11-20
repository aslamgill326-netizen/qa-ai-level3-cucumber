import { getAccountState } from '../utils/accountState';
import { Given, When, Then } from '@cucumber/cucumber';
import { expect, type Locator } from '@playwright/test';

import { AppWorld } from '../support/world';
import { config } from '../utils/config';
import { verifySiteHealth } from '../utils/siteHealth';

import {
  navigateWithRecovery,
  resolveLocator,
  recoverInvalidLogin,
  recoverRegistrationNavigation,
  type HealingEvent,
} from '../utils/selfHealing';

// =====================================================
// CONFIGURATION
// =====================================================

const ASSERTION_TIMEOUT = config.timeouts.assertion;

const INVALID_EMAIL = 'invalid-user@example.test';
const INVALID_PASSWORD = 'IncorrectPassword123!';

const LOGIN_ROUTE = config.routes.login;
const HOME_ROUTE = config.routes.home;

// =====================================================
// COMMON HELPERS
// =====================================================

function isEnvironmentFailure(error: unknown): boolean {
  return /ENVIRONMENT_UNAVAILABLE|queue full|under heavy load|HTTP 503/i.test(
    String(error),
  );
}

function logRecovery(
  events: HealingEvent[],
  name: string,
  status: 'attempted' | 'recovered' | 'failed',
  message: string,
): void {
  events.push({
    name,
    strategy: 'environment',
    candidate: events.filter((event) => event.name === name).length + 1,
    timestamp: new Date().toISOString(),
    status,
    message,
  });
}

async function visible(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => false);
}

/**
 * Confirm the expected user is signed in.
 * This checks application state, not only page health.
 */
async function verifySignedIn(world: AppWorld): Promise<void> {
  await verifySiteHealth(world.page);

  const user = await resolveLocator(
    world.page,
    'logged-in-user',
    [
      world.loginPage.loggedInUser,
      world.page.locator('a').filter({
        hasText: /Logged in as/i,
      }),
    ],
    world.healingEvents,
  );

  await expect(user).toContainText(world.account.name, {
    timeout: ASSERTION_TIMEOUT,
  });
}

/**
 * Confirm logout using the expected login-page UI.
 */


async function verifyLoggedOut(world: AppWorld): Promise<void> {
  await verifySiteHealth(world.page);

  await expect(
    world.loginPage.logoutLink
  ).toHaveCount(0, { timeout: ASSERTION_TIMEOUT });

  const loginLink = world.page.locator('a[href="/login"]');
  await expect(loginLink).toBeVisible({ timeout: ASSERTION_TIMEOUT });
}



/**
 * Detect an environment error without suppressing
 * unrelated application failures.
 */
async function environmentUnavailable(
  world: AppWorld,
): Promise<boolean> {
  try {
    await verifySiteHealth(world.page);
    return false;
  } catch (error) {
    if (!isEnvironmentFailure(error)) {
      throw error;
    }
    return true;
  }
}

/**
 * Registration first stage.
 *
 * Submit the name/email only once.
 * If a queue-full page appears, do not blindly
 * repeat the submission.
 */

async function submitInitialSignup(world: AppWorld): Promise<void> {
  await navigateWithRecovery(
    world.page,
    LOGIN_ROUTE,
    world.healingEvents,
    config.recovery
  );

  await world.registerPage.submitSignup(
    world.account.name,
    world.account.email
  );

  const heading = world.registerPage.accountInformationHeading;

  if (await visible(heading)) return;

  if (await environmentUnavailable(world)) {
    logRecovery(
      world.healingEvents,
      'Initial signup recovery',
      'attempted',
      'Checking signup state without repeating submission.'
    );

    await navigateWithRecovery(
      world.page,
      LOGIN_ROUTE,
      world.healingEvents,
      config.recovery
    );

    if (await visible(heading)) return;

    logRecovery(
      world.healingEvents,
      'Initial signup recovery',
      'failed',
      'Signup state could not be confirmed.'
    );

    throw new Error(
      'REGISTRATION_STATE_UNKNOWN: Signup response unavailable. ' +
      'Submission was not repeated to prevent duplicate operations.'
    );
  }

  await expect(heading).toBeVisible({
    timeout: ASSERTION_TIMEOUT
  });
}


/**
 * Complete account creation once.
 *
 * On an unavailable confirmation page, recover
 * only after account creation is confirmed.
 */
async function completeRegistration(world: AppWorld): Promise<void> {
  await world.registerPage.completeAccountInformation(world.account);

  if (await visible(world.registerPage.accountCreatedHeading)) {
    world.accountCreated = true;
    return;
  }

  if (!await environmentUnavailable(world)) {
    await expect(world.registerPage.accountCreatedHeading)
      .toBeVisible({ timeout: ASSERTION_TIMEOUT });

    world.accountCreated = true;
    return;
  }

  logRecovery(
    world.healingEvents,
    'Account creation recovery',
    'attempted',
    'Checking account state after unavailable response.'
  );

  const state = await getAccountState(world.page, world.account.email);

  if (state === 'exists') {
    world.accountCreated = true;

    logRecovery(
      world.healingEvents,
      'Account creation recovery',
      'recovered',
      'Account existence confirmed through API.'
    );

    return;
  }

  throw new Error(
    `REGISTRATION_STATE_${state.toUpperCase()}: ` +
    'Account creation could not be confirmed after submission.'
  );
}

/**
 * Continue from the account-created confirmation
 * to the authenticated homepage.
 */
async function continueAfterRegistration(
  world: AppWorld,
): Promise<void> {
  try {
    await world.registerPage.continueAfterAccountCreated();

    await verifySiteHealth(world.page);

    await expect(world.page).toHaveURL(
      new URL(HOME_ROUTE, world.baseURL).toString(),
      { timeout: ASSERTION_TIMEOUT },
    );

    await verifySignedIn(world);
  } catch (error) {
    if (!isEnvironmentFailure(error)) {
      throw error;
    }

    logRecovery(
      world.healingEvents,
      'Registration homepage recovery',
      'attempted',
      'Environment unavailable after account-created confirmation.',
    );

    if (!world.accountCreated) {
      throw new Error(
        'REGISTRATION_STATE_UNKNOWN: Cannot recover the ' +
          'homepage because account creation is unconfirmed.',
      );
    }

    await recoverRegistrationNavigation(
      world.page,
      world.accountCreated,
      world.loginPage.loggedInUser,
      world.account.name,
      world.healingEvents,
    );

    await expect(world.page).toHaveURL(
      new URL(HOME_ROUTE, world.baseURL).toString(),
      { timeout: ASSERTION_TIMEOUT },
    );

    logRecovery(
      world.healingEvents,
      'Registration homepage recovery',
      'recovered',
      'Homepage restored and authenticated user verified.',
    );
  }
}

/**
 * Logout only once.
 *
 * A failed navigation after clicking logout does
 * not automatically trigger another logout click.
 */

async function logoutSafely(world: AppWorld): Promise<void> {
  const page = world.page;

  const logout = await resolveLocator(
    page,
    'logout-link',
    [world.loginPage.logoutLink, page.locator('a[href="/logout"]')],
    world.healingEvents
  );

  await logout.click({ timeout: 15000, noWaitAfter: true });

  try {
    await expect(page.locator('a[href="/logout"]')).toHaveCount(0, {
      timeout: 10000
    });
  } catch {
    if (await environmentUnavailable(world)) {
      logRecovery(
        world.healingEvents,
        'Logout navigation recovery',
        'attempted',
        'Recovering page after logout.'
      );

      await navigateWithRecovery(
        page,
        LOGIN_ROUTE,
        world.healingEvents,
        config.recovery
      );
    } else {
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
  }

  await verifyLoggedOut(world);
}

// =====================================================
// APPLICATION AVAILABILITY
// =====================================================

Given(
  'the Automation Exercise application is available',
  async function (this: AppWorld) {
    await navigateWithRecovery(
      this.page,
      LOGIN_ROUTE,
      this.healingEvents,
      config.recovery,
    );

    await expect(
      this.registerPage.signupButton,
    ).toBeVisible({ timeout: ASSERTION_TIMEOUT });
  },
);

// =====================================================
// REGISTER NEW ACCOUNT
// =====================================================

Given(
  'I have registered a disposable user account',
  async function (this: AppWorld) {
    await submitInitialSignup(this);
    await completeRegistration(this);
    await continueAfterRegistration(this);
  },
);

// =====================================================
// VERIFY REGISTERED USER
// =====================================================

Then(
  'I should see the registered account signed in',
  async function (this: AppWorld) {
    await verifySignedIn(this);
  },
);

// =====================================================
// LOGOUT
// =====================================================

When('I log out', async function (this: AppWorld) {
  await logoutSafely(this);
});

Given(
  'I am logged out',
  async function (this: AppWorld) {
    await logoutSafely(this);
  },
);

// =====================================================
// VALID LOGIN
// =====================================================

When(
  'I log in using valid credentials',
  async function (this: AppWorld) {
    await this.loginPage.login(
      this.account.email,
      this.account.password,
    );

    await verifySiteHealth(this.page);
  },
);

Then(
  'I should be logged in successfully',
  async function (this: AppWorld) {
    await verifySignedIn(this);
  },
);

// =====================================================
// INVALID LOGIN
// =====================================================

When(
  'I log in using invalid credentials',
  async function (this: AppWorld) {
    const performLogin = async (): Promise<void> => {
      await this.loginPage.login(
        INVALID_EMAIL,
        INVALID_PASSWORD,
      );
    };

    await performLogin();

    await recoverInvalidLogin(
      this.page,
      this.loginPage.loginError,
      performLogin,
      this.healingEvents,
    );
  },
);

Then(
  'I should see an invalid credentials error',
  async function (this: AppWorld) {
    await verifySiteHealth(this.page);

    await expect(
      this.loginPage.loginError,
    ).toBeVisible({ timeout: ASSERTION_TIMEOUT });
  },
);

Then(
  'I should remain logged out',
  async function (this: AppWorld) {
    await verifySiteHealth(this.page);

    await expect(
      this.loginPage.logoutLink,
    ).toHaveCount(0);
  },
);

// =====================================================
// VERIFY LOGOUT REDIRECTION
// =====================================================

Then(
  'I should be redirected to the login page',
  async function (this: AppWorld) {
    await verifyLoggedOut(this);
  },
);

// =====================================================
// DUPLICATE REGISTRATION
// =====================================================

When(
  'I attempt registration again with the same email',
  async function (this: AppWorld) {
    await navigateWithRecovery(
      this.page,
      LOGIN_ROUTE,
      this.healingEvents,
      config.recovery,
    );

    // Submit once. Never blindly repeat a
    // state-changing registration request.
    await this.registerPage.submitSignup(
      this.account.name,
      this.account.email,
    );

    await verifySiteHealth(this.page);
  },
);

Then(
  'I should see a duplicate email error',
  async function (this: AppWorld) {
    await verifySiteHealth(this.page);

    await expect(
      this.page.getByText('Email Address already exist!'),
    ).toBeVisible({ timeout: ASSERTION_TIMEOUT });

    await expect(
      this.registerPage.accountInformationHeading,
    ).toHaveCount(0);
  },
);
