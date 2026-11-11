// node font-probe.mjs <engine> <port>  : build:html output over http (own port) and file://; fonts, build id, console, file:// globals
import pw from '/tmp/qa-x/pr13c/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs';
const [E, PORT] = process.argv.slice(2); if (+PORT === 4173) process.exit(3);
const EV = '/workspace/egg-farm-studio/qa/m3-recheck/pr13-release-check-8475bc4'; const FILE = '/tmp/qa-x/htmlroot/index.html'; const html = fs.readFileSync(FILE);
const srv = http.createServer((q, r) => { if (q.url === '/' || q.url.startsWith('/index.html')) { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return r.end(html); } if (q.url.startsWith('/__blank')) { r.writeHead(200, {'content-type':'text/html'}); return r.end('<!doctype html><title>b</title>'); } r.writeHead(404); r.end(); });
await new Promise(res => srv.listen(+PORT, '127.0.0.1', res));
const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
const res = []; let allPass = true;
for (const [mode, url, blankUrl] of [['http', `http://127.0.0.1:${PORT}/`, `http://127.0.0.1:${PORT}/__blank`], ['file', 'file://' + FILE, 'about:blank']]) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const reqs = [], fails = [], errs = [];
  const b = await ctx.newPage(); await b.goto(blankUrl); const base = new Set(await b.evaluate(() => Object.getOwnPropertyNames(window))); await b.close();
  const p = await ctx.newPage(); p.on('request', q => { if (!/^(data|blob):/.test(q.url())) reqs.push(q.url().slice(0, 120)); }); p.on('requestfailed', q => fails.push(q.url().slice(0, 120)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto(url); await p.getByText('Tap to start').click({ timeout: 15000 }).catch(() => errs.push('no Tap to start')); await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => { await document.fonts.ready; for (const s of ['500 16px Fredoka','700 16px Fredoka','400 16px Nunito','700 16px Nunito']) await document.fonts.load(s).catch(()=>{});
    const faces = [...document.fonts].map(f => `${f.family} ${f.weight} ${f.status}`);
    const check = Object.fromEntries(['500 16px Fredoka','700 16px Fredoka','400 16px Nunito','700 16px Nunito'].map(s => [s, document.fonts.check(s)]));
    const metas = [...document.querySelectorAll('meta[name="build-id"]')].map(m => m.content); const app = document.getElementById('app')?.dataset.buildId ?? null; const nAttr = document.querySelectorAll('[data-build-id]').length;
    const tel = (localStorage.getItem('eggfarm.telemetry') ?? '').match(/"build":"([^"]+)"/)?.[1] ?? null;
    const h1 = getComputedStyle(document.querySelector('h1,h2,button') ?? document.body).fontFamily;
    return { faces, check, metas, app, nAttr, tel, sampleFontFamily: h1 }; });
  await p.locator('#settings').click({ force: true }).catch(() => {}); await p.waitForTimeout(1200);
  r.settingsText = await p.evaluate(() => (document.body.innerText.match(/Egg Farm m3[^\n]*/) || [])[0] ?? null);
  await p.screenshot({ path: `${EV}/shots/fonts-${E}-${mode}.png` });
  const extra = (await p.evaluate(() => Object.getOwnPropertyNames(window))).filter(k => !base.has(k)).sort();
  const ID = 'm3-rc1-pre+8475bc4';
  const loaded = r.faces.filter(f => / loaded$/.test(f)).length;
  const ok = { fonts4: loaded === 4 && Object.values(r.check).every(Boolean), buildId: r.metas.length === 1 && r.metas[0] === ID && r.app === ID && r.nAttr === 1 && r.tel === ID && (r.settingsText ?? '').includes('8475bc4'),
    noFailedReq: fails.length === 0, noOtherReq: reqs.filter(u => !u.startsWith(url) && !u.startsWith('file://')).length === 0 && reqs.length <= 1, noConsoleErr: errs.length === 0, globals: extra.filter(k => k !== 'eggfarmExportTelemetry').length === 0 };
  for (const [k, v] of Object.entries(ok)) { if (!v) allPass = false; console.log(`${v ? 'PASS' : 'FAIL'} [${E} ${mode}] ${k}`); }
  console.log(`  detail ${JSON.stringify({ ...r, requests: reqs, failed: fails, errs, windowExtra: extra })}`);
  res.push({ E, mode, ok, ...r, reqs, fails, errs, extra }); await ctx.close(); }
fs.writeFileSync(`${EV}/fonts-${E}.json`, JSON.stringify(res, null, 1)); await br.close(); srv.close(); process.exit(allPass ? 0 : 1);
