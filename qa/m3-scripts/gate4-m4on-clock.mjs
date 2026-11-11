// GATE 4 browser: M4-on closed-tab offline (caps/floor/60 s min), clock forward/back, mid-session reload. Expected values
// come from the game's LIVE balance (m4.offline eggsPerSec/maxEggs2h x Hens offlineMult). Run from the RC worktree (dist-qa):
//   flock .browser-test.lock timeout 600 env PORT=5962 OUT=<dir> BUILD_SHA=<full sha> HENS=15 node qa-clock.mjs <engine>
import { chromium, webkit, firefox } from 'playwright-core';
import { spawn } from 'node:child_process'; import { writeFileSync, mkdirSync } from 'node:fs';
import { expectFromEnv, collectBundleIds } from '/workspace/egg-farm-studio/qa/m3-scripts/build-id-expect.mjs'; const BX = expectFromEnv(); // M41-10: BUILD_SHA (default worktree HEAD), BUILD_DIRTY=require, legacy EXPECT_BUILD
const ENG = process.argv[2] ?? 'chromium', EXPECT = BX.label, OUT = process.env.OUT, port = +(process.env.PORT ?? 5962), base = `http://127.0.0.1:${port}/`;
mkdirSync(`${OUT}/shots`, { recursive: true });
const srv = spawn('npx', ['vite', 'preview', '--outDir', process.env.DIST ?? 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 80; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const browser = ENG === 'webkit' ? await webkit.launch() : ENG === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const R = [], TABLE = []; const ok = (t, n, p, info = '') => R.push({ t, n, pass: !!p, info: JSON.stringify(info) });
const HENS = +(process.env.HENS ?? 15);
// fresh M4 save from the build itself, then patched to a mid-game farm
async function seed() { const c = await browser.newContext(); const p = await c.newPage(); await p.goto(base); const t = p.getByText('Tap to start'); if (await t.count()) await t.first().click();
  await p.waitForFunction(() => window.eggfarm && localStorage.getItem('eggfarm.save'), null, { timeout: 20000 });
  const bids = await p.evaluate(collectBundleIds, BX.scan), bc = BX.check(bids), bid = bids.join(','); // M41-10: all bundle ids, helper check
  const bal = await p.evaluate(() => window.eggfarm.balance); const raw = JSON.parse(await p.evaluate(() => localStorage.getItem('eggfarm.save'))); await c.close(); delete raw.sum;
  raw.state = { ...raw.state, farmLevel: 15, hensLevel: HENS, eggValueLevel: 8, collectionLevel: 4, coinsCents: 12345, basket: 40, coop: 100, customers: [], pendingOfflineEggs: 0 };
  return { bid, bc, bal, raw }; }
const S = await seed(); ok('pre', 'runtime build-id', S.bc.ok, [S.bid, EXPECT, S.bc.reason]); ok('pre', 'live M4 on', !!S.bal.m4?.enabled, S.bal.m4?.enabled);
if (!S.bc.ok) { console.error('BUILD MISMATCH', S.bid, EXPECT, S.bc.reason); process.exit(2); }
const B = S.bal, L = Math.max(0, Math.min(HENS, B.maxLevel)); let mult = 1; for (const x of B.m4.milestones.hens) if (HENS >= x.level) mult = x.offlineMult;
const exp = s => !(s >= B.offline.offlineMinSeconds) ? 0 : Math.floor(Math.min(Math.min(s, B.offline.offlineCapSeconds) * B.m4.offline.eggsPerSec[L], B.m4.offline.maxEggs2h[L]) * mult);
// open with savedAt = deviceNow - awayS; clockShiftS shifts the page clock relative to real time (forward > 0, back < 0)
async function open(awayS, clockShiftS = 0) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(([sv, a, sh]) => { const real = Date.now.bind(Date); Date.now = () => real() + sh * 1000;
    if (!sessionStorage.getItem('qs')) { sessionStorage.setItem('qs', '1'); sv.savedAt = real() - a * 1000; localStorage.setItem('eggfarm.save', JSON.stringify(sv)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false })); } }, [S.raw, awayS, clockShiftS]);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base); const t = page.getByText('Tap to start'); if (await t.count()) await t.first().click().catch(() => {});
  await page.waitForFunction(() => window.eggfarm); await page.waitForTimeout(800); return { ctx, page, errs }; }
