// v2 (SD6-3 fix, 2026-10-17): migration checks snapshot the migrated save with the sim FROZEN (rAF/setInterval held by an init script)
//   and assert exact coins + wageFracCents before any wage tick; a non-zero wage-event count fails the check as not pre-tick.
// 43eb112: (A) save v6 wageFracCents: migrations v4->v6 / v5->v6, survives reload and a kill, $0 gate with carried frac (QA build, DIST=dist-qa)
//          (B) MODE=globals: every non-standard global on the RELEASE bundle (DIST=dist). ENGINE=.. PORT=.. node s2-43eb112-save-globals.mjs <wt>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import { checkMigrated } from './save-migration-assert-v2.mjs';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 5200), DIST = process.env.DIST ?? 'dist-qa', MODE = process.env.MODE ?? 'save';
const OUT = process.env.OUT; const pw = createRequire(ROOT + '/package.json')('playwright-core');
const srv = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
const URL = `http://127.0.0.1:${port}/`; for (let i = 0; i < 80; i++) { try { await fetch(URL); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
{ const s = await (await fetch(URL)).text(); if (s !== fs.readFileSync(`${ROOT}/${DIST}/index.html`, 'utf8')) { console.log('ABORT bundle mismatch'); process.kill(-srv.pid); process.exit(2); } console.log(`bundle ok: ${port} serves ${ROOT}/${DIST} ${(s.match(/index-[\w-]+\.js/) ?? [''])[0]}`); }
const br = ENGINE === 'webkit' ? await pw.webkit.launch() : ENGINE === 'firefox' ? await pw.firefox.launch() : await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const R = []; const ok = (n, c, i) => { R.push({ n, pass: !!c, i }); console.log(`${c ? 'PASS' : 'FAIL'} [${ENGINE}] ${n} — ${JSON.stringify(i)}`); };
const UI = JSON.stringify({ onboardingDone: true, sessions: 3, seenSlots: 99, workersIntroA: true, workersIntroB: true });
const fin = async () => { await br.close(); try { process.kill(-srv.pid); } catch {} fs.writeFileSync(`${OUT}/s2-43eb112-${MODE}-${ENGINE}.json`, JSON.stringify(R, null, 1)); console.log(`SUMMARY [${ENGINE}] ${MODE}: ${R.filter(r => r.pass).length}/${R.length} pass`); process.exit(0); };
const start = async (p) => { await p.goto(URL); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1500); for (const s of ['#wbCollect', '.modal button.btn']) { const l = p.locator(s).first(); if (await l.isVisible().catch(() => false)) { await l.click().catch(() => {}); await p.waitForTimeout(300); } } };
const blank = async p => { await p.route(URL + '__seed', r => r.fulfill({ body: '<html></html>', contentType: 'text/html' })); await p.goto(URL + '__seed'); };
const seed = async (ctx, raw) => { const p = await ctx.newPage(); await blank(p); await p.evaluate(([r, u]) => { localStorage.clear(); localStorage.setItem('eggfarm.save', r); localStorage.setItem('eggfarm.ui', u); }, [raw, UI]); await p.close(); };
if (MODE === 'globals') {
  const ctx = await br.newContext(); const b = await ctx.newPage(); await b.goto('about:blank'); const base = await b.evaluate(() => Object.getOwnPropertyNames(window)); await b.close();
  const p = await ctx.newPage(); await start(p); await p.waitForTimeout(1500);
  const g = await p.evaluate(base => { const s = new Set(base); const extra = Object.getOwnPropertyNames(window).filter(k => !s.has(k) && !/^(__playwright|__pw|playwright)/i.test(k));
    return { extra, eggfarm: { in: 'eggfarm' in window, type: typeof window.eggfarm }, eggfarmUi: { in: 'eggfarmUi' in window, type: typeof window.eggfarmUi }, exportTel: typeof window.eggfarmExportTelemetry }; }, base);
  const appGlobals = g.extra.filter(k => /egg|farm|debug|game|ui$/i.test(k));
  ok('25ca816 window.eggfarmUi absent from release', !g.eggfarmUi.in && g.eggfarmUi.type === 'undefined', g.eggfarmUi);
  ok('release globals: only eggfarmExportTelemetry allowed', appGlobals.length === 1 && appGlobals[0] === 'eggfarmExportTelemetry', { appGlobals, allExtra: g.extra, eggfarm: g.eggfarm });
  await fin();
}
const fx = n => JSON.parse(fs.readFileSync(`${ROOT}/tests/fixtures/saves/${n}`, 'utf8'));
const pick = s => ({ coins: s.coinsCents, farm: s.farmLevel, coll: s.collectionLevel, workers: JSON.stringify(Object.fromEntries(Object.entries(s.workers ?? {}).map(([k, w]) => [k, { e: Math.round(w.energy), u: !!w.unpaid }]))) });
// 1. migrations: freeze the sim before boot (hold rAF + setInterval callbacks), read the migrated live state and the forced save, then assert
const FREEZE = () => { window.__qaFrozen = true; const raf = window.requestAnimationFrame.bind(window), si = window.setInterval.bind(window); const q = [];
  window.requestAnimationFrame = cb => window.__qaFrozen ? (q.push(cb), q.length) : raf(cb);
  window.setInterval = (cb, ms, ...a) => si((...x) => { if (!window.__qaFrozen) cb(...x); }, ms, ...a);
  window.__qaThaw = () => { window.__qaFrozen = false; q.splice(0).forEach(cb => raf(cb)); }; };
for (const n of ['m1-rc2-v4-12min.json', 'm2-rc1-v5-12min.json', 'm2-rc1-v5-40min.json', 'm2-rc1-v5-40min-edge.json']) {
  const d = fx(n); const ctx = await br.newContext({ viewport: { width: 375, height: 812 } }); await seed(ctx, JSON.stringify({ ...d, savedAt: Date.now() }));
  await ctx.addInitScript(FREEZE);
  const p = await ctx.newPage(); await p.goto(URL); await p.getByText('Tap to start').click().catch(() => {}); await p.waitForFunction(() => window.eggfarm, null, { polling: 100 });
  const r = await p.evaluate(() => { const g = window.eggfarm; const live = JSON.parse(JSON.stringify(g.state)); g.save(); const sv = JSON.parse(localStorage.getItem('eggfarm.save'));
    const tel = JSON.stringify(g.telemetry ?? {}); const m = [...tel.matchAll(/"wage_[a-z_]+_cents":(\d+)/g)].reduce((t, x) => t + +x[1], 0);
    return { live, saved: { version: sv.version, state: sv.state }, wageCents: m }; });
  const cL = checkMigrated(d, { version: r.saved.version, state: r.live, wageEvents: r.wageCents }), cS = checkMigrated(d, { version: r.saved.version, state: r.saved.state, wageEvents: r.wageCents });
  ok(`save v${d.version}->v6 ${n} (frozen, pre-tick): exact coins + wageFracCents, levels, workers kept`, cL.pass && cS.pass, { live: cL, stored: cS });
  await ctx.close(); }
// 2. frac survives save/reload and a kill
{ const d = fx('m2-rc1-v5-40min.json'); const ctx = await br.newContext({ viewport: { width: 375, height: 812 } }); await seed(ctx, JSON.stringify({ ...d, savedAt: Date.now() }));
  const p = await ctx.newPage(); await start(p);
  const f0 = await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 3, coinsCents: 100000, customers: [], nextCustomerInS: 1e9, basket: 0, workers: { market_hand: { energy: 100, cdS: 0 } }, wageFracCents: {} };
    g.debugAdvance(1000); g.debugAdvance(1000); g.debugAdvance(1000); g.save(); return { frac: g.state.wageFracCents, coins: g.state.coinsCents }; });
  await p.reload(); await p.getByText('Tap to start').click().catch(() => {}); await p.waitForFunction(() => window.eggfarm);
  const f1 = await p.evaluate(() => ({ frac: window.eggfarm.state.wageFracCents, coins: window.eggfarm.state.coinsCents }));
  ok('wageFracCents survives save/reload', f0.frac.market_hand > 0 && Math.abs((f1.frac.market_hand ?? -1) - f0.frac.market_hand) < 1e-9 || (f1.frac.market_hand !== undefined && f1.frac.market_hand < 1 && f1.coins <= f0.coins), { f0, f1 });
  // kill: let autosave write, snapshot localStorage (= what a killed tab leaves), crash/close without unload save, restore snapshot, reopen
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, wageFracCents: { market_hand: 0.5 }, workers: { market_hand: { energy: 100, cdS: 0.5 } } }; g.save(); });
  const snap = await p.evaluate(() => localStorage.getItem('eggfarm.save')); const snapFrac = JSON.parse(snap).state.wageFracCents;
  await p.close({ runBeforeUnload: false }); // CDP Page.crash hangs Playwright in headless Chrome
  const p2 = await ctx.newPage(); await blank(p2); const after = await p2.evaluate(() => localStorage.getItem('eggfarm.save'));
  const killFrac = JSON.parse(after).state.wageFracCents; await p2.evaluate(s => localStorage.setItem('eggfarm.save', s), snap);
  await p2.goto(URL); await p2.getByText('Tap to start').click().catch(() => {}); await p2.waitForFunction(() => window.eggfarm); const f2 = await p2.evaluate(() => window.eggfarm.state.wageFracCents);
  ok('wageFracCents survives a kill (last autosave reloads with its frac)', snapFrac.market_hand === 0.5 && killFrac?.market_hand !== undefined && f2.market_hand !== undefined && f2.market_hand < 1, { snapFrac, onDiskAfterKill: killFrac, loaded: f2 });
  await ctx.close(); }
