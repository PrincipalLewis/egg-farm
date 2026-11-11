// Release confirm: node confirm.mjs <engine> <assetHtml> <expectSha7> <port>
import pw from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [E, ASSET, SHA, PORT] = process.argv.slice(2); const EV = path.dirname(new URL(import.meta.url).pathname);
const tag = path.basename(ASSET, '.html'); const html = fs.readFileSync(ASSET);
const srv = http.createServer((q, r) => { if (q.url.startsWith('/__blank')) { r.writeHead(200, { 'content-type': 'text/html' }); return r.end('<!doctype html><title>b</title>'); }
  if (q.url === '/' || q.url.startsWith('/index.html')) { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return r.end(html); } r.writeHead(404); r.end(); });
await new Promise(res => srv.listen(+PORT, '127.0.0.1', res)); const U = `http://127.0.0.1:${PORT}/`;
const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
const out = []; const ok = (n, p, i) => { out.push({ n, p: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${E} ${tag}] ${n} — ${JSON.stringify(i)}`); };
const fx = f => fs.readFileSync('/workspace/egg-farm-studio/qa/m3-fixtures/saves/' + f, 'utf8');
async function mk(ls) { const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const ext = [];
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith(U) || u.startsWith('data:') || u.startsWith('blob:')) return r.continue(); ext.push(u); return r.abort(); });
  if (ls) { const s = await ctx.newPage(); await s.goto(U + '__blank'); await s.evaluate(o => { localStorage.clear(); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, ls); await s.close(); }
  const p = await ctx.newPage(); const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  return { ctx, p, errs, ext }; }
const start = async p => { await p.goto(U); await p.getByText('Tap to start').click({ timeout: 15000 }).catch(() => {}); await p.waitForTimeout(2500); };
const readSave = p => p.evaluate(() => { try { const d = JSON.parse(localStorage.getItem('eggfarm.save')); return { v: d.version, savedAt: d.savedAt, coins: d.state.coinsCents, farm: d.state.farmLevel, coll: d.state.collectionLevel }; } catch (e) { return null; } });
const allErr = [], allExt = [];
// 2. offline + build id (fresh)
{ const { ctx, p, errs, ext } = await mk(null); await start(p);
  const b = await p.evaluate(() => (localStorage.getItem('eggfarm.telemetry') ?? '').match(/"build":"([^"]+)"/)?.[1] ?? null);
  const body = await p.evaluate(() => document.body.innerText); const set = await p.getByText(/settings/i).first().click({ timeout: 3000 }).then(() => true).catch(() => false); await p.waitForTimeout(800);
  const setTxt = await p.evaluate(() => (document.body.innerText.match(/Egg Farm m3[^\n]*/) || [])[0] ?? null);
  await p.screenshot({ path: `${EV}/shots/${tag}-${E}-buildid.png` });
  ok('2 offline open + runtime build id', b?.includes(SHA) && ext.length === 0, { telemetryBuild: b, settingsText: setTxt, settingsOpened: set, externalRequestsBlocked: ext });
  allErr.push(...errs); allExt.push(...ext); await ctx.close(); }
// 3. old saves
const v4 = fx('m1-rc2-v4-12min.json'); const v3o = JSON.parse(v4); v3o.version = 3; delete v3o.state.celebratedTier; // exact inverse of 3->4 migration
for (const [name, raw] of [['v3 (derived from m1-rc2-v4)', JSON.stringify(v3o)], ['v4 m1-rc2-v4-12min', v4], ['v5 m2-rc1-v5-40min', fx('m2-rc1-v5-40min.json')]]) {
  const src = JSON.parse(raw); const t = Date.now() - 3000; src.savedAt = t; const want = { coins: src.state.coinsCents, farm: src.state.farmLevel, coll: src.state.collectionLevel };
  const { ctx, p, errs, ext } = await mk({ 'eggfarm.save': JSON.stringify(src), 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) }); await start(p);
  await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(9000); const s1 = await readSave(p);
  const ui = await p.evaluate(() => document.body.innerText.slice(0, 400)); await p.screenshot({ path: `${EV}/shots/${tag}-${E}-${name.split(' ')[0]}.png` });
  await p.reload(); await p.getByText('Tap to start').click({ timeout: 15000 }).catch(() => {}); await p.waitForTimeout(3000); const s2 = await readSave(p);
  const good = s => s && s.farm === want.farm && s.coll === want.coll && s.coins >= want.coins && s.savedAt > t;
  ok(`3 load ${name}: no loss`, good(s1) && good(s2), { want, afterBoot: s1, afterReload: s2, ui: ui.replace(/\n+/g, ' | ').slice(0, 200) });
  allErr.push(...errs); allExt.push(...ext); await ctx.close(); }
// 5. globals
{ const { ctx, p, errs } = await mk(null); await p.goto(U + '__blank'); const blank = await p.evaluate(() => Object.getOwnPropertyNames(window));
  await start(p); const g = await p.evaluate(() => Object.getOwnPropertyNames(window)); const extra = g.filter(k => !blank.includes(k));
  ok('5 only non-standard global is eggfarmExportTelemetry', extra.length === 1 && extra[0] === 'eggfarmExportTelemetry', { extra, typeofExport: await p.evaluate(() => typeof window.eggfarmExportTelemetry), eggfarmInWindow: await p.evaluate(() => 'eggfarm' in window) });
  allErr.push(...errs); await ctx.close(); }
ok('4 no console errors / page errors (all sessions above)', allErr.length === 0, { errors: allErr });
fs.writeFileSync(`${EV}/result-${tag}-${E}.json`, JSON.stringify(out, null, 1)); await br.close(); srv.close(); process.exit(0);
