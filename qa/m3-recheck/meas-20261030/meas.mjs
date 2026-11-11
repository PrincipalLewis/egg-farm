// HoQ 14:29 measurement (record only). usage: node meas.mjs <engine> <port> <outdir>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'; import http from 'node:http'; import { join, extname } from 'node:path'; import { performance } from 'node:perf_hooks';
const HN = '/workspace/egg-farm-studio/artifacts/v5-ui/harness-rc-next'; const { l17SaveRaw } = await import(`${HN}/m5/sg3-precond.mjs`);
const [ENG, PORT, OUT] = process.argv.slice(2); const port = +PORT; if (port === 4173 || port < 5251 || port > 5259) throw new Error('port not allowed'); mkdirSync(OUT, { recursive: true });
const WT = '/workspace/egg-farm-studio/qa/v5-saves/tools'; const DIST = '/tmp/uiqa-meas-65a7443/dist-qa'; const AXE = '/workspace/egg-farm-studio/artifacts/v5-ui/tools/axe-core-4.14.0/axe.min.js';
const BID = (/name="build-id" content="([^"]*)"/.exec(readFileSync(`${DIST}/index.html`, 'utf8')) ?? [])[1]; if (!BID?.includes('+65a7443')) throw new Error(`build-id ${BID} lacks +65a7443`);
const TPL = JSON.parse(readFileSync(`${HN}/tests/fixtures/sg3/l10-save.template.json`, 'utf8')); const UI = { onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true, sfx: false };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = join(DIST, p); if (!f.startsWith(DIST) || !existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); r.end(readFileSync(f)); });
await new Promise(r => srv.listen(port, '127.0.0.1', r)); const URL0 = `http://127.0.0.1:${port}/`;
const pw = (await import(`${WT}/node_modules/playwright-core/index.mjs`)).default; const launch = () => ENG === 'chromium' ? pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : pw[ENG].launch();
const R = { engine: ENG, port, build_id: BID, label: 'RECORD ONLY - NOT EVIDENCE; UI1 cell = PROXY (FX-L17 $3,000 farm screen on rc/v5 65a7443, BBv2 not built)', launch: [], cells: [], runFor: {}, bidChecks: [] };
const log = (...a) => console.log(new Date().toISOString(), ENG, ...a); const ms = t0 => +(performance.now() - t0).toFixed(1);
for (let i = 0; i < 3; i++) { const t0 = performance.now(); const b = await launch(); const tl = ms(t0); const t1 = performance.now(); await b.close(); R.launch.push({ launch_ms: tl, close_ms: ms(t1) }); log('launch', i, tl); }
const br = await launch(); const AXESRC = readFileSync(AXE, 'utf8');
const seed = async (p, now) => { const raw = now == null ? null : l17SaveRaw(TPL, now); await p.addInitScript(([ui, raw, key, tpl]) => { if (sessionStorage.getItem('m')) return; sessionStorage.setItem('m', '1'); localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify(ui)); localStorage.setItem(key, raw ?? tpl.replace('__NOW__', String(Date.now()))); }, [UI, raw, 'eggfarm.save', raw ? null : l17SaveRaw(TPL, '__NOW__')]); };
const bidOk = async p => { const b = await p.evaluate(() => document.querySelector('meta[name=build-id]')?.content); R.bidChecks.push(b === BID); return b === BID; };
for (const [w, h] of [[360, 640], [390, 844], [1280, 800]]) for (let rep = 0; rep < 3; rep++) { const c = { size: `${w}x${h}`, rep, proxy: true };
  let t0 = performance.now(); const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); await seed(p, null); await p.goto(URL0, { waitUntil: 'domcontentloaded' });
  await p.getByText('Tap to start').click({ timeout: 20000 }).catch(() => {}); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi, null, { timeout: 20000 }).catch(() => {});   // start 3: title screen dismissed as lib/qa-page.mjs:32 does
  c.goal = await p.waitForSelector('#goal', { timeout: 10000 }).then(() => true, () => false); c.eggfarm = await p.evaluate(() => !!window.eggfarm); c.load_ms = ms(t0); c.bid_ok = await bidOk(p);
  t0 = performance.now(); await p.screenshot({ path: `${OUT}/${ENG}-${w}x${h}-r${rep}.png` }); c.shot_ms = ms(t0);
  t0 = performance.now(); c.checkOut = await p.evaluate(() => { const q = s => [...document.querySelectorAll(s)]; const R = e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
    const strip = document.querySelector('#goal'); return { rects: q('#goal, #goalDesc, #goalLive, .up button, #collect').map(R).length, overflow: strip ? strip.scrollWidth - strip.clientWidth : null, under44: q('button').filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44); }).length, stars: q('[data-best-buy]').length }; });
  c.check_ms = ms(t0); t0 = performance.now(); await p.addScriptTag({ content: AXESRC }); c.axeInject_ms = ms(t0);
  t0 = performance.now(); const ax = await p.evaluate(async () => { const r = await window.axe.run(document); return r.violations.length; }); c.axe_ms = ms(t0); c.axe_violations_recorded_not_graded = ax;
  await ctx.close(); R.cells.push(c); log('cell', c.size, rep, JSON.stringify({ load: c.load_ms, shot: c.shot_ms, check: c.check_ms, axe: c.axe_ms })); }
