
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const reportDir = path.join(root, 'reports', 'cucumber');
const videoDir = path.join(reportDir, 'videos');

const results = path.join(reportDir, 'results.json');
const html = path.join(reportDir, 'test-execution-results.html');

const cli = path.join(root, 'node_modules/@cucumber/cucumber/bin/cucumber.js');
const generator = path.join(__dirname, 'dashboard-generator.cjs');
const merger = path.join(__dirname, 'merge-videos.cjs');

fs.mkdirSync(videoDir, { recursive: true });

function run(file, args = []) {
  return spawnSync(process.execPath, [file, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
}

function openReport() {
  if (process.platform === 'win32') {
    const escaped = html.replace(/'/g, "''");

    return spawnSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Start-Process -FilePath '${escaped}'`,
    ], { stdio: 'inherit' });
  }

  return spawnSync(
    process.platform === 'darwin' ? 'open' : 'xdg-open',
    [html],
    { stdio: 'inherit' }
  );
}

// Clear previous execution results and videos.
for (const file of fs.readdirSync(videoDir)) {
  if (file.endsWith('.webm') || file === 'full-test-execution.mp4') {
    fs.unlinkSync(path.join(videoDir, file));
  }
}

for (const file of [results, html, path.join(reportDir, 'ai-rca.json'), path.join(reportDir, 'ai-rca.html')]) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// 1. Execute selected or all scenarios.
console.log('\n=== RUNNING TESTS ===');


const tests = run(cli, [
  'features/',
  '--format', 'progress',
  '--format', 'json:reports/cucumber/results.json',
  ...process.argv.slice(2),
]);


if (!fs.existsSync(results)) {
  console.error('Cucumber results.json not generated.');
  process.exit(1);
}

// 2. Merge scenario videos.
console.log('\n=== MERGING VIDEOS ===');
const merge = run(merger);

if (merge.status !== 0) {
  console.warn('Video merge failed; individual videos retained.');
}

console.log('\n=== AI RCA ===');

const ai = run(path.join(__dirname, 'ai-rca.cjs'));

if (ai.error || ai.status !== 0) {
  console.warn('AI RCA unavailable; test results remain unchanged.');
}

// 3. Generate dashboard.
console.log('\n=== GENERATING DASHBOARD ===');
const report = run(generator);

if (report.status !== 0 || !fs.existsSync(html)) {
  console.error('Dashboard generation failed.');
  process.exit(1);
}

// 4. Open report automatically.
if (process.env.CI !== 'true') {
  console.log('\n=== OPENING DASHBOARD ===');
  const opened = openReport();
  if (opened.error || opened.status !== 0) {
    console.warn('Could not open report:', opened.error?.message);
    console.log('Open manually:', html);
  }
} else {
  console.log('CI mode: dashboard saved without opening a browser:', html);
}

process.exitCode = tests.status === 0 && !tests.error ? 0 : 1;
