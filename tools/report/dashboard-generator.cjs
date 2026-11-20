'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const dir = path.join(root, 'reports', 'cucumber');
const input = path.join(dir, 'results.json');
const output = path.join(dir, 'test-execution-results.html');
const historyPath = path.join(dir, 'history.json');
const aiPath = path.join(dir, 'ai-rca.json');
const videoPath = path.join(dir, 'videos', 'full-test-execution.mp4');
const escapeHtml = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function duration(result) {
  const d = result?.duration;
  if (typeof d === 'number') return d / 1e9;
  if (d && typeof d.seconds === 'number') return d.seconds + (d.nanos || 0) / 1e9;
  return 0;
}
function statusOf(s) {
  const entries = [...(s.before || []), ...(s.steps || []), ...(s.after || [])];
  const statuses = entries.map(x => String(x.result?.status || 'skipped').toLowerCase());
  if (statuses.some(x => ['failed','ambiguous','undefined','pending'].includes(x))) return 'failed';
  if (statuses.length && statuses.every(x => x === 'passed')) return 'passed';
  return 'skipped';
}
function relativeLink(value) {
  let p = String(value || '').trim().replace(/\\/g, '/');
  const marker = '/reports/cucumber/';
  const index = p.toLowerCase().indexOf(marker);
  if (index >= 0) p = p.slice(index + marker.length);
  else if (p.toLowerCase().startsWith('reports/cucumber/')) p = p.slice('reports/cucumber/'.length);
  else if (/^[a-z]:\//i.test(p) || p.startsWith('/')) return null;
  if (!p || p.split('/').includes('..') || /^(?:[a-z]+:|\/)/i.test(p)) return null;
  const absolute = path.resolve(dir, p);
  if (!absolute.startsWith(dir + path.sep)) return null;
  if (!fs.existsSync(absolute)) return null;
  return p.split('/').map(encodeURIComponent).join('/');
}
function parseEvidence(item) {
  const mime = String(item.mime_type || item.media?.type || item.mimeType || '').toLowerCase();
  const raw = item.data ?? item.body ?? '';
  const content = typeof raw === 'string' ? raw : String(raw);
  const encoding = String(item.content_encoding || item.encoding || '').toLowerCase();
  // Cucumber legacy JSON usually provides base64 image data without content_encoding.
  if (/^image\/(png|jpeg|webp|gif)$/.test(mime) && content.length < 12_000_000) {
    return {kind:'image',mime,data:content.replace(/^data:[^,]+,/, '')};
  }
  let text = content;
  if (encoding === 'base64' || (!mime.startsWith('image/') && !content.includes(':') && /^[A-Za-z0-9+/=\r\n]+$/.test(content) && content.length % 4 === 0)) {
    try { text = Buffer.from(content,'base64').toString('utf8'); } catch {}
  }
  const match = text.match(/^(Video|Trace|Screenshot):\s*(.+)$/im);
  if (match) {
    const href = relativeLink(match[2]);
    if (href) return {kind:'link',label:match[1],href};
  }
  if (mime === 'application/json') {
    try {
      const parsed = JSON.parse(text);
      if (parsed && (parsed.rca !== undefined || parsed.healingEvents !== undefined)) return {kind:'rca',value:parsed};
    } catch {}
  }
  return null;
}
function evidenceOf(item) {
  return [...(item.embeddings || []), ...(item.attachments || [])].map(parseEvidence).filter(Boolean);
}
function main() {
  if (!fs.existsSync(input)) {console.error('Missing Cucumber JSON:',input);process.exitCode=1;return;}
  let features;
  try {features=JSON.parse(fs.readFileSync(input,'utf8'));} catch(e) {console.error('Invalid JSON:',e.message);process.exitCode=1;return;}
  if (!Array.isArray(features)) {console.error('Expected Cucumber JSON array');process.exitCode=1;return;}
  const rows = [];
  for (const feature of features) for (const s of feature.elements || []) {
    if (s.type === 'background') continue;
    const steps = (s.steps || []).map(x => ({
      name:x.name || '',keyword:x.keyword || '',status:String(x.result?.status || 'skipped').toLowerCase(),
      seconds:duration(x.result),error:x.result?.error_message || x.result?.message || '',
      evidence:evidenceOf(x)
    }));
    const hooks = [...(s.before || []).map(x=>({...x,hookName:'Before'})),...(s.after || []).map(x=>({...x,hookName:'After'}))];
    const hookErrors = hooks.filter(x=>x.result?.status === 'failed').map(x=>x.hookName+': '+(x.result?.error_message || x.result?.message || 'Hook failed'));
    // Include step evidence in scenario-level gallery: Cucumber stores After attachments in synthetic steps.
    const allEvidence = [...evidenceOf(s),...steps.flatMap(x=>x.evidence),...hooks.flatMap(evidenceOf)];
    const seen = new Set();
    const evidence = allEvidence.filter(x=>{const k=x.kind==='image'?`image:${x.data.slice(0,80)}:${x.data.length}`:JSON.stringify(x);if(seen.has(k))return false;seen.add(k);return true;});
    rows.push({feature:feature.name || 'Unnamed feature',name:s.name || 'Unnamed scenario',status:statusOf(s),
      seconds:steps.reduce((a,x)=>a+x.seconds,0)+hooks.reduce((a,x)=>a+duration(x.result),0),
      steps,hookErrors,evidence,tags:(s.tags||[]).map(t=>t.name)});
  }
  const total=rows.length,passed=rows.filter(x=>x.status==='passed').length,failed=rows.filter(x=>x.status==='failed').length,skipped=total-passed-failed;
  const elapsed=rows.reduce((a,x)=>a+x.seconds,0),avg=total?elapsed/total:0,rate=total?Math.round(100*passed/total):0;
  const suites=[...new Set(rows.map(x=>x.feature))].map(name=>({name,total:rows.filter(x=>x.feature===name).length,passed:rows.filter(x=>x.feature===name&&x.status==='passed').length,failed:rows.filter(x=>x.feature===name&&x.status==='failed').length}));
  const stamp=new Date().toISOString();
  let history=[];try{const old=JSON.parse(fs.readFileSync(historyPath,'utf8'));if(Array.isArray(old))history=old;}catch{}
  history.push({stamp,total,passed,failed,skipped,rate});history=history.slice(-30);
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(historyPath,JSON.stringify(history,null,2));
  const video = fs.existsSync(videoPath) ? 'videos/full-test-execution.mp4' : null;
  let ai = {mode:'not-run',analyses:[]};
  if (fs.existsSync(aiPath)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(aiPath, 'utf8'));
      if (loaded && Array.isArray(loaded.analyses)) ai = {
        mode: String(loaded.mode || 'unknown'),
        model: String(loaded.model || ''),
        provider: String(loaded.provider || ''),
        analyses: loaded.analyses,
        error: String(loaded.error || '')
      };
    } catch (error) { console.warn('Could not read AI RCA:', error.message); }
  }
  // The AI utility assigns case-1, case-2, ... in Cucumber feature order.
  // Display AI findings only if the current run contains failures.
  if (!failed) ai = {mode:'no-failures',analyses:[]};
  const payload=JSON.stringify({rows,suites,history,total,passed,failed,skipped,elapsed,avg,rate,stamp,video,ai}).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test Execution Results</title>
