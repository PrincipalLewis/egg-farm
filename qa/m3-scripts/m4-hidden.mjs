// m4-hidden (M4 ON variant of pr25-fwd-hidden.mjs): expected grant = game's live M4 offline rate (balance.m4.offline + Hens milestone offlineMult), floor, 2h cap, 60s min. Tolerance: exact (0 eggs) for the hide path; reload path +-ceil(rate*1s) load slop.
// pr25-fwd: from qa-hidden-59cce62.mjs; DIST env (dist-qa|dist-qa-m4); 2h row expects shipped v1 copy '2h+' (v2 'capped at 2h' is PR #16).
// QA hidden-tab offline @ BUILD. node qa-hidden.mjs <engine>  (cwd = worktree with dist-qa; PORT, EXPECT_BUILD, OUT env)
import { chromium, webkit, firefox } from 'playwright-core';
import { spawn } from 'node:child_process'; import { writeFileSync, mkdirSync } from 'node:fs';
import { expectFromEnv, collectBundleIds } from '/workspace/egg-farm-studio/qa/m3-scripts/build-id-expect.mjs'; const BX = expectFromEnv(); // M41-10: BUILD_SHA (default worktree HEAD), BUILD_DIRTY=require, legacy EXPECT_BUILD
const ENG = process.argv[2] ?? 'chromium', EXPECT = BX.label, OUT = process.env.OUT; mkdirSync(`${OUT}/shots`, { recursive: true });
const port = +(process.env.PORT ?? 4311), base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--outDir', process.env.DIST ?? 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 80; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const browser = ENG === 'webkit' ? await webkit.launch() : ENG === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const R = []; const ok = (t, name, pass, info = '') => R.push({ t, name, pass: !!pass, info: typeof info === 'string' ? info : JSON.stringify(info) });
let SAVE = null;
async function getSave() { const c = await browser.newContext(); const p = await c.newPage(); await p.goto(base); const t = p.getByText('Tap to start'); if (await t.count()) await t.first().click(); await p.waitForTimeout(600);
  const bids = await p.evaluate(collectBundleIds, BX.scan), bc = BX.check(bids), bid = bids.join(','); // M41-10: all bundle ids, helper check
  if (!bc.ok) { console.error('BUILD MISMATCH', bid, EXPECT, bc.reason); process.exit(2); }
  await p.waitForFunction(() => localStorage.getItem('eggfarm.save'), null, { timeout: 15000 }); const raw = JSON.parse(await p.evaluate(() => localStorage.getItem('eggfarm.save'))); await c.close(); delete raw.sum;
  raw.state = { ...raw.state, hensLevel: +(process.env.HENS ?? 15), farmLevel: 15, collectionLevel: 4, coinsCents: 12345, basket: 40, coop: 100, customers: [], pendingOfflineEggs: 0 }; return { raw, bid }; }
// page with controllable clock + visibility. awayS = savedAt age at load (0 = fresh).
async function open(awayS = 0) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(([sv, a]) => {
    const realNow = Date.now.bind(Date); let frozen = null; window.__clk = { freeze() { frozen = realNow() + (window.__clk.off || 0); }, adv(ms) { frozen += ms; }, now: () => frozen ?? realNow() };
    Date.now = () => window.__clk.now();
    let vis = 'visible'; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => vis }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => vis === 'hidden' });
    window.__setVis = v => { vis = v; document.dispatchEvent(new Event('visibilitychange')); };
    window.__arrivals = 0;
    if (!sessionStorage.getItem('qs')) { sessionStorage.setItem('qs', '1'); sv.savedAt = realNow() - a * 1000; localStorage.setItem('eggfarm.save', JSON.stringify(sv)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false })); }
  }, [SAVE.raw, awayS]);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base); const t = page.getByText('Tap to start'); if (await t.count()) await t.first().click().catch(() => {});
  await page.waitForFunction(() => window.eggfarm); await page.waitForTimeout(800);
  return { ctx, page, errs };
}
const snap = page => page.evaluate(() => { const g = window.eggfarm, s = g.state, c = document.querySelector('.welcome-v2, #modal-layer.open .card');
  return { pend: s.pendingOfflineEggs, basket: s.basket, coop: s.coop, coins: s.coinsCents, cust: s.customers.length, nextId: s.nextCustomerId, offline: g.offline, popup: c ? c.innerText.replace(/\n+/g, ' | ') : null }; });
// hide for H seconds with the clock frozen, let frames run while hidden, then show
async function hideFor(page, H, framesMs = 1500) {
  await page.evaluate(() => { window.__clk.freeze(); window.__setVis('hidden'); });
  await page.evaluate(h => window.__clk.adv(h * 1000), H); await page.waitForTimeout(framesMs); // throttled frames see the jump
  await page.evaluate(() => window.__setVis('visible')); await page.waitForTimeout(700);
}
const fixedEggs = H => Math.floor(Math.min(H, 7200) * 0.25 * 16); // old script expectation (flag-off, F15)
let BAL = null, HENS = 0;
const mult = () => { let m = 1; for (const x of BAL.m4.milestones.hens) if (HENS >= x.level) m = x.offlineMult; return m; };
const rate = () => BAL.m4.offline.eggsPerSec[Math.max(0, Math.min(HENS, BAL.maxLevel))] * mult();
const expEggs = H => { if (!(H >= BAL.offline.offlineMinSeconds)) return 0; const L = Math.max(0, Math.min(HENS, BAL.maxLevel));
  return Math.floor(Math.min(Math.min(H, BAL.offline.offlineCapSeconds) * BAL.m4.offline.eggsPerSec[L], BAL.m4.offline.maxEggs2h[L]) * mult()); };