const clockPage = async () => { const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const T = Date.UTC(2026, 9, 30, 12, 0, 0); await p.clock.install({ time: T }); await seed(p, T);
  await p.goto(URL0, { waitUntil: 'domcontentloaded' }); await p.getByText('Tap to start').click({ timeout: 20000 }).catch(() => {});
  await p.waitForFunction(() => window.eggfarm && window.eggfarmUi, null, { timeout: 20000 }).catch(() => {}); R.runFor.booted = await p.evaluate(() => !!window.eggfarm); await bidOk(p); return { ctx, p }; };
const race = (pr, s) => Promise.race([pr, new Promise((_, j) => setTimeout(() => j(new Error(`cap ${s}s`)), s * 1000))]);
try { const { ctx, p } = await clockPage(); const t0 = performance.now(); await race(p.clock.runFor(240000), 200); R.runFor.single_240000_ms = ms(t0); R.runFor.single_coins_after = await p.evaluate(() => window.eggfarm?.state?.coinsCents ?? null); await ctx.close(); log('runFor single', R.runFor.single_240000_ms); } catch (e) { R.runFor.single_error = e.message; log('runFor single ERR', e.message); }
try { const { ctx, p } = await clockPage(); const per = []; const t0 = performance.now();
  for (let k = 0; k < 48; k++) { const t1 = performance.now(); await race(p.clock.runFor(5000), 60); await p.evaluate(() => window.qaPicker?.()?.hint?.key ?? null); per.push(ms(t1)); }
  await p.clock.runFor(2000); R.runFor.chunked_48x5000_plus_2000_ms = ms(t0); R.runFor.chunk_ms = { min: Math.min(...per), max: Math.max(...per), mean: +(per.reduce((a, b) => a + b, 0) / per.length).toFixed(1) };
  R.runFor.qaPicker_present = await p.evaluate(() => typeof window.qaPicker === 'function'); await ctx.close(); log('runFor chunked', R.runFor.chunked_48x5000_plus_2000_ms); } catch (e) { R.runFor.chunked_error = e.message; log('runFor chunked ERR', e.message); }
await br.close(); srv.close(); writeFileSync(`${OUT}/${ENG}.json`, JSON.stringify(R, null, 1)); log('DONE', `bid checks ${R.bidChecks.length} all ok ${R.bidChecks.every(Boolean)}`);
srv.closeAllConnections?.(); process.exit(0);   // start 2 hung ~1 min after DONE on open handles; exit explicitly