<style>
:root{font-family:Inter,Segoe UI,Arial,sans-serif;color:#1e293b}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(135deg,#f3faeb,#f7f9ff 65%,#fff4f4)}header{padding:24px 32px;border-bottom:1px solid #dce5dc;display:flex;justify-content:space-between;gap:15px;align-items:center}h1{font-size:25px;color:#3451bb;margin:0}.brand{display:flex;align-items:center;gap:12px}.logo{padding:10px;background:#e2eaff;color:#3451bb;border-radius:10px}.meta{font-size:12px;text-align:right;color:#526078;line-height:1.7}nav{display:flex;gap:8px;padding:14px 30px 0;border-bottom:1px solid #dce5dc;overflow:auto}nav button{font:600 14px Segoe UI,Arial,sans-serif;border:0;background:none;padding:14px 17px;color:#334155;cursor:pointer;white-space:nowrap}nav button.active{border-bottom:3px solid #3655c4;color:#3655c4}main{max-width:1500px;margin:auto;padding:25px 30px}.page{display:none}.page.active{display:block}.kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:15px}.kpi,.panel,.analysis{background:#fff;border:1px solid #e3e8ed;border-radius:10px;box-shadow:0 3px 12px #1e293b0a}.kpi{text-align:center;padding:21px 10px;min-height:137px}.kpi label{display:block;font-size:12px;color:#64748b;margin-bottom:15px}.num{font-size:33px;font-weight:750}.sub{font-size:12px;color:#64748b;margin-top:8px}.green{color:#269b49}.red{color:#df3b36}.yellow{color:#d19b00}.panels{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}.panel{padding:23px;min-height:340px}h2{font-size:18px;margin:0 0 20px}.donut{width:230px;height:230px;border-radius:50%;background:conic-gradient(#42b35a 0 var(--pass),#ed4840 var(--pass) var(--fail),#eebc27 var(--fail) 100%);margin:22px auto;display:grid;place-items:center}.donut-inner{width:145px;height:145px;background:white;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center}.donut-inner strong{font-size:32px;color:#3451bb}.legend{display:flex;justify-content:center;gap:17px;font-size:13px}.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px}.suite-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.suite{border:1px solid #e1e7ee;border-left:4px solid #4c64c5;border-radius:7px;padding:15px}.suite strong{display:block;font-size:13px;margin-bottom:10px}.counts{font-size:12px;margin-top:10px}.bar{height:7px;background:#eef2f6;border-radius:8px;overflow:hidden;margin-top:12px}.bar>div{height:100%;background:#42b35a}.toolbar{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:17px}input,select{padding:11px 13px;border:1px solid #d7dfe9;border-radius:7px;font:inherit;background:#fff}input{flex:1;min-width:220px}details{background:white;border:1px solid #e3e7ed;border-radius:9px;margin:10px 0;overflow:hidden}summary{cursor:pointer;padding:15px 18px;display:flex;gap:12px;align-items:center;font-size:14px}.pill{font-size:11px;padding:5px 9px;border-radius:99px;background:#edf2ff;color:#304d9c;font-weight:700}.pill.passed{background:#e4f7e7;color:#208c39}.pill.failed{background:#ffebea;color:#c72d2d}.pill.skipped{background:#fff3d4;color:#8c6600}.right{margin-left:auto;color:#64748b;font-size:12px}.step,.attachments{padding:12px 20px;border-top:1px solid #edf0f4;font-size:13px;line-height:1.6}.err{white-space:pre-wrap;word-break:break-word;background:#fff1f1;color:#ad2929;border-radius:6px;padding:10px;margin:8px 0}.shot{max-width:350px;max-height:220px;object-fit:contain;border:1px solid #dce3ed;border-radius:7px;margin:8px 12px 8px 0}.evidence{display:inline-block;margin:8px 12px 0 0;color:#3655c4}.analysis{padding:23px;margin-bottom:15px}.info{color:#64748b;font-size:13px;line-height:1.6}.empty{padding:26px;text-align:center;color:#64748b}.history-table{width:100%;border-collapse:collapse;font-size:13px}.history-table th,.history-table td{padding:12px;text-align:left;border-bottom:1px solid #e6eaf0}.foot{text-align:center;padding:24px;color:#64748b;font-size:12px}.evidence-title{font-weight:700;margin-bottom:10px}.video-wrap{margin:0 0 20px;padding:18px;background:white;border:1px solid #e3e7ed;border-radius:9px}.video-wrap video{display:block;max-width:100%;width:700px;max-height:400px;margin-top:12px;background:#111}.ai-card{border:1px solid #e1e7ee;border-radius:9px;padding:16px;margin:12px 0;background:#fbfcff}.ai-card h3{font-size:15px;margin:0 0 10px}.ai-card p{font-size:13px;line-height:1.6;margin:8px 0}.ai-status{font-size:13px;color:#64748b;margin:12px 0}.rca pre{white-space:pre-wrap;word-break:break-word;font-size:12px}.muted{color:#64748b;font-size:12px}@media(max-width:1000px){.kpis{grid-template-columns:repeat(3,1fr)}.panels{grid-template-columns:1fr}}@media(max-width:600px){.kpis{grid-template-columns:repeat(2,1fr)}.suite-grid{grid-template-columns:1fr}main{padding:15px}header{padding:18px}h1{font-size:19px}}
</style></head><body><header><div class="brand"><span class="logo">◆</span><h1>Test Execution Results</h1></div><div class="meta"><b>Run Date:</b> ${escapeHtml(stamp)}<br><b>Recorded Duration:</b> ${elapsed.toFixed(1)}s</div></header>
<nav><button class="active" data-tab="dashboard">Dashboard</button><button data-tab="summary">Test Run Summary</button><button data-tab="history">Test History</button><button data-tab="analysis">AI Analysis / RCA</button></nav><main>
<section class="page active" id="dashboard"><div class="kpis"><div class="kpi"><label>Total Tests</label><div class="num">${total}</div></div><div class="kpi"><label>Passed</label><div class="num green">${passed}</div><div class="sub">${rate}%</div></div><div class="kpi"><label>Failed</label><div class="num red">${failed}</div></div><div class="kpi"><label>Skipped / Other</label><div class="num yellow">${skipped}</div></div><div class="kpi"><label>Avg. Test Time</label><div class="num">${avg.toFixed(1)}s</div></div><div class="kpi"><label>Recorded Duration</label><div class="num">${elapsed.toFixed(1)}s</div></div></div><div class="panels"><div class="panel"><h2>Test Distribution</h2><div class="donut" style="--pass:${total?passed/total*100:0}%;--fail:${total?(passed+failed)/total*100:0}%"><div class="donut-inner"><strong>${rate}%</strong>Passed</div></div><div class="legend"><span><i class="dot" style="background:#42b35a"></i>Passed</span><span><i class="dot" style="background:#ed4840"></i>Failed</span><span><i class="dot" style="background:#eebc27"></i>Other</span></div></div><div class="panel"><h2>Test Suites</h2><div class="suite-grid" id="suites"></div></div></div></section>
<section class="page" id="summary"><h2>Test Run Summary</h2><div id="video-container"></div><div class="toolbar"><input id="search" placeholder="Search feature, scenario or step..."><select id="filter"><option value="all">All statuses</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="skipped">Skipped / Other</option></select></div><div id="scenarios"></div></section>
<section class="page" id="history"><div class="analysis"><h2>Recent Test Runs</h2><p class="info">Last 30 report generations saved in reports/cucumber/history.json.</p><div id="history-content"></div></div></section>
<section class="page" id="analysis"><div class="analysis"><h2>Failure Analysis &amp; RCA</h2><p class="info">AI-generated hypotheses are advisory and require human review. Rule-based RCA and execution evidence remain available below.</p><div id="ai-findings"></div><div id="failures"></div></div></section>
</main><footer class="foot">Playwright + Cucumber BDD · Test Execution Results</footer><script>
const data=${payload};
const $=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function evidence(items){return (items||[]).map(a=>{if(a.kind==='image')return '<a target="_blank" href="data:'+safe(a.mime)+';base64,'+a.data+'"><img class="shot" src="data:'+safe(a.mime)+';base64,'+a.data+'" alt="Test screenshot"></a>';if(a.kind==='link')return '<a class="evidence" href="'+safe(a.href)+'" target="_blank">'+safe(a.label)+' ↗</a>';if(a.kind==='rca')return '<details class="rca"><summary>RCA / Healing Events</summary><div class="step"><pre>'+safe(JSON.stringify(a.value,null,2))+'</pre></div></details>';return ''}).join('')}
function item(r){return '<details><summary><span class="pill '+safe(r.status)+'">'+safe(r.status.toUpperCase())+'</span><span><b>'+safe(r.name)+'</b><div class="sub">'+safe(r.feature)+'</div></span><span class="right">'+Number(r.seconds).toFixed(2)+'s</span></summary>'+r.steps.map(s=>'<div class="step"><span class="pill '+safe(s.status)+'">'+safe(s.status)+'</span> &nbsp; '+safe(s.keyword)+' '+safe(s.name)+' <span class="right">'+Number(s.seconds).toFixed(2)+'s</span>'+(s.error?'<div class="err">'+safe(s.error)+'</div>':'')+'</div>').join('')+r.hookErrors.map(e=>'<div class="step err">'+safe(e)+'</div>').join('')+(r.evidence.length?'<div class="attachments"><div class="evidence-title">Execution Evidence</div>'+evidence(r.evidence)+'</div>':'')+'</details>'}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab))}));
$('suites').innerHTML=data.suites.map(s=>'<div class="suite"><strong>'+safe(s.name)+'</strong><div class="sub">'+s.total+' scenarios</div><div class="counts"><span class="green">✔ '+s.passed+'</span> &nbsp; <span class="red">✖ '+s.failed+'</span></div><div class="bar"><div style="width:'+(s.total?s.passed/s.total*100:0)+'%"></div></div></div>').join('')||'<div class="empty">No scenarios found</div>';
if(data.video){$('video-container').innerHTML='<div class="video-wrap"><b>Full Execution Video</b> <span class="muted">(scenario recordings combined in execution order)</span><video controls preload="metadata" src="'+safe(data.video)+'"></video><a class="evidence" href="'+safe(data.video)+'" target="_blank">Open MP4 ↗</a></div>'}
function render(){const q=$('search').value.toLowerCase(),f=$('filter').value;const rows=data.rows.filter(r=>(f==='all'||(f==='skipped'?!['passed','failed'].includes(r.status):r.status===f))&&[r.name,r.feature,...r.steps.map(s=>s.name)].join(' ').toLowerCase().includes(q));$('scenarios').innerHTML=rows.length?rows.map(item).join(''):'<div class="empty">No matching scenarios</div>'}
$('search').addEventListener('input',render);$('filter').addEventListener('change',render);render();
const failures=data.rows.filter(r=>r.status==='failed');
const ai=data.ai||{mode:'not-run',analyses:[]};
const findings=(ai.analyses||[]).filter(a=>a && /^case-[0-9]+$/.test(String(a.id||'')));
const aiHeader='<p class="ai-status"><b>AI RCA status:</b> '+safe(ai.mode)+(ai.provider?' · Provider: '+safe(ai.provider):'')+(ai.model?' · Model: '+safe(ai.model):'')+'</p>';
const aiCards=findings.map(a=>'<div class="ai-card"><h3>'+safe(a.id)+' · '+safe(a.confidence||'low')+' confidence</h3>'+
  '<p><b>Hypothesis:</b> '+safe(a.hypothesis)+'</p>'+
  '<p><b>Alternative:</b> '+safe(a.alternative)+'</p>'+
  '<p><b>Supporting metadata:</b> '+safe(a.evidence)+'</p>'+
  '<p><b>Suggested verification:</b> '+safe(a.proposedAction)+'</p>'+
  '<p><b>Human approval:</b> Required — no changes applied automatically.</p></div>').join('');
$('ai-findings').innerHTML=failures.length ? aiHeader+(aiCards||'<p class="info">No AI findings available for this execution. Check reports/cucumber/ai-rca.json and confirm the RCA utility ran after the tests.</p>') : '<p class="green">No failed scenarios in this execution.</p>';
$('failures').innerHTML=failures.length ? '<h2>Recorded failures and rule-based evidence</h2>'+failures.map(item).join('') : '';
$('history-content').innerHTML='<table class="history-table"><thead><tr><th>Run date</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Pass rate</th></tr></thead><tbody>'+data.history.slice().reverse().map(h=>'<tr><td>'+safe(h.stamp)+'</td><td>'+h.total+'</td><td class="green">'+h.passed+'</td><td class="red">'+h.failed+'</td><td>'+h.skipped+'</td><td>'+h.rate+'%</td></tr>').join('')+'</tbody></table>';
</script></body></html>`;
  fs.writeFileSync(output,html,'utf8');
  console.log('Dashboard generated:',output);
  console.log(`Scenarios: ${total} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
}
main();