const TABLE = []; const row = (name, H, credited) => { const e = expEggs(H); TABLE.push({ row: name, elapsedS: H, m4RatePerS: +rate().toFixed(4), scriptFixed: fixedEggs(H), m4Expected: e, credited, delta: credited - e, status: credited === e ? 'OK' : 'BUG' }); };
const res = { engine: ENG, build: EXPECT, cases: {} };
SAVE = await getSave();
{ const A = await open(0); const x = await A.page.evaluate(() => ({ b: window.eggfarm.balance, h: window.eggfarm.state.hensLevel, on: !!window.eggfarm.balance.m4?.enabled })); BAL = x.b; HENS = x.h; res.m4 = { on: x.on, hens: HENS, rate: rate(), mult: mult() }; ok('(M4)', `live balance m4.enabled on, hens ${HENS}, rate ${rate()}/s`, x.on && (process.env.HENS === undefined || HENS === +process.env.HENS), res.m4); await A.ctx.close(); }
// (1) hide >= 60 s vs close+reload
for (const H of [61, 120, 671, 10800]) {
  const A = await open(0); const a0 = await snap(A.page); await hideFor(A.page, H); const a1 = await snap(A.page); row(`hide${H}`, H, a1.pend);
  await A.page.screenshot({ path: `${OUT}/shots/${ENG}-hide-${H}s.png` });
  const B = await open(H); const b1 = await snap(B.page); await B.page.screenshot({ path: `${OUT}/shots/${ENG}-reload-${H}s.png` });
  res.cases[`hide${H}`] = { a0, a1, b1, errs: A.errs.concat(B.errs) };
  const _n = p => p && p.replace(/\d+m \d+s|\d+h \d+m|\d+m|\d+s/, 'T');
  ok('(1)', `${H}s hide: N = ${expEggs(H)} exact`, a1.pend === expEggs(H), [a1.pend, a1.offline]);
  ok('(1)', `${H}s hide == reload: both N = M4 rate x min(away,cap) for their own away (reload has ~0.5 s load slop), basket/coins/customers equal, coop ±2`, a1.pend === expEggs(a1.offline.awayS) && b1.pend === expEggs(b1.offline.awayS) && a1.basket === b1.basket && Math.abs(a1.coop - b1.coop) <= 2 && a1.coins === b1.coins && a1.cust === b1.cust, { hide: a1, reload: b1 });
  ok('(1)', `${H}s popup same text as reload${H >= 7200 ? ' incl. 2h cap' : ''}`, a1.popup && b1.popup && (a1.popup === b1.popup || a1.popup.replace(/[\d,]+/g, '#') === b1.popup.replace(/[\d,]+/g, '#')) && (H >= 7200 ? /away 2h\+/i.test(a1.popup) : !/2h\+/.test(a1.popup)), { hide: a1.popup, reload: b1.popup });
  ok('(OC)', `${H}s coins: hide == reload and unchanged by hide (no live-sim sales stacked on grant)`, a1.coins === b1.coins && a1.coins === a0.coins, [a0.coins, a1.coins, b1.coins]);
  ok('(1)', `${H}s no over-credit arrivals (customers/nextId unchanged from hide)`, a1.nextId === a0.nextId, [a0.nextId, a1.nextId]);
  await A.ctx.close(); await B.ctx.close();
}
// (2)/(3) short hides and boundary
for (const H of [30, 59, 59.999, 60]) {
  const A = await open(0); const a0 = await snap(A.page); await hideFor(A.page, H); const a1 = await snap(A.page); res.cases[`hide${H}`] = { a0, a1, errs: A.errs };
  if (H < 60) ok(H === 59.999 ? '(3)' : '(2)', `${H}s hide: no popup, no grant, played online (coop/basket progressed or customers moved)`, !a1.popup && a1.pend === 0 && (a1.coop > a0.coop || a1.coins !== a0.coins || a1.nextId !== a0.nextId), { a0, a1 });
  else { row('hide60', 60, a1.pend); ok('(3)', `60s hide: grant ${expEggs(60)} + popup "Away 1m"`, a1.pend === expEggs(60) && a1.popup && /You were away 1m\b/.test(a1.popup), a1); }
  await A.ctx.close();
}
// (4) no double credit (clock advances between periods)
{ const A = await open(0); const p = A.page;
  await p.evaluate(() => { window.__clk.freeze(); window.__setVis('hidden'); window.__clk.adv(100); window.__setVis('visible'); }); await p.waitForTimeout(300); const f = await snap(p);
  ok('(4)', 'fast hide/show (0.1 s): no grant/popup', f.pend === 0 && !f.popup, f);
  await p.evaluate(() => { window.__clk.adv(1000); window.__setVis('hidden'); window.__clk.adv(671000); window.__setVis('hidden'); window.__setVis('visible'); window.__setVis('visible'); }); await p.waitForTimeout(700); const g1 = await snap(p); row('dbl671', 671, g1.pend);
  ok('(4)', 'double hidden + double visible for 671s: exactly one grant (M4) + popup', g1.pend === expEggs(671) && !!g1.popup, g1);
  await p.evaluate(() => { const b = document.querySelector('#wbCollect'); b && b.click(); }); await p.waitForTimeout(300); const g2 = await snap(p);
  await p.evaluate(() => { window.__clk.adv(1000); window.__setVis('hidden'); window.__clk.adv(671000); window.__setVis('visible'); }); await p.waitForTimeout(700); const g3 = await snap(p); row('second671', 671, g3.pend);
  ok('(4)', 'second separate 671s hide after Collect: one more grant; basket = 40 + grant', g3.pend === expEggs(671) && g2.basket === 40 + expEggs(671), { g2, g3 });
  await p.evaluate(() => { const b = document.querySelector('#wbCollect'); b && b.click(); }); await p.waitForTimeout(300);
  for (let i = 0; i < 5; i++) await p.evaluate(() => { window.__clk.adv(1000); window.__setVis('hidden'); window.__clk.adv(10000); window.__setVis('visible'); });
  await p.waitForTimeout(500); const g4 = await snap(p);
  ok('(4)', '5 x 10s hides: no grant, no popup', g4.pend === 0 && !g4.popup, g4);
  res.cases.dbl = { f, g1, g2, g3, g4, errs: A.errs }; ok('errors', '(4) no page errors', !A.errs.length, A.errs); await A.ctx.close(); }
