import { waitForAccountState } from '../utils/accountState';
import { Given, When, Then } from '@cucumber/cucumber';
import { expect, type Locator } from '@playwright/test';

import { AppWorld } from '../support/world';
import { config } from '../utils/config';
import { verifySiteHealth } from '../utils/siteHealth';

import {
  navigateWithRecovery,
  resolveLocator,
  recoverInvalidLogin,
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
  return /ENVIRONMENT_UNAVAILABLE|queue full|under heavy load|HTTP (429|500|502|503|504|520|521|522|523|524)/i.test(
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
  await expect(world.loginPage.logoutLink).toHaveCount(0, {
    timeout: ASSERTION_TIMEOUT,
  });

  // The login form is stronger evidence than a navigation-header link.
  // Some healthy responses omit the header while still showing the login form.
  const loginForm = world.page.locator('form[action="/login"]');
  const loginEmail = world.loginPage.emailInput;
  const loginPassword = world.loginPage.passwordInput;
  const loginButton = world.loginPage.loginButton;
  const formVisible = await loginForm.isVisible().catch(() => false);
  if (formVisible) {
    await expect(loginEmail).toBeVisible({ timeout: ASSERTION_TIMEOUT });
    await expect(loginPassword).toBeVisible({ timeout: ASSERTION_TIMEOUT });
    await expect(loginButton).toBeVisible({ timeout: ASSERTION_TIMEOUT });
    return;
  }

  // If the form is absent, this is NOT a confirmed logged-out state.
  throw new Error(
    `LOGOUT_STATE_UNCONFIRMED: Logout link absent but login form not visible. ` +
    `Current URL: ${world.page.url()}`,
  );
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

async function submitInitialSignup(world: AppWorld): Promise<void> {
  await navigateWithRecovery(
    world.page, LOGIN_ROUTE, world.healingEvents, config.recovery
  );
  await expect(world.registerPage.signupButton).toBeVisible({ timeout: ASSERTION_TIMEOUT });

  // One submission only. A redirect, timeout or HTTP 503 is not proof of success.
  await world.registerPage.submitSignup(world.account.name, world.account.email);

  const form = world.registerPage.accountInformationHeading;
  try {
    await expect(form).toBeVisible({ timeout: 15000 });
    await verifySiteHealth(world.page);
    return;
  } catch (error) {
    // Do not navigate away from a submitted form: doing so loses the response evidence.
    const duplicate = world.page.getByText('Email Address already exist!');
    if (await visible(duplicate)) {
      throw new Error('SIGNUP_REJECTED: Newly generated email is already registered.');
    }
    const unhealthy = await environmentUnavailable(world);
    logRecovery(
      world.healingEvents, 'Initial signup confirmation', 'failed',
      `One signup submission; form missing. URL=${world.page.url()}; ` +
      `navigationStatus=${world.lastNavigationStatus ?? 'unknown'}; ` +
      `environmentUnavailable=${unhealthy}; error=${String(error)}`
    );
    throw new Error(
      `${unhealthy ? 'ENVIRONMENT_UNAVAILABLE' : 'REGISTRATION_STATE_UNKNOWN'}: ` +
      `Signup form not confirmed after one submission. ` +
      `URL=${world.page.url()}; HTTP=${world.lastNavigationStatus ?? 'unknown'}. ` +
      'The POST was not repeated.'
    );
  }
}


/**
 * Complete account creation once.
 *
 * On an unavailable confirmation page, recover
 * only after account creation is confirmed.
 */
async function completeRegistration(world: AppWorld): Promise<void> {
  await world.registerPage.completeAccountInformation(world.account);
async function completeRegistration(world: AppWorld): Promise<void> {
  await world.registerPage.completeAccountInformation(world.account);

  if (await visible(world.registerPage.accountCreatedHeading)) {
    world.accountCreated = true;
    world.accountCreated = true;
    return;
  }

  if (!await environmentUnavailable(world)) {
    await expect(world.registerPage.accountCreatedHeading)
      .toBeVisible({ timeout: ASSERTION_TIMEOUT });
  if (!await environmentUnavailable(world)) {
    await expect(world.registerPage.accountCreatedHeading)
      .toBeVisible({ timeout: ASSERTION_TIMEOUT });

    world.accountCreated = true;
    world.accountCreated = true;
    return;
  }

  logRecovery(
    world.healingEvents,
    'Account creation recovery',
    'attempted',
    'Checking account state after unavailable response.'
  );

  const state = await waitForAccountState(world.page, world.account.email);

  if (state === 'exists') {
    world.accountCreated = true;

  if (state === 'exists') {
    world.accountCreated = true;

    logRecovery(
      world.healingEvents,
      'Account creation recovery',
      'recovered',
      'Account existence confirmed through API.'
      'recovered',
      'Account existence confirmed through API.'
    );

    return;
  }

  throw new Error(
    `REGISTRATION_STATE_${state.toUpperCase()}: ` +
    'Account creation could not be confirmed after submission.'
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
async function continueAfterRegistration(world: AppWorld): Promise<void> {
  if (!world.accountCreated) {
    throw new Error('REGISTRATION_STATE_UNKNOWN: Account creation not confirmed.');
  }

  try {
    await verifySiteHealth(world.page);
    if (await visible(world.registerPage.continueButton)) {
      await world.registerPage.continueAfterAccountCreated();
    } else if (await visible(world.loginPage.loggedInUser)) {
      await navigateWithRecovery(world.page, HOME_ROUTE, world.healingEvents);
    } else {
      throw new Error('REGISTRATION_CONTINUE_MISSING: Healthy page has no Continue link.');
    }
    await verifySiteHealth(world.page);
  } catch (error) {
    if (!isEnvironmentFailure(error) && !(await environmentUnavailable(world))) {
      throw error;
    }
    logRecovery(world.healingEvents, 'Registration homepage recovery', 'attempted',
      'Account confirmed; restoring homepage without repeating registration.');
    await navigateWithRecovery(world.page, HOME_ROUTE, world.healingEvents);
    await verifySignedIn(world);
    logRecovery(world.healingEvents, 'Registration homepage recovery', 'recovered',
      'Authenticated user verified.');
  }
  await expect(world.page).toHaveURL(new URL(HOME_ROUTE, world.baseURL).toString(), {
    timeout: ASSERTION_TIMEOUT,
  });
  await verifySignedIn(world);
}

/**
 * Logout only once.
 *
 * A failed navigation after clicking logout does
 * not automatically trigger another logout click.
 */


async function logoutSafely(world: AppWorld): Promise<void> {
  const page = world.page;
  await verifySiteHealth(page);

  // Given "I am logged out" must also work when the browser is already logged out.
  if (!(await world.loginPage.logoutLink.isVisible().catch(() => false))) {
    try {
      await verifyLoggedOut(world);
      return;
    } catch {
      await navigateWithRecovery(page, LOGIN_ROUTE, world.healingEvents, config.recovery);
      await verifyLoggedOut(world);
      return;
    }
  }

  const logout = await resolveLocator(
    page,
    page,
    'logout-link',
    [world.loginPage.logoutLink, page.locator('a[href="/logout"]')],
    world.healingEvents,
  );
  await logout.click({ timeout: 15000, noWaitAfter: true });

  // Never replay the state-changing logout click. Restore the read-only login
  // page if the response or header is incomplete, then assert actual form state.
  try {
    await verifyLoggedOut(world);
  } catch (error) {
    logRecovery(world.healingEvents, 'Logout confirmation recovery', 'attempted',
      `Checking login form after logout: ${String(error)}`);
    await navigateWithRecovery(page, LOGIN_ROUTE, world.healingEvents, config.recovery);
    await verifyLoggedOut(world);
    logRecovery(world.healingEvents, 'Logout confirmation recovery', 'recovered',
      'Login form visible and logout link absent after safe navigation.');
  }
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
    try {
      await this.loginPage.login(this.account.email, this.account.password);
      await verifySiteHealth(this.page);
    } catch (error) {
      if (!isEnvironmentFailure(error) && !(await environmentUnavailable(this))) {
        throw error;
      }
      logRecovery(this.healingEvents, 'Valid login recovery', 'attempted',
        'Restoring homepage after unavailable login response.');
      await navigateWithRecovery(this.page, HOME_ROUTE, this.healingEvents);
      // Retry authentication only if the healthy login page confirms no session.
      if (!(await visible(this.loginPage.loggedInUser))) {
        await navigateWithRecovery(this.page, LOGIN_ROUTE, this.healingEvents);
        await verifyLoggedOut(this);
        await this.loginPage.login(this.account.email, this.account.password);
        if (await environmentUnavailable(this)) {
          await navigateWithRecovery(this.page, HOME_ROUTE, this.healingEvents);
        }
      }
      await verifySignedIn(this);
      logRecovery(this.healingEvents, 'Valid login recovery', 'recovered',
        'Expected authenticated user verified.');
    }
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
