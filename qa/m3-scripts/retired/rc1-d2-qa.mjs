// RETIRED 2026-10-30, rule 21, /proc walk + SIGKILL (QA-D-1030-KILLS). Do not run.
// QA independent D2 kill matrix (rc1 4bf4a22). Usage: ENGINE=.. PORT=.. MODES=delay,hidden,appswitch,sametask node rc1-d2-qa.mjs <worktree>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4800), REPS = +(process.env.REPS ?? 3);
const pw = createRequire(ROOT + '/package.json')('playwright-core');
try { await fetch(`http://127.0.0.1:${port}/`); console.error(`port ${port} already serving (stale server?) - refusing`); process.exit(3); } catch {} // served-bundle guard (98396ed)
const srv = spawn('npx', ['vite', 'preview', '--outDir', process.env.DIST ?? 'dist', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
for (let i = 0; i < 80; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
{ const _d = process.env.DIST ?? 'dist', _w = fs.readdirSync(`${ROOT}/${_d}/assets`).find(f => /^index-.*\.js$/.test(f)), _h = await (await fetch(`http://127.0.0.1:${port}/`)).text(); if (!_h.includes(_w)) { console.error(`served bundle is not ${_d}/${_w} - refusing`); process.exit(4); } }
const URL0 = `http://127.0.0.1:${port}/`, fx = fs.readFileSync('/tmp/qa-save-4bf4a22/tests/fixtures/saves/m2-rc1-v5-40min.json', 'utf8');
const T = pw[ENGINE]; const opts = ENGINE === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {};
const procs = () => fs.readdirSync('/proc').filter(x => /^\d+$/.test(x));
const mob = ENGINE === 'webkit' ? pw.devices['iPhone 13'] : pw.devices['Pixel 7'];
const launch = (dir, m) => { const d = m && ENGINE !== 'firefox' ? { ...mob } : { viewport: { width: 390, height: 844 } }; delete d.defaultBrowserType; return T.launchPersistentContext(dir, { ...opts, ...d }); };
async function start(ctx) { const p = ctx.pages()[0] ?? await ctx.newPage(); await p.goto(URL0); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(500);
  const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(300); } return p; }
function killTree(rootPid) { const kids = pid => procs().filter(x => { try { return fs.readFileSync(`/proc/${x}/stat`, 'utf8').split(') ')[1].split(' ')[1] == pid; } catch { return false; } });
  const all = []; const walk = p => { all.push(p); for (const k of kids(p)) walk(k); }; walk(String(rootPid)); for (const p of all) { try { process.kill(+p, 'SIGKILL'); } catch {} } return all.length; }
const lv = () => window.eggfarm.state.farmLevel + 100 * window.eggfarm.state.collectionLevel;
const rows = [];
async function run(mode, D, rep) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `qad2-${ENGINE}-`)); const before = new Set(procs()); const m = mode === 'appswitch';
  let ctx = await launch(dir, m); const p = await ctx.newPage(); await p.goto(URL0);
  await p.evaluate(([r]) => { localStorage.setItem('eggfarm.save', r); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, sessions: 3, workersIntroA: true, workersIntroB: true })); }, [fx]);
  await p.close(); const pg = await start(ctx);
  await pg.evaluate(() => { window.eggfarm.state.coinsCents = 1e12; window.eggfarm.save(); });
  await pg.waitForTimeout(1500); // let the seeded save reach disk (baseline B)
  const B = await pg.evaluate(lv);
  await pg.evaluate(() => document.querySelector('nav [data-nav=upgrades]').click()); await pg.waitForTimeout(300);
  await pg.waitForSelector('button.buy[aria-disabled=false]', { state: 'attached', timeout: 10000 });
  let vis = null;
  if (mode === 'sametask') { // click + busy-block the page task; kill while blocked (purchase never leaves the task)
    pg.evaluate(() => { document.querySelector('button.buy[aria-disabled=false]').click(); window.__L1 = 0; const t = performance.now(); while (performance.now() - t < 4000); }).catch(() => {});
    await new Promise(r => setTimeout(r, 300));
  } else {
    await pg.evaluate(() => { for (let i = 0; i < 3; i++) document.querySelector('button.buy[aria-disabled=false]')?.click(); }); // 3 purchases
    if (mode === 'hidden') { const p3 = await ctx.newPage(); await p3.goto('about:blank'); await p3.bringToFront(); await new Promise(r => setTimeout(r, 300)); vis = await pg.evaluate(() => document.visibilityState).catch(() => '?'); }
    if (m) vis = await pg.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); return 'sim-hidden+pagehide'; });
    await new Promise(r => setTimeout(r, D));
  }
  const L1 = mode === 'sametask' ? B + 1 : await pg.evaluate(lv);
  const cand = procs().filter(x => !before.has(x)).filter(x => { try { return fs.readFileSync(`/proc/${x}/cmdline`, 'utf8').includes(dir); } catch { return false; } });
  const n = cand.length ? killTree(cand.sort((a, b) => a - b)[0]) : 0;
  await ctx.close().catch(() => {}); await new Promise(r => setTimeout(r, 500));
  ctx = await launch(dir, m); const p2 = await start(ctx);
  const a = await p2.evaluate(() => ({ L: window.eggfarm.state.farmLevel + 100 * window.eggfarm.state.collectionLevel, coins: window.eggfarm.state.coinsCents, newGame: window.eggfarm.isNewGame, recovery: document.querySelectorAll('.recovery-card').length }));
  const lost = L1 - a.L, wholeLost = a.newGame || a.coins < 1e11;
  const row = { mode, D, rep, B, L1, after: a.L, lost, wholeLost, recovery: a.recovery, vis, killed: n }; rows.push(row);
  console.log(`${lost === 0 && !wholeLost ? 'OK  ' : 'LOSS'} [${ENGINE}] ${JSON.stringify(row)}`);
  await ctx.close().catch(() => {}); fs.rmSync(dir, { recursive: true, force: true });
}
const MODES = (process.env.MODES ?? 'delay,hidden,appswitch,sametask').split(',');
for (const mode of MODES) {
  if (mode === 'appswitch' && ENGINE === 'firefox') continue;
  const Ds = mode === 'delay' ? (process.env.DELAYS ?? '0,100,500,1000,2000,3000').split(',').map(Number) : mode === 'sametask' ? [0] : [0, 500];
  for (const D of Ds) for (let r = 0; r < REPS; r++) await run(mode, D, r).catch(e => { console.log(`ERR [${ENGINE}] ${mode} ${D} ${e.message.split('\n')[0]}`); rows.push({ mode, D, rep: r, err: e.message.split('\n')[0] }); });
}
fs.writeFileSync(process.env.OUT ?? `/tmp/qad2-${ENGINE}.json`, JSON.stringify(rows, null, 1)); try { process.kill(-srv.pid); } catch {}
process.exit(0);
