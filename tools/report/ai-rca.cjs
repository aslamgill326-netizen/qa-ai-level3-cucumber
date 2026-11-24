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

const rules = {
  ENVIRONMENT_UNAVAILABLE: ['high', 'Explicit server overload or transient HTTP error prevented verification.', 'Check service health and verify the business state using a read-only request before replaying any action.'],
  INTENTIONAL_VALIDATION: ['high', 'The designated RCA assertion failed for the nonexistent demo product.', 'Confirm the intentional assertion remains isolated from normal regression.'],
  CLEANUP_FAILURE: ['high', 'An After hook failed; the scenario lifecycle did not complete successfully.', 'Inspect cleanup errors and verify resource or account state before retrying cleanup.'],
  DATA_STATE: ['medium', 'The expected business state could not be confirmed.', 'Inspect read-only state evidence; do not replay mutations blindly.'],
  LOCATOR: ['medium', 'The expected UI element could not be resolved or verified.', 'Inspect the screenshot, trace and expected application state.'],
  AUTHORIZATION: ['high', 'An explicit HTTP authentication or authorization error occurred.', 'Verify credentials, permissions and expected response contract.'],
  API_CONTRACT: ['medium', 'API response validation failed.', 'Compare actual status and response schema with the expected contract.'],
  ASSERTION_OR_TIMEOUT: ['medium', 'An assertion or timeout occurred; underlying cause is not established.', 'Compare expected and actual results and inspect execution evidence.'],
  UNCLASSIFIED: ['low', 'Available evidence does not establish a failure category.', 'Review the failed step and trace manually.']
};
function classify(message, location, intentional) {
  const s = String(message || '');
  if (/ENVIRONMENT_UNAVAILABLE|queue full|under heavy load|service unavailable|HTTP\s+(429|502|503|504|52[0-4])/i.test(s)) return 'ENVIRONMENT_UNAVAILABLE';
  if (location === 'teardown') return 'CLEANUP_FAILURE';
  if (intentional && /RCA_DEMO_NON_EXISTENT_PRODUCT/.test(s) && /expect|assert/i.test(s)) return 'INTENTIONAL_VALIDATION';
  if (/STATE_(UNKNOWN|UNCONFIRMED|EXISTS|ABSENT)/i.test(s)) return 'DATA_STATE';
  if (/HTTP\s+(401|403)/i.test(s)) return 'AUTHORIZATION';
  if (/API_|responseCode/i.test(s)) return 'API_CONTRACT';
  if (/locator_unresolved|strict mode|element\(s\) not found|waiting for locator|locator\(/i.test(s)) return 'LOCATOR';
  if (/expect|assert|timeout|timed out/i.test(s)) return 'ASSERTION_OR_TIMEOUT';
  return 'UNCLASSIFIED';
}
function safeEvidence(features) {
  const cases = [];
  for (const feature of features) for (const scenario of feature.elements || []) {
    if (scenario.type === 'background') continue;
    const entries = [...(scenario.before || []).map(x=>({...x, location:'setup'})), ...(scenario.steps || []).map(x=>({...x, location:/^After$/i.test((x.keyword||'').trim())?'teardown':/^Before$/i.test((x.keyword||'').trim())?'setup':'test-step'})), ...(scenario.after || []).map(x=>({...x, location:'teardown'}))];
    const bad = entries.filter(x=>['failed','ambiguous','undefined','pending'].includes(x.result?.status));
    if (!bad.length) continue;
    const intentional = (scenario.tags || []).some(t=>t.name==='@rca-validation');
    const categories = [...new Set(bad.map(x=>classify(x.result?.error_message || x.result?.message,x.location,intentional)))];
    cases.push({id:`case-${cases.length+1}`, failureCategories:categories, failureLocations:bad.map(x=>x.location), failedStepCount:bad.length, precedingStepStatuses:entries.slice(0,entries.indexOf(bad[0])).map(x=>x.result?.status||'unknown')});
  }
  return cases;
}
function baseline(c) {
  const category = c.failureCategories[0];
  const [confidence,hypothesis,proposedAction] = rules[category];
  return {id:c.id,category,confidence,hypothesis,proposedAction,alternative:'Underlying application defect is not established by this evidence.',evidence:`Categories: ${c.failureCategories.join(', ')}; failed entries: ${c.failedStepCount}; locations: ${c.failureLocations.join(', ')}; preceding statuses: ${c.precedingStepStatuses.join(', ') || 'none'}`,humanApprovalRequired:true,source:'rule-based'};
}
// AI selects only approved verification actions; factual fields remain deterministic.
function validate(value, cases) {
  if (!Array.isArray(value?.analyses)) throw new Error('Invalid AI response');
  return cases.map(c=>{
    const result=baseline(c);
    const matches=value.analyses.filter(a=>a?.id===c.id);
    if(matches.length===1 && matches[0].category===result.category && matches[0].action==='verify-evidence') result.source='rule-based + AI validated';
    return result;
  });
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
        system: 'Return JSON only: {"analyses":[{"id":"case-1","category":"exact first supplied failure category","action":"verify-evidence"}]}. Preserve every case ID and its first category. Never invent evidence or recommend replaying mutations.',
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
    analyses: cases.map(baseline),
    resultsHash: require('node:crypto').createHash('sha256').update(fs.readFileSync(input)).digest('hex')
  };

  if (!cases.length) report.mode = 'no-failures';
  else if (!enabled) report.mode = 'disabled';
  else if (provider !== 'ollama') { report.mode = 'unsupported-provider'; report.error = 'Set AI_RCA_PROVIDER=ollama'; }
  else {
    try {
      const parsed = await runOllama(cases);
      report.analyses = validate(parsed, cases);
      if (!report.analyses.length) throw new Error('Ollama returned no valid case analyses');
      report.mode = report.analyses.some(a=>a.source==='rule-based + AI validated') ? 'evidence-first-ai-validated' : 'rule-based-fallback';
    } catch (error) {
      report.mode = 'rule-based-fallback';
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
