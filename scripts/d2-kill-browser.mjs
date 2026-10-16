// D2 (rc1) + D3/D4. Kill matrix on the QA build (dist-qa: needs window.eggfarm, which release no longer has);
// D3/D4 + no-window.eggfarm checks on the RELEASE build (dist). Same game code; only the __IOS_FLAG__ hooks differ.
// 1. Kill test: persistent profile, seed the 40-min fixture, buy via the real `button.buy`, SIGKILL the whole browser
//    process tree after D ms (no graceful shutdown), relaunch on the same profile, check the purchase is still there.
// 2. ?debug=1 / ?perf=1 do nothing in release (no panel, no overlay, no chunk request).
// Usage: npm run build && npm run build:qa && ENGINE=chromium|firefox|webkit [DELAYS=0,100,500,1000,2000,3000] [REPS=3] node scripts/d2-kill-browser.mjs
// Based on QA's qa/m3-scripts/rc0-ac14f-kill.mjs. Linux only (/proc).
import pw from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ENGINE = process.argv[2] ?? process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4720), REPS = +(process.env.REPS ?? 3);
const DELAYS = (process.env.DELAYS ?? '0,100,500,1000,2000,3000').split(',').map(Number);
const serve = (dir, p) => spawn('npx', ['vite', 'preview', '--outDir', dir, '--port', '' + p, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const srv = serve('dist-qa', port), srvRel = serve('dist', port + 1);
for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port + 1}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const URL0 = `http://127.0.0.1:${port}/`, URLREL = `http://127.0.0.1:${port + 1}/`, fx = fs.readFileSync(new URL('../tests/fixtures/saves/m2-rc1-v5-40min.json', import.meta.url), 'utf8');
const T = pw[ENGINE]; const opts = ENGINE === 'chromium' ? { executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {};
const launch = dir => T.launchPersistentContext(dir, { ...opts, viewport: { width: 390, height: 844 } });
const procs = () => fs.readdirSync('/proc').filter(x => /^\d+$/.test(x));
async function start(ctx, q = '') { const p = ctx.pages()[0] ?? await ctx.newPage(); await p.goto(URL0 + q); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(500);
  const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(300); } return p; }
function killTree(rootPid) {
  const kids = pid => procs().filter(x => { try { return fs.readFileSync(`/proc/${x}/stat`, 'utf8').split(') ')[1].split(' ')[1] == pid; } catch { return false; } });
  const all = []; const walk = p => { all.push(p); for (const k of kids(p)) walk(k); }; walk(String(rootPid)); for (const p of all) { try { process.kill(+p, 'SIGKILL'); } catch {} } return all.length; }
const rows = []; let fails = 0;
for (const D of DELAYS) for (let rep = 0; rep < REPS; rep++) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `d2kill-${ENGINE}-`)); const before = new Set(procs());
  let ctx = await launch(dir); const p = await ctx.newPage(); await p.goto(URL0);
  await p.evaluate(([r]) => { localStorage.setItem('eggfarm.save', r); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, sessions: 3, workersIntroA: true, workersIntroB: true })); }, [fx]);
  await p.close(); const pg = await start(ctx);
  await pg.evaluate(() => { window.eggfarm.state.coinsCents = 1e12; });
  await pg.evaluate(() => document.querySelector('nav [data-nav=upgrades]').click()); await pg.waitForTimeout(300);
  const lv = () => window.eggfarm.state.farmLevel + 100 * window.eggfarm.state.collectionLevel;
  const L0 = await pg.evaluate(lv);
  await pg.waitForSelector('button.buy[aria-disabled=false]', { state: 'attached', timeout: 10000 }); await pg.evaluate(() => document.querySelector('button.buy[aria-disabled=false]').click());
  const L1 = await pg.evaluate(lv); await new Promise(r => setTimeout(r, D));
  const cand = procs().filter(x => !before.has(x)).filter(x => { try { return fs.readFileSync(`/proc/${x}/cmdline`, 'utf8').includes(dir); } catch { return false; } });
  const root = cand.sort((a, b) => a - b)[0]; const n = root ? killTree(root) : 0;
  await ctx.close().catch(() => {}); await new Promise(r => setTimeout(r, 500));
  ctx = await launch(dir); const p2 = await start(ctx);
  const after = await p2.evaluate(() => ({ L: window.eggfarm.state.farmLevel + 100 * window.eggfarm.state.collectionLevel, recovery: document.querySelectorAll('.recovery-card').length }));
  const pass = n > 0 && L1 > L0 && after.L === L1 && after.recovery === 0; if (!pass) fails++;
  rows.push({ D, rep, pass, L0, L1, after: after.L, killed: n });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${ENGINE}] kill ${D} ms rep ${rep}: ${L0}->${L1}, reopen ${after.L}, killed ${n} procs`);
  await ctx.close().catch(() => {}); fs.rmSync(dir, { recursive: true, force: true });
}
// D3/D4: query params inert in release
{ const dir = fs.mkdtempSync(path.join(os.tmpdir(), `d2flags-${ENGINE}-`)); const ctx = await launch(dir); const reqs = [];
  ctx.on('request', r => reqs.push(r.url()));
  const p = await ctx.newPage(); await p.goto(URLREL + '?debug=1&perf=1'); await p.getByText('Tap to start').click(); await p.waitForSelector('#collect'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ dbg: !!document.querySelector('.dbg'), perf: !!document.querySelector('.perf-ov'), perfObj: 'eggfarmPerf' in window, eggfarm: 'eggfarm' in window }));
  const chunk = reqs.filter(u => /frame-sampler|panel-/.test(u));
  const pass = !r.dbg && !r.perf && !r.perfObj && !r.eggfarm && !chunk.length; if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'} [${ENGINE}] ?debug=1&perf=1 inert and no window.eggfarm in release ${JSON.stringify({ ...r, chunk })}`);
  await ctx.close(); fs.rmSync(dir, { recursive: true, force: true }); }
const by = {}; for (const r of rows) { by[r.D] ??= [0, 0]; by[r.D][1]++; if (r.pass) by[r.D][0]++; }
console.log(`SUMMARY [${ENGINE}] ` + Object.entries(by).map(([d, [a, n]]) => `${d}ms ${a}/${n}`).join(', '));
try { process.kill(-srv.pid); } catch {} try { process.kill(-srvRel.pid); } catch {}
process.exit(fails ? 1 : 0);
