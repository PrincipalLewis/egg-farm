// D2 (rc1) + D3/D4. Kill matrix on the QA build (dist-qa: needs window.eggfarm, which release no longer has);
// D3/D4 + no-window.eggfarm checks on the RELEASE build (dist). Same game code; only the __IOS_FLAG__ hooks differ.
// 1. Kill test: persistent profile, seed the 40-min fixture, buy via the real `button.buy`, SIGKILL the browser's process
//    group after D ms (no graceful shutdown), relaunch on the same profile, check the purchase is still there.
//    D-HOE-20261030-04 m7: the browser is launched through a one-line wrapper that writes its own PID and then `exec`s the
//    real browser (same PID), so we know the exact leader Playwright spawned (detached = its own process group). It is
//    recorded at launch (recorded-pid.mjs: start time, parent, boot id) and only that group is SIGKILLed, after the
//    identity check. No /proc walk, no name or pattern matching.
// 2. ?debug=1 / ?perf=1 do nothing in release (no panel, no overlay, no chunk request).
// Usage: npm run build && npm run build:qa && ENGINE=chromium|firefox|webkit [DELAYS=0,100,500,1000,2000,3000] [REPS=3] node scripts/d2-kill-browser.mjs
// Based on QA's qa/m3-scripts/rc0-ac14f-kill.mjs. Linux only (/proc/<pid>/stat of the recorded pid).
import pw from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ENGINE = process.argv[2] ?? process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4720), REPS = +(process.env.REPS ?? 3);
const DELAYS = (process.env.DELAYS ?? '0,100,500,1000,2000,3000').split(',').map(Number);
import { serveOwn } from './serve-own.mjs'; import { recordPid, killRecorded } from './recorded-pid.mjs';
const s1 = await serveOwn('dist-qa', port), s2 = await serveOwn('dist', port + 1); const srv = { pid: 0 }, srvRel = { pid: 0 };
for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port + 1}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const URL0 = `http://127.0.0.1:${port}/`, URLREL = `http://127.0.0.1:${port + 1}/`, fx = fs.readFileSync(new URL('../tests/fixtures/saves/m2-rc1-v5-40min.json', import.meta.url), 'utf8');
const T = pw[ENGINE]; const opts = ENGINE === 'chromium' ? { args: ['--no-sandbox'] } : {};
const REAL_EXE = ENGINE === 'chromium' ? (process.env.CHROME ?? '/usr/bin/google-chrome') : T.executablePath();
const sq = s => `'${String(s).replace(/'/g, `'\\''`)}'`;
/** `root` is our own mkdtemp dir: profile in root/profile, wrapper and pid file beside it. Returns { ctx, rec }. */
async function launch(root) {
  const wrap = path.join(root, 'launch.sh'), pidFile = path.join(root, 'browser.pid'); fs.rmSync(pidFile, { force: true });
  fs.writeFileSync(wrap, `#!/bin/sh\necho $$ > ${sq(pidFile)}\nexec ${sq(REAL_EXE)} "$@"\n`, { mode: 0o700 });
  const ctx = await T.launchPersistentContext(path.join(root, 'profile'), { ...opts, executablePath: wrap, viewport: { width: 390, height: 844 } });
  const pid = +fs.readFileSync(pidFile, 'utf8').trim(), rec = recordPid(pid);
  if (!rec) { await ctx.close().catch(() => {}); throw new Error(`d2-kill: browser pid ${pid} from ${pidFile} is not a live child of this process`); }
  return { ctx, rec };
}
async function start(ctx, q = '') { const p = ctx.pages()[0] ?? await ctx.newPage(); await p.goto(URL0 + q); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(500);
  const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(300); } return p; }
const rows = []; let fails = 0;
for (const D of DELAYS) for (let rep = 0; rep < REPS; rep++) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `d2kill-${ENGINE}-`));
  let { ctx, rec } = await launch(dir); const p = await ctx.newPage(); await p.goto(URL0);
  await p.evaluate(([r]) => { localStorage.setItem('eggfarm.save', r); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, sessions: 3, workersIntroA: true, workersIntroB: true })); }, [fx]);
  await p.close(); const pg = await start(ctx);
  await pg.evaluate(() => { window.eggfarm.state.coinsCents = 1e12; });
  await pg.evaluate(() => document.querySelector('nav [data-nav=upgrades]').click()); await pg.waitForTimeout(300);
  const lv = () => window.eggfarm.state.farmLevel + 100 * window.eggfarm.state.collectionLevel;
  const L0 = await pg.evaluate(lv);
  await pg.waitForSelector('button.buy[aria-disabled=false]', { state: 'attached', timeout: 10000 }); await pg.evaluate(() => document.querySelector('button.buy[aria-disabled=false]').click());
  const L1 = await pg.evaluate(lv); await new Promise(r => setTimeout(r, D));
  const k = killRecorded(rec, 'SIGKILL', { group: true }); const n = k.ok ? 1 : 0; // groups signalled: only the recorded one
  if (!k.ok) console.log(`d2-kill: REFUSED browser group ${k.pid}: ${k.reason}`);
  await ctx.close().catch(() => {}); await new Promise(r => setTimeout(r, 500));
  ({ ctx, rec } = await launch(dir)); const p2 = await start(ctx);
  const after = await p2.evaluate(() => ({ L: window.eggfarm.state.farmLevel + 100 * window.eggfarm.state.collectionLevel, recovery: document.querySelectorAll('.recovery-card').length }));
  const pass = n > 0 && L1 > L0 && after.L === L1 && after.recovery === 0; if (!pass) fails++;
  rows.push({ D, rep, pass, L0, L1, after: after.L, killed: n });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${ENGINE}] SIGKILL at ${D} ms rep ${rep}: ${L0}->${L1}, reopen ${after.L}, SIGKILLed recorded browser group ${k.pid} (${n ? 'ok' : 'refused'})`);
  await ctx.close().catch(() => {}); fs.rmSync(dir, { recursive: true, force: true });
}
// D3/D4: query params inert in release
{ const dir = fs.mkdtempSync(path.join(os.tmpdir(), `d2flags-${ENGINE}-`)); const { ctx } = await launch(dir); const reqs = [];
  ctx.on('request', r => reqs.push(r.url()));
  const p = await ctx.newPage(); await p.goto(URLREL + '?debug=1&perf=1'); await p.getByText('Tap to start').click(); await p.waitForSelector('#collect'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ dbg: !!document.querySelector('.dbg'), perf: !!document.querySelector('.perf-ov'), perfObj: 'eggfarmPerf' in window, eggfarm: 'eggfarm' in window }));
  const chunk = reqs.filter(u => /frame-sampler|panel-/.test(u));
  const pass = !r.dbg && !r.perf && !r.perfObj && !r.eggfarm && !chunk.length; if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'} [${ENGINE}] ?debug=1&perf=1 inert and no window.eggfarm in release ${JSON.stringify({ ...r, chunk })}`);
  await ctx.close(); fs.rmSync(dir, { recursive: true, force: true }); }
const by = {}; for (const r of rows) { by[r.D] ??= [0, 0]; by[r.D][1]++; if (r.pass) by[r.D][0]++; }
console.log(`SUMMARY [${ENGINE}] ` + Object.entries(by).map(([d, [a, n]]) => `${d}ms ${a}/${n}`).join(', '));
s1.stop(); s2.stop();
process.exit(fails ? 1 : 0);
