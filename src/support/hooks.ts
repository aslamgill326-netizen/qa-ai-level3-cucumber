
import {
  Before,
  After,
  AfterStep,
  Status,
  setDefaultTimeout,
} from '@cucumber/cucumber';

import fs from 'node:fs/promises';
import path from 'node:path';

import { AppWorld } from './world';
import { deleteDisposableAccount } from '../api/accountApi';
import { classifyFailure } from '../utils/rca';

setDefaultTimeout(90000);

const REPORT_DIR = path.resolve('reports', 'cucumber');

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Capture and attach screenshot to Cucumber report.
async function captureScreenshot(
  world: AppWorld,
  label: string
): Promise<void> {
  if (!world.page || world.page.isClosed()) {
    return;
  }

  const directory = path.join(REPORT_DIR, 'screenshots');

  await fs.mkdir(directory, { recursive: true });

  const filename = [
    world.scenarioId,
    safeName(label),
    Date.now(),
  ].join('-') + '.png';

  const screenshotPath = path.join(directory, filename);

  const screenshot = await world.page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  await world.attach(screenshot, 'image/png');
  await world.log(`Screenshot: ${screenshotPath}`);
}

// Initialize scenario.
Before(async function (this: AppWorld, scenario) {
  this.scenarioId = safeName(scenario.pickle.id);
  await this.start();
});

// Screenshot after a failed step.
AfterStep(async function (this: AppWorld, { pickleStep, result }) {
  if (result.status !== Status.FAILED) {
    return;
  }

  try {
    await captureScreenshot(
      this,
      `failed-${pickleStep.text}`
    );
  } catch (error) {
    await this.log(`Screenshot error: ${String(error)}`);
  }
});

// Capture evidence and release resources.
After(async function (this: AppWorld, scenario) {
  const errors: string[] = [];

  const scenarioId =
    this.scenarioId || safeName(scenario.pickle.id);

  const failed = scenario.result?.status === Status.FAILED;

  // 1. Final screenshot for passed and failed scenarios.
  try {
    await captureScreenshot(
      this,
      failed ? 'failed-final' : 'passed-final'
    );
  } catch (error) {
    errors.push(`Screenshot: ${String(error)}`);
  }

  // 2. Attach RCA and self-healing evidence.
  try {
    const rca = classifyFailure(
      scenario.result?.message || '',
      this.lastNavigationStatus
    );

    await this.attach(
      JSON.stringify(
        {
          scenario: scenario.pickle.name,
          status: scenario.result?.status,
          rca,
          healingEvents: this.healingEvents,
          lastNavigationStatus: this.lastNavigationStatus,
        },
        null,
        2
      ),
      'application/json'
    );
  } catch (error) {
    errors.push(`RCA: ${String(error)}`);
  }

  // 3. Cleanup disposable accounts.
  try {
    if (this.accountCreated && this.api) {
      await deleteDisposableAccount(
        this.api,
        this.account
      );

      this.accountCreated = false;

      await this.log('Disposable account cleanup confirmed');
    }
  } catch (error) {
    errors.push(`Cleanup: ${String(error)}`);
  }

  // 4. Stop tracing and save trace file.
  try {
    if (this.context) {
      const tracePath = path.join(
        REPORT_DIR,
        'traces',
        `${scenarioId}.zip`
      );

      await fs.mkdir(path.dirname(tracePath), {
        recursive: true,
      });

      await this.context.tracing.stop({
        path: tracePath,
      });

      this.tracePath = tracePath;

      await this.attach(
        `Trace: ${tracePath}`,
        'text/plain'
      );
    }
  } catch (error) {
    errors.push(`Trace: ${String(error)}`);
  }

  // 5. Get video before closing browser context.
  const video =
    this.page && !this.page.isClosed()
      ? this.page.video()
      : null;

  // 6. Close context to finalize recording.
  try {
    if (this.context) {
      await this.context.close();
    }
  } catch (error) {
    errors.push(`Context: ${String(error)}`);
  }

  // 7. Save video.
  try {
    if (video) {
      const videoPath = path.join(
        REPORT_DIR,
        'videos',
        `${scenarioId}.webm`
      );

      await fs.mkdir(path.dirname(videoPath), {
        recursive: true,
      });

      await video.saveAs(videoPath);

      this.videoPath = videoPath;

      await this.attach(
        `Video: ${videoPath}`,
        'text/plain'
      );
    }
  } catch (error) {
    errors.push(`Video: ${String(error)}`);
  }

  // 8. Dispose API context.
  try {
    if (this.api) {
      await this.api.dispose();
    }
  } catch (error) {
    errors.push(`API: ${String(error)}`);
  }

  // 9. Close browser.
  try {
    if (this.browser) {
      await this.browser.close();
    }
  } catch (error) {
    errors.push(`Browser: ${String(error)}`);
  }

  // 10. Report cleanup errors.
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
});
