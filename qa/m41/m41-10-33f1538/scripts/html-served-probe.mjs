// M41-10 @33f1538: serve <dir>/egg-farm.html on <port> (own static server, this process), open in Chromium headless,
// read build-id surfaces (meta, #app[data-build-id], telemetry session_start.build, scan), screenshot, check vs expectation.
// node html-served-probe.mjs <worktree> <htmlDir> <port> <shotsDir> [label]   env: BUILD_SHA, BUILD_DIRTY=require
import http from 'node:http'; import { readFileSync, mkdirSync } from 'node:fs'; import { join } from 'node:path';
import { expectFromEnv, collectSurfaces, surfaceIds } from '/workspace/egg-farm-studio/qa/m3-scripts/build-id-expect.mjs';
const [w, dir, port, shots, label = 'clean'] = process.argv.slice(2); if (port === '4173' || !['5963','5964'].includes(port)) { console.error('port must be 5963/5964'); process.exit(2); }
mkdirSync(shots, { recursive: true }); const BX = expectFromEnv(process.env, w);
const html = readFileSync(join(dir, 'egg-farm.html'));
const srv = http.createServer((q, r) => { if (q.url === '/' || q.url.startsWith('/egg-farm.html')) { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); } else { r.writeHead(404); r.end(); } });
await new Promise((res, rej) => { srv.once('error', rej); srv.listen(+port, '127.0.0.1', res); });
console.log(`server pid ${process.pid} listening 127.0.0.1:${port}`);
let ok = false;
try {
  const pw = await import(w + '/node_modules/playwright-core/index.mjs');
  const b = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: true });
  const p = await (await b.newContext({ viewport: { width: 420, height: 860 } })).newPage(); const errs = [], logs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { logs.push(`${m.type()}: ${m.text()}`); if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:${port}/egg-farm.html`); await p.waitForTimeout(2500);
  try { await p.getByText('Tap to start').click({ timeout: 4000 }); } catch {}
  await p.waitForTimeout(2000);
  const sf = await p.evaluate(collectSurfaces, BX.scan); const ids = surfaceIds(sf); const c = BX.check(ids);
  const ua = await p.evaluate(() => navigator.userAgent);
  await p.screenshot({ path: `${shots}/runtime-${label}-chromium-page.png` });
  // QA-injected overlay (not game UI) showing the values read from the live DOM, so the screenshot carries the build-id.
  await p.evaluate(v => { const d = document.createElement('div'); d.id = 'qa-overlay'; d.textContent = v;
    Object.assign(d.style, { position: 'fixed', left: '0', right: '0', bottom: '0', zIndex: 2147483647, background: '#000', color: '#0f0', font: '13px monospace', padding: '6px', whiteSpace: 'pre-wrap' }); document.body.appendChild(d); },
    `QA overlay (injected by probe, not game UI)\nmeta[name=build-id] = ${JSON.stringify(sf.meta)}\n#app[data-build-id] = ${JSON.stringify(sf.dataBuildId)}\ntelemetry session_start.build = ${JSON.stringify(sf.telemetrySessionStart)}\nexpect ${BX.label}\n=> ${c.ok ? 'PASS' : 'FAIL'}`);
  await p.screenshot({ path: `${shots}/runtime-${label}-chromium-overlay.png` });
  console.log(`UA: ${ua}`); console.log(`surfaces: ${JSON.stringify(sf)}`); console.log(`ids: ${JSON.stringify([...new Set(ids)])}`);
  console.log(`page/console errors: ${JSON.stringify(errs)}`); console.log(`console (first 10): ${JSON.stringify(logs.slice(0, 10))}`);
  ok = c.ok && errs.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} runtime build-id [chromium, served :${port}, ${label}] want ${BX.label} :: ${c.reason}${errs.length ? ' :: page errors' : ''}`);
  await b.close();
} finally { srv.close(); }
process.exit(ok ? 0 : 1);
