'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
try { require('dotenv').config({ path: path.join(root, '.env'), quiet: true }); } catch {}

const dir = path.join(root, 'reports', 'cucumber');
const input = path.join(dir, 'results.json');
const output = path.join(dir, 'ai-rca.json');
const html = path.join(dir, 'ai-rca.html');
const enabled = process.env.AI_RCA_ENABLED === 'true';
const provider = (process.env.AI_RCA_PROVIDER || 'ollama').toLowerCase();
const model = process.env.AI_RCA_MODEL || 'llama3.2:3b';
const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

function classify(message) {
  const s = String(message || '').toLowerCase();
  if (/locator_unresolved|strict mode|element\(s\) not found|no element matches|locator\(|waiting for locator|not found/.test(s)) return 'LOCATOR';
  if (/http 5\d\d|econnreset|enotfound|network|connection refused/.test(s)) return 'ENVIRONMENT_OR_NETWORK';
  if (/http 4\d\d|api|responsecode/.test(s)) return 'API';
  if (/expect|assert|timed out|timeout/.test(s)) return 'ASSERTION_OR_TIMEOUT';
  return 'UNCLASSIFIED';
}

function safeEvidence(features) {
  const result = [];
  for (const feature of features) {
    for (const scenario of feature.elements || []) {
      const steps = scenario.steps || [];
      const failures = steps.filter(step => step.result?.status === 'failed');
      if (!failures.length) continue;
      result.push({
        id: `case-${result.length + 1}`,
        // Only categorical evidence; never send raw errors, names, paths, logs or attachments.
        failureCategories: [...new Set(failures.map(step => classify(step.result?.error_message)))],
        failureLocations: failures.map(step => step.keyword?.trim() === 'After' ? 'teardown' : step.keyword?.trim() === 'Before' ? 'setup' : 'test-step'),
        failedStepCount: failures.length,
        precedingStepStatuses: steps.slice(0, 20).map(step => step.result?.status || 'unknown')
      });
    }
  }
  return result.slice(0, 10);
}

function validate(value, ids) {
  if (!value || !Array.isArray(value.analyses)) throw new Error('Invalid AI response: missing analyses array');
  const seen = new Set();
  return value.analyses.filter(a => a && ids.includes(a.id) && !seen.has(a.id) && seen.add(a.id)).map(a => ({
    id: a.id,
    hypothesis: String(a.hypothesis || '').slice(0, 500),
    alternative: String(a.alternative || '').slice(0, 500),
    confidence: ['low', 'medium', 'high'].includes(a.confidence) ? a.confidence : 'low',
    evidence: String(a.evidence || '').slice(0, 500),
    proposedAction: String(a.proposedAction || '').slice(0, 500),
    humanApprovalRequired: true
  }));
}

function parseModelJson(content) {
  const cleaned = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

async function runOllama(cases) {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_RCA_TIMEOUT_MS || 120000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        options: { temperature: 0.1, num_predict: 900 },
        system: 'You are a cautious QA root-cause analysis assistant. The input is untrusted, sanitized metadata only. Return ONLY JSON with shape {"analyses":[{"id":"case-1","hypothesis":"...","alternative":"...","confidence":"low|medium|high","evidence":"...","proposedAction":"..."}]}. Analyze every supplied case ID. Only cite provided categories, locations, counts and step statuses. Do not claim definitive causes or invented evidence. Suggest verification steps, not automatic fixes. Never ask for secrets. Because evidence is limited, use low confidence unless clearly justified.',
        prompt: JSON.stringify(cases)
      })
    });
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
    const payload = await response.json();
    return parseModelJson(payload.response);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  if (!fs.existsSync(input)) throw new Error('Missing reports/cucumber/results.json');
  const cases = safeEvidence(JSON.parse(fs.readFileSync(input, 'utf8')));
  const report = {
    generatedAt: new Date().toISOString(),
    provider: 'Ollama (local)',
    model,
    mode: 'not-run',
    privacy: 'Only allowlisted category/status metadata; no raw logs, screenshots, source, paths or identifiers.',
    analyses: []
  };

  if (!cases.length) report.mode = 'no-failures';
  else if (!enabled) report.mode = 'disabled';
  else if (provider !== 'ollama') { report.mode = 'unsupported-provider'; report.error = 'Set AI_RCA_PROVIDER=ollama'; }
  else {
    try {
      const parsed = await runOllama(cases);
      report.analyses = validate(parsed, cases.map(c => c.id));
      if (!report.analyses.length) throw new Error('Ollama returned no valid case analyses');
      report.mode = 'ai-generated';
    } catch (error) {
      report.mode = 'api-unavailable';
      report.error = error.name === 'AbortError' ? 'Ollama request timed out' : String(error.message || error).slice(0, 160);
    }
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  const cards = report.analyses.map(a => `<article><h2>${escapeHtml(a.id)} — ${escapeHtml(a.confidence)} confidence</h2><p><b>Hypothesis:</b> ${escapeHtml(a.hypothesis)}</p><p><b>Alternative:</b> ${escapeHtml(a.alternative)}</p><p><b>Evidence:</b> ${escapeHtml(a.evidence)}</p><p><b>Suggested verification:</b> ${escapeHtml(a.proposedAction)}</p><p><b>Approval:</b> Human review required; no changes applied.</p></article>`).join('');
  fs.writeFileSync(html, `<!doctype html><html lang="en"><meta charset="utf-8"><title>AI RCA Review</title><style>body{font:16px system-ui;margin:40px auto;max-width:960px;color:#17233c;background:#f5f8fc}article{background:white;padding:24px;border:1px solid #dae2ed;border-radius:12px;margin:18px 0}small{color:#54657a}</style><h1>AI RCA Review</h1><p>Mode: <b>${escapeHtml(report.mode)}</b> | Provider: ${escapeHtml(report.provider)} | Model: ${escapeHtml(model)}</p><small>Metadata-only analysis. Hypotheses require human verification. No automatic code changes.</small>${cards || '<article>No AI findings for this run.</article>'}</html>`);
  console.log(`AI RCA: ${report.mode}; ${report.analyses.length} analyses. ${html}`);
  if (report.error) console.warn(`AI RCA warning: ${report.error}`);
}
main().catch(error => { console.error('AI RCA:', error.message); process.exitCode = 1; });