async function reload(p) { await p.reload(); await p.waitForTimeout(800); const t = p.getByText('Tap to start'); if (await t.count()) await t.first().click().catch(() => {}); await p.waitForFunction(() => window.eggfarm, null, { timeout: 15000 }); await p.waitForTimeout(800); }
const snap = p => p.evaluate(() => { const g = window.eggfarm, s = g.state, j = JSON.parse(localStorage.getItem('eggfarm.save')); return { pend: s.pendingOfflineEggs, basket: s.basket, coins: s.coinsCents, H: s.hensLevel, V: s.eggValueLevel, v7: s.tracksV7, offline: g.offline, seq: j.saveSeq, savedAt: j.savedAt, rec: g.recovery ?? null }; });
const row = (name, s, got, note = '') => { const e = exp(s); TABLE.push({ name, s, rate: +(B.m4.offline.eggsPerSec[L] * mult).toFixed(4), exp: e, got, d: got - e, st: got === e ? 'OK' : 'BUG', note }); return got === e; };
// (O) closed-tab offline incl. 60 s min, floor, 2 h cap and the maxEggs2h cap
for (const s of [30, 59, 60, 61, 671, 3600, 7199, 7200, 10800, 86400]) { const A = await open(s); const a = await snap(A.page);
  const pass = a.pend === exp(a.offline?.awayS ?? (s < 60 ? 0 : s)); // judged on the game-measured awayS (boot slop can push 59 s past 60 s) row(`closed${s}`, a.offline?.awayS ?? s, a.pend, 'awayS from game');
  ok('(O)', `closed ${s}s: grant = M4 rate x min(away,cap), floor; <60 s none`, pass && !a.rec && !A.errs.length, a); if ([60, 7200, 86400].includes(s)) await A.page.screenshot({ path: `${OUT}/shots/${ENG}-closed-${s}.png` }); await A.ctx.close(); }
// (CF) clock forward: device clock jumps +3 h after the save (savedAt honest, away = 3 h): capped grant, once; reload no 2nd grant
{ const A = await open(0, 3 * 3600); const a = await snap(A.page); row('clockFwd3h', 10800, a.pend, 'cap');
  await reload(A.page); const b = await snap(A.page);
  ok('(CF)', 'clock +3h: one capped M4 grant; reload: no 2nd grant, basket includes 1st', a.pend === exp(10800) && b.pend === 0 && b.basket === a.basket + a.pend, { a, b }); await A.ctx.close(); }
// (CB) clock back: device clock moved back 1 h (savedAt in the future): 0 grant, re-stamped, no loss; then play forward 2 min -> reload grants nothing extra
{ const A = await open(0, -3600); const a = await snap(A.page);
  ok('(CB)', 'clock -1h: savedAt in future -> 0 grant, save re-stamped <= now, coins/basket/levels kept', a.pend === 0 && a.coins === 12345 && a.basket === 40 && a.H === HENS && a.savedAt <= Date.now() - 3600_000 + 5000, a);
  await reload(A.page); const b = await snap(A.page);
  ok('(CB)', 'clock -1h then reload: still no grant (no double/over-credit when clock returns)', b.pend === 0 && b.seq > a.seq, { a, b }); await A.ctx.close(); }
// (CB2) clock back after grant: save at real time, reopen with clock -10 min: no negative/extra grant
{ const A = await open(3600); const a = await snap(A.page); await A.ctx.close(); const sv = { ...S.raw }; 
  ok('(CB2)', '1 h away grant exact', a.pend === exp(3600) || Math.abs(a.pend - exp(a.offline.awayS)) === 0, a); row('closed3600-cb2', a.offline.awayS, a.pend); }
// (MR) mid-session reload: play 10 s, save, reload within 5 s: no grant, state equal, saveSeq advances, M4 kept
{ const A = await open(0); await A.page.waitForTimeout(3000); await A.page.evaluate(() => window.eggfarm.save()); const a = await snap(A.page);
  await reload(A.page); const b = await snap(A.page);
  await A.page.screenshot({ path: `${OUT}/shots/${ENG}-midreload.png` });
  ok('(MR)', 'mid-session reload <60 s: no grant, coins/levels/M4 equal, saveSeq +', b.pend === 0 && b.coins >= a.coins && b.H === a.H && b.V === a.V && b.v7 === 1 && b.seq > a.seq && !b.rec && !A.errs.length, { a, b, errs: A.errs }); await A.ctx.close(); }
await browser.close(); kill();
writeFileSync(`${OUT}/result-${ENG}.json`, JSON.stringify({ R, TABLE }, null, 1));
for (const r of R) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${ENG}] ${r.t} ${r.n}${r.pass ? '' : '  ' + r.info.slice(0, 400)}`);
console.log('| row | elapsed s | M4 rate/s | M4 expected | credited | delta | OK/BUG |\n|---|---|---|---|---|---|---|');
for (const t of TABLE) console.log(`| ${t.name} | ${t.s} | ${t.rate} | ${t.exp} | ${t.got} | ${t.d} | ${t.st} |`);
console.log(`${R.filter(r => r.pass).length}/${R.length} (${ENG})`);
