import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import { chromium, request, type Browser, type BrowserContext, type Page, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { createDisposableTestAccount, type DisposableTestAccount } from '../utils/testData';
import { navigateWithRecovery, type HealingEvent } from '../utils/selfHealing';
import { config } from '../utils/config';

export class AppWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  api!: APIRequestContext;
  loginPage!: LoginPage;
  registerPage!: RegisterPage;
  account: DisposableTestAccount = createDisposableTestAccount();
  accountCreated = false;
  apiBody: unknown;
  healingEvents: HealingEvent[] = [];
  lastNavigationStatus: number | null = null;
  scenarioId = '';
  videoPath: string | null = null;
  tracePath: string | null = null;
  readonly evidenceRoot = path.resolve('reports', 'cucumber');
  baseURL = config.baseURL;

  constructor(options: IWorldOptions) { super(options); }

  async start(): Promise<void> {
    const parameters = this.parameters as { baseURL?: string };
    this.baseURL = parameters.baseURL?.trim() || config.baseURL;
    this.prepareEvidenceDirectories();

    // GitHub Actions uses headless Chromium. Local HEADED=1 remains supported.
    const headed = process.env.CI !== 'true' && process.env.HEADED === '1';
    this.browser = await chromium.launch({ headless: !headed, slowMo: headed ? 100 : 0 });
    this.context = await this.browser.newContext({
      baseURL: this.baseURL,
      viewport: { width: 1440, height: 900 },
      recordVideo: {
        dir: path.join(this.evidenceRoot, 'videos'),
        size: { width: 1440, height: 900 },
      },
    });
    await this.context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    this.page = await this.context.newPage();
    this.registerResponseMonitoring();
    this.api = await request.newContext({ baseURL: this.baseURL });
    this.loginPage = new LoginPage(this.page);
    this.registerPage = new RegisterPage(this.page);

    await navigateWithRecovery(this.page, this.baseURL, this.healingEvents, {
      maxAttempts: 3,
      initialDelayMs: 2000,
      maxDelayMs: 10000,
      timeoutMs: 15000,
    });
    console.log(`[WORLD] Application opened: ${this.page.url()}`);
  }

  private prepareEvidenceDirectories(): void {
    for (const folder of ['screenshots', 'videos', 'traces']) {
      fs.mkdirSync(path.join(this.evidenceRoot, folder), { recursive: true });
    }
  }

  private registerResponseMonitoring(): void {
    this.page.on('response', response => {
      const req = response.request();
      try {
        if (req.isNavigationRequest() && response.frame() === this.page.mainFrame()) {
          this.lastNavigationStatus = response.status();
        }
      } catch { /* Frame may be detached. */ }
    });
  }
}

setWorldConstructor(AppWorld);