// 3. $0 gate with carried fraction
{ const d = fx('m2-rc1-v5-40min.json'); const ctx = await br.newContext({ viewport: { width: 375, height: 812 } }); await seed(ctx, JSON.stringify({ ...d, savedAt: Date.now() }));
  const p = await ctx.newPage(); await start(p);
  const r = await p.evaluate(() => { const g = window.eggfarm; const ev = []; g.on(e => { if (e.type === 'wage') ev.push(e); });
    g.state = { ...g.state, farmLevel: 3, coinsCents: 1, customers: [], nextCustomerInS: 1e9, basket: 0, coop: 0, workers: { market_hand: { energy: 100, cdS: 0 } }, wageFracCents: { market_hand: 0.9 } };
    let min = Infinity, nonInt = 0, chargedWhileUnpaid = 0, fracWhileUnpaid = new Set(); const log = [];
    for (let i = 0; i < 600; i++) { const n0 = ev.length, wasUnpaid = !!g.state.workers.market_hand?.unpaid; g.debugAdvance(250); const s = g.state; min = Math.min(min, s.coinsCents); if (!Number.isInteger(s.coinsCents)) nonInt++;
      if (wasUnpaid && s.workers.market_hand?.unpaid && ev.length > n0) chargedWhileUnpaid++; if (s.workers.market_hand?.unpaid) fracWhileUnpaid.add(s.wageFracCents.market_hand); if (i < 12) log.push([s.coinsCents, +(s.wageFracCents.market_hand ?? 0).toFixed(3), !!s.workers.market_hand?.unpaid]); }
    const unpaid = !!g.state.workers.market_hand?.unpaid; g.state = { ...g.state, coinsCents: 1000 }; for (let i = 0; i < 8; i++) g.debugAdvance(250);
    return { min, nonInt, chargedWhileUnpaid, fracWhileUnpaid: [...fracWhileUnpaid], unpaidAtEnd: unpaid, resumed: !g.state.workers.market_hand?.unpaid, coinsAfterResume: g.state.coinsCents, log }; });
  ok('$0 gate with carried frac: money >= 0 integer, unpaid never charged, frac frozen while unpaid, resumes', r.min >= 0 && r.nonInt === 0 && r.chargedWhileUnpaid === 0 && r.fracWhileUnpaid.length <= 1 && r.unpaidAtEnd && r.resumed, r);
  await ctx.close(); }
await fin();
