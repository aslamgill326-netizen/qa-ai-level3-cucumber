
import {
  World,
  setWorldConstructor,
  type IWorldOptions,
} from '@cucumber/cucumber';

import {
  chromium,
  request,
  type Browser,
  type BrowserContext,
  type Page,
  type APIRequestContext,
} from '@playwright/test';

import fs from 'node:fs';
import path from 'node:path';

import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';

import {
  createDisposableTestAccount,
  type DisposableTestAccount,
} from '../utils/testData';

import {
  navigateWithRecovery,
  type HealingEvent,
} from '../utils/selfHealing';

import { config } from '../utils/config';

export class AppWorld extends World {
  // ==================================================
  // BROWSER AND API
  // ==================================================

  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  api!: APIRequestContext;

  // ==================================================
  // PAGE OBJECTS
  // ==================================================

  loginPage!: LoginPage;
  registerPage!: RegisterPage;

  // ==================================================
  // TEST DATA
  // ==================================================

  account: DisposableTestAccount =
    createDisposableTestAccount();

  accountCreated = false;

  apiBody: unknown;

  // ==================================================
  // SELF-HEALING
  // ==================================================

  healingEvents: HealingEvent[] = [];

  lastNavigationStatus: number | null = null;

  // ==================================================
  // EVIDENCE AND REPORTING
  // ==================================================

  scenarioId = '';

  videoPath: string | null = null;
  tracePath: string | null = null;

  readonly evidenceRoot = path.resolve(
    'reports',
    'cucumber',
  );

  // ==================================================
  // APPLICATION CONFIGURATION
  // ==================================================

  baseURL = config.baseURL;

  constructor(options: IWorldOptions) {
    super(options);
  }

  // ==================================================
  // INITIALIZE SCENARIO
  // ==================================================

  async start(): Promise<void> {
    const worldParameters = this.parameters as {
      baseURL?: string;
    };

    this.baseURL =
      worldParameters.baseURL?.trim() ||
      config.baseURL;

    this.prepareEvidenceDirectories();

    // ----------------------------------------------
    // LAUNCH BROWSER
    // ----------------------------------------------

    this.browser = await chromium.launch({
      headless: process.env.HEADED !== '1',

      // Slow down actions only when requested.
      slowMo:
        process.env.HEADED === '1'
          ? 100
          : 0,
    });

    // ----------------------------------------------
    // CREATE BROWSER CONTEXT
    // ----------------------------------------------

    this.context = await this.browser.newContext({
      baseURL: this.baseURL,

      viewport: {
        width: 1440,
        height: 900,
      },

      recordVideo: {
        dir: path.join(
          this.evidenceRoot,
          'videos',
        ),

        size: {
          width: 1440,
          height: 900,
        },
      },
    });

    // ----------------------------------------------
    // ENABLE PLAYWRIGHT TRACING
    // ----------------------------------------------

    await this.context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    // ----------------------------------------------
    // CREATE PAGE
    // ----------------------------------------------

    this.page = await this.context.newPage();

    // Register monitoring before navigation.
    this.registerResponseMonitoring();

    // ----------------------------------------------
    // INITIALIZE API CONTEXT
    // ----------------------------------------------

    this.api = await request.newContext({
      baseURL: this.baseURL,
    });

    // ----------------------------------------------
    // INITIALIZE PAGE OBJECTS
    // ----------------------------------------------

    this.loginPage = new LoginPage(this.page);
    this.registerPage = new RegisterPage(this.page);

    // ----------------------------------------------
    // OPEN APPLICATION DIRECTLY
    // ----------------------------------------------

    // Navigate immediately instead of leaving the
    // browser on about:blank.
    //
    // HTTP 503 recovery is handled automatically
    // for this safe GET navigation.
    //
    // Only one page is created. Recovery reuses it.

    await navigateWithRecovery(
      this.page,
      this.baseURL,
      this.healingEvents,
      {
        maxAttempts: 3,
        initialDelayMs: 2000,
        maxDelayMs: 10000,
        timeoutMs: 30000,
      },
    );

    console.log(
      `[WORLD] Application opened: ${this.page.url()}`,
    );
  }

  // ==================================================
  // EVIDENCE DIRECTORY SETUP
  // ==================================================

  private prepareEvidenceDirectories(): void {
    const folders = [
      'screenshots',
      'videos',
      'traces',
    ];

    for (const folder of folders) {
      fs.mkdirSync(
        path.join(
          this.evidenceRoot,
          folder,
        ),
        {
          recursive: true,
        },
      );
    }
  }

  // ==================================================
  // RESPONSE MONITORING
  // ==================================================

  private registerResponseMonitoring(): void {
    this.page.on('response', (response) => {
      const req = response.request();

      // --------------------------------------------
      // MAIN FRAME NAVIGATION STATUS
      // --------------------------------------------

      try {
        if (
          req.isNavigationRequest() &&
          response.frame() ===
            this.page.mainFrame()
        ) {
          this.lastNavigationStatus =
            response.status();
        }
      } catch {
        // Ignore detached frames.
      }

      // --------------------------------------------
      // DETECT SUCCESSFUL ACCOUNT CREATION
      // --------------------------------------------

      try {
        const pathname = new URL(
          response.url(),
        ).pathname;

        if (
          req.method() === 'POST' &&
          pathname === '/signup' &&
          (req.postData() ?? '').includes(
            'form_type=create_account',
          ) &&
          response.status() === 302
        ) {
          this.accountCreated = true;
        }
      } catch {
        // Ignore unexpected response URLs.
      }
    });
  }
}

setWorldConstructor(AppWorld);
