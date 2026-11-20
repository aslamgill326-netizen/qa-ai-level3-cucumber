
import type { Page, BrowserContext } from '@playwright/test';
import type { IWorld } from '@cucumber/cucumber';
import fs from 'node:fs/promises';
import path from 'node:path';

export const EVIDENCE_DIR = path.resolve(
  'reports',
  'cucumber',
);

export interface EvidenceOptions {
  screenshotEveryStep?: boolean;
  videoEnabled?: boolean;
  traceEnabled?: boolean;
}

export async function ensureEvidenceFolders(): Promise<void> {
  for (const folder of [
    'screenshots',
    'videos',
    'traces',
  ]) {
    await fs.mkdir(
      path.join(EVIDENCE_DIR, folder),
      { recursive: true },
    );
  }
}

export function evidenceFile(
  folder: 'screenshots' | 'videos' | 'traces',
  scenarioId: string,
  extension: string,
): string {
  // Keep filenames safe and unique.
  const safeId = scenarioId.replace(
    /[^a-zA-Z0-9_-]/g,
    '_',
  );

  return path.join(
    EVIDENCE_DIR,
    folder,
    `${safeId}.${extension}`,
  );
}

export async function captureScreenshot(
  page: Page,
  world: IWorld,
  scenarioId: string,
  stepName: string,
): Promise<string> {
  const safeStep = stepName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60);

  const filePath = evidenceFile(
    'screenshots',
    `${scenarioId}-${safeStep}-${Date.now()}`,
    'png',
  );

  const screenshot = await page.screenshot({
    path: filePath,
    fullPage: true,
    animations: 'disabled',
  });

  await world.attach(screenshot, 'image/png');

  return filePath;
}

export async function startTrace(
  context: BrowserContext,
): Promise<void> {
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });
}

export async function stopTrace(
  context: BrowserContext,
  scenarioId: string,
): Promise<string> {
  const filePath = evidenceFile(
    'traces',
    scenarioId,
    'zip',
  );

  await context.tracing.stop({
    path: filePath,
  });

  return filePath;
}

export async function saveVideo(
  page: Page,
  scenarioId: string,
): Promise<string | null> {
  const video = page.video();

  if (!video) {
    return null;
  }

  const filePath = evidenceFile(
    'videos',
    scenarioId,
    'webm',
  );

  // Playwright finalizes video when the browser context closes.
  await page.context().close();
  await video.saveAs(filePath);

  return filePath;
}
