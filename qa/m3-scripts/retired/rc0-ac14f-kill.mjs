// RETIRED 2026-10-30, rule 21, /proc walk + SIGKILL (QA-D-1030-KILLS). Do not run.
// QA AC14f proxy @m3-rc0: buy Farm upgrade via the real button, SIGKILL the whole browser process after D ms, relaunch on the
// same profile, check the purchase persisted (and one offline/welcome modal max). Also 14e clock tamper in-browser.
// Usage: PORT=.. ENGINE=chromium|firefox|webkit node rc0-ac14f-kill.mjs <worktree>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4700);
const pw = createRequire(ROOT + '/package.json')('playwright-core');
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const URL0 = `http://127.0.0.1:${port}/`, fx = fs.readFileSync(ROOT + '/tests/fixtures/saves/m2-rc1-v5-40min.json', 'utf8');
const R = []; const ok = (n, p, i) => { R.push({ n, pass: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n} — ${JSON.stringify(i)}`); };
const T = pw[ENGINE]; const opts = ENGINE === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {};
const launch = dir => T.launchPersistentContext(dir, { ...opts, viewport: { width: 390, height: 844 } });
const pids = () => new Set(fs.readdirSync('/proc').filter(x => /^\d+$/.test(x)));
async function start(ctx) { const p = ctx.pages()[0] ?? await ctx.newPage(); await p.goto(URL0); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(500);
  const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(300); } return p; }
function killTree(rootPid) { // SIGKILL browser + all descendants (renderers/storage service), no graceful shutdown
  const kids = pid => fs.readdirSync('/proc').filter(x => /^\d+$/.test(x)).filter(x => { try { return fs.readFileSync(`/proc/${x}/stat`, 'utf8').split(') ')[1].split(' ')[1] == pid; } catch { return false; } });
  const all = []; const walk = p => { all.push(p); for (const k of kids(p)) walk(k); }; walk(String(rootPid)); for (const p of all) { try { process.kill(+p, 'SIGKILL'); } catch {} } return all.length; }
function browserPid(ctx) { const b = ctx.browser?.(); const pr = b?.process?.(); if (pr) return pr.pid; return null; }
for (const D of (process.env.DELAYS ?? '0,100,500,1000,2000').split(',').map(Number)) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `qa14f-${ENGINE}-`)); const before = pids();
  let ctx = await launch(dir); const p = await ctx.newPage(); await p.goto(URL0);
  await p.evaluate(([r]) => { localStorage.setItem('eggfarm.save', r); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, sessions: 3, workersIntroA: true, workersIntroB: true })); }, [fx]);
  await p.close(); const pg = await start(ctx);
  await pg.evaluate(() => { window.eggfarm.state.coinsCents = 1e12; });
  await pg.evaluate(() => document.querySelector('nav [data-nav=upgrades]').click()); await pg.waitForTimeout(300);
  const F0 = await pg.evaluate(() => window.eggfarm.state.farmLevel + 100 * window.eggfarm.state.collectionLevel);
  await pg.waitForSelector('button.buy[aria-disabled=false]', { state: 'attached', timeout: 10000 }); await pg.evaluate(() => document.querySelector('button.buy[aria-disabled=false]').click());
  const F1 = await pg.evaluate(() => window.eggfarm.state.farmLevel + 100 * window.eggfarm.state.collectionLevel); await new Promise(r => setTimeout(r, D));
  // find the browser main process: new pids whose cmdline contains the profile dir
  const cand = [...pids()].filter(x => !before.has(x)).filter(x => { try { return fs.readFileSync(`/proc/${x}/cmdline`, 'utf8').includes(dir); } catch { return false; } });
  const root = cand.sort((a, b) => a - b)[0]; const n = root ? killTree(root) : 0;
  await ctx.close().catch(() => {}); await new Promise(r => setTimeout(r, 500));
  ctx = await launch(dir); const p2 = await start(ctx);
  const after = await p2.evaluate(() => ({ F: window.eggfarm.state.farmLevel + 100 * window.eggfarm.state.collectionLevel, modals: document.querySelectorAll('#modal-layer.open .card').length, recovery: document.querySelectorAll('.recovery-card').length }));
  ok(`14f buy upgrade (100*C+F) ${F0}->${F1}, SIGKILL ${n} procs after ${D} ms, reopen -> purchase persisted, <=1 modal, no recovery dialog`, F1 > F0 && after.F === F1 && after.modals <= 1 && after.recovery === 0, { F0, F1, after, killed: n });
  await ctx.close().catch(() => {}); fs.rmSync(dir, { recursive: true, force: true });
}
// 14e in browser: shift saved timestamp
for (const [label, shiftH] of [['-1 h (clock back)', -1], ['+10 h', 10], ['+2 h exactly', 2]]) {
  const b = ENGINE === 'chromium' ? await pw.chromium.launch(opts) : await T.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const sv = JSON.parse(fx); const key = Object.keys(sv).find(k => /savedAt|ts|time/i.test(k));
  sv[key] = Date.now() - shiftH * -1 * 3600e3 * -1 - shiftH * 3600e3 * 0; // placeholder overwritten below
  sv[key] = Date.now() - shiftH * 3600e3; // savedAt in the past by shiftH (negative = future)
  await p.addInitScript(([r]) => { if (!sessionStorage.s) { localStorage.setItem('eggfarm.save', r); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, sessions: 3 })); sessionStorage.s = 1; } }, [JSON.stringify(sv)]);
  await p.goto(URL0); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const s = window.eggfarm.state; return { pending: s.pendingOfflineEggs, cd: s.manageCdS, energies: Object.values(s.workers || {}).map(w => w.energy), neg: JSON.stringify(s).match(/:-\d/g), modal: document.querySelector('#modal-layer.open')?.innerText?.slice(0, 120) }; });
  const exp = fx && JSON.parse(fx); const e0 = Object.values(exp.state?.workers ?? exp.workers ?? {}).map(w => w.energy);
  ok(`14e ${label} (key ${key})`, shiftH < 0 ? r.pending === 0 && !r.neg : r.cd <= 30 && !r.neg, { ...r, fixtureEnergies: e0 });
  await b.close();
}
fs.writeFileSync(`/workspace/egg-farm-studio/qa/m3-rc0/ac14f-${ENGINE}.json`, JSON.stringify(R, null, 1)); try { process.kill(-srv.pid); } catch {}
console.log(`TOTAL ${R.filter(r => r.pass).length}/${R.length}`); process.exit(0);