// (4b) edge: second hide in the SAME millisecond as a previous accounted hide (startAt reused)
{ const A = await open(0); const p = A.page;
  await p.evaluate(() => { window.__clk.freeze(); window.__setVis('hidden'); window.__setVis('visible'); window.__setVis('hidden'); window.__clk.adv(671000); window.__setVis('visible'); }); await p.waitForTimeout(1500); const e1 = await snap(p); row('sameMs671', 671, e1.pend);
  const st = await p.evaluate(() => ({ hiddenSince: window.eggfarm.hiddenSince, isHidden: window.eggfarm.isHidden }));
  res.cases.sameMs = { e1, st }; ok('(4b)', 'same-ms re-hide: 671s still granted once, game not stuck hidden', e1.pend === expEggs(671) && !st.isHidden, { e1, st }); await A.ctx.close(); }
// (m1) freeze while hidden: deactivate / refuseNewer settle the period as 'none'
for (const how of ['deactivate', 'refuseNewer']) { const A = await open(0); const p = A.page;
  await p.evaluate(() => { window.__clk.freeze(); window.__setVis('hidden'); window.__clk.adv(5000); }); await p.waitForTimeout(300);
  const before = await p.evaluate(h => { const g = window.eggfarm; if (h === 'deactivate') g.deactivate(); else g.refuseNewer(99); return { isHidden: g.isHidden, sv: localStorage.getItem('eggfarm.save') }; }, how);
  await p.evaluate(() => window.__clk.adv(671000)); await p.waitForTimeout(1500); await p.evaluate(() => window.__setVis('visible')); await p.waitForTimeout(1000);
  const m = await snap(p); const after = await p.evaluate(() => ({ isHidden: window.eggfarm.isHidden, inactive: window.eggfarm.inactive, sv: localStorage.getItem('eggfarm.save') }));
  await p.screenshot({ path: `${OUT}/shots/${ENG}-m1-${how}.png` });
  res.cases[`m1_${how}`] = { m, isHiddenAtFreeze: before.isHidden, after: { ...after, sv: undefined }, saveUnchanged: before.sv === after.sv, errs: A.errs };
  ok('(m1)', `hide + ${how}: period closed at freeze, 671s later show -> no grant, no popup, no save write, not stuck hidden`, !before.isHidden && !after.isHidden && after.inactive && m.pend === 0 && !m.popup && before.sv === after.sv, res.cases[`m1_${how}`]); await A.ctx.close(); }
await browser.close(); kill();
writeFileSync(`${OUT}/result-${ENG}.json`, JSON.stringify({ res, R, TABLE }, null, 1));
console.log('| row | elapsed s | M4 rate/s | script-fixed exp | M4 exp | credited | delta | OK/BUG |\n|---|---|---|---|---|---|---|---|');
for (const t of TABLE) console.log(`| ${t.row} | ${t.elapsedS} | ${t.m4RatePerS} | ${t.scriptFixed} | ${t.m4Expected} | ${t.credited} | ${t.delta} | ${t.status} |`);
for (const r of R) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${ENG}] ${r.t} ${r.name}${r.pass ? '' : '  ' + r.info.slice(0, 500)}`);
console.log(`${R.filter(r => r.pass).length}/${R.length} (${ENG})`);
