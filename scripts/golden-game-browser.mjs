// #111 golden-game hosted browser gate (QA-D-1106-PR111-QUEUE / GOLDBAR): Chromium, portrait 360x640, on the QA build
// (dist-qa; release strips window.eggfarm / eggfarmUi). Flag 0 = shipped balance (golden=0): boots, no live egg, no debug
// panel without ?debug=1. Flag on = TEST-ONLY runtime overlay tests/fixtures/golden-game-browser-flag-on.json merged into
// the live window.eggfarm.balance in-page (never written to src/config/balance.json; release balance keeps golden=0):
// seed a live goldenEgg, assert FINAL A unload via endSession (collectible_expired{reload} before session_end).
// debug-panel-out-of-release: this job never opens ?debug=1; release debug-strip remains check-release-build's job.
// Usage: npm run build:qa && node scripts/golden-game-browser.mjs   (SHOTS=artifacts/golden-game-browser, CHROME=/usr/bin/google-chrome)
import pw from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path'; import { serveForRun } from './serve-own.mjs';
const SHOTS = process.env.SHOTS ?? 'artifacts/golden-game-browser'; // gitignored; created after the build-id check so it never dirties the tree check
// NOTE: this overlay is test-only. It must never be copied into the shipped src/config/balance.json.
const OVERLAY = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/golden-game-browser-flag-on.json', import.meta.url), 'utf8'));
const srv = await serveForRun(process.env.DIST ?? 'dist-qa', 'golden-game-browser'); fs.mkdirSync(SHOTS, { recursive: true });
const br = await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const PORTRAIT = { width: 360, height: 640 };
let bad = 0; const ok = (n, p, i) => { if (!p) bad++; console.log(`${p ? 'PASS' : 'FAIL'} [chromium] ${n} — ${JSON.stringify(i)}`); };
const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: false });
const shot = async (p, f) => { await p.screenshot({ path: path.join(SHOTS, f) }); return f; };
const errors = [];
async function newCtx() {
  const ctx = await br.newContext({ viewport: PORTRAIT, reducedMotion: 'no-preference' });
  await ctx.addInitScript(u => { if (!localStorage.getItem('eggfarm.ui')) localStorage.setItem('eggfarm.ui', u); }, UI);
  return ctx;
}
async function boot(p, first = true) {
  if (first) await p.goto(srv.url); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi);
  await p.waitForTimeout(400); const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(200); }
}
const watch = (p, tag) => { p.on('pageerror', e => errors.push(`${tag}: ${e.message}`)); };

// ---------------- Flag 0 (shipped balance, golden=0) ----------------
// Release debug-strip remains check-release-build's job; flag-0 here only asserts no debug panel without ?debug=1.
{ const ctx = await newCtx(); const p = await ctx.newPage(); watch(p, 'flag0'); await boot(p);
  const info = await p.evaluate(() => ({
    flag: window.eggfarm.balance.m4?.flags?.golden,
    bid: document.querySelector('meta[name="build-id"]')?.content,
    hasEgg: !!window.eggfarm.state.goldenEgg,
    dbg: !!document.querySelector('details.dbg') || !!document.getElementById('dbgInfo'),
  }));
  ok('F0-0 QA build boots at 360x640 with shipped golden flag 0 and HEAD build-id', info.flag === 0 && info.bid === srv.buildId, info);
  ok('F0-1 flag 0: no live state.goldenEgg', !info.hasEgg, { hasEgg: info.hasEgg });
  ok('F0-2 without ?debug=1: debug panel not mounted (no details.dbg / #dbgInfo)', !info.dbg, { dbg: info.dbg });
  await shot(p, 'flag0-farm.png');
  await ctx.close(); }

// ---------------- Flag on (TEST-ONLY runtime overlay) ----------------
{ const ctx = await newCtx(); const p = await ctx.newPage(); watch(p, 'flag1'); await boot(p);
  const applied = await p.evaluate(ov => {
    const g = window.eggfarm;
    const merge = (t, o) => { for (const [k, v] of Object.entries(o)) { if (k.startsWith('_')) continue; if (v && typeof v === 'object' && !Array.isArray(v)) merge(t[k] ??= {}, v); else t[k] = v; } };
    merge(g.balance, ov);
    window.eggfarmUi.render();
    return { golden: g.balance.m4.flags.golden, hasEgg: !!g.state.goldenEgg };
  }, OVERLAY);
  ok('F1-0 runtime overlay applied in-page only (live balance golden=1)', applied.golden === 1, applied);
  await shot(p, 'flag1-farm.png');

  const seeded = await p.evaluate(() => {
    const g = window.eggfarm;
    const intervalS = g.balance.m4?.tc?.egg_gap_min_s ?? 30;
    g.state = { ...g.state, goldenEgg: { ageS: 0, slotId: 'farm', intervalS } };
    window.eggfarmUi.render();
    return { hasEgg: !!g.state.goldenEgg, egg: g.state.goldenEgg, golden: g.balance.m4.flags.golden };
  });
  ok('F1-1 seeded live goldenEgg on state (test-only; UI may not paint yet)', seeded.hasEgg === true && seeded.golden === 1, seeded);
  await shot(p, 'flag1-egg-live.png');

  const unload = await p.evaluate(() => {
    const g = window.eggfarm;
    g.endSession(); // FINAL A: streakPeak → goldenUnload('reload') → session_end → save
    const events = g.telemetry.events().map(e => ({ type: e.type, skin: e.skin, reason: e.reason }));
    const expIdx = events.findIndex(e => e.type === 'collectible_expired' && e.skin === 'golden_egg' && e.reason === 'reload');
    const endIdx = events.findIndex(e => e.type === 'session_end');
    // Cross-check the console export (eggfarmExportTelemetry → Telemetry.snapshotJSON)
    let exportOk = false;
    try {
      const doc = JSON.parse(window.eggfarmExportTelemetry());
      exportOk = Array.isArray(doc.events) && doc.events.some(e => e.type === 'collectible_expired' && e.skin === 'golden_egg' && e.reason === 'reload')
        && doc.events.some(e => e.type === 'session_end');
    } catch { exportOk = false; }
    return {
      hasEgg: !!g.state.goldenEgg,
      expIdx, endIdx, exportOk,
      expired: expIdx >= 0 ? events[expIdx] : null,
      typesTail: events.slice(Math.max(0, events.length - 8)),
    };
  });
  ok('F1-2 FINAL A endSession: state.goldenEgg gone', unload.hasEgg === false, { hasEgg: unload.hasEgg });
  ok('F1-3 FINAL A: collectible_expired{skin:golden_egg,reason:reload} before session_end',
    unload.expIdx >= 0 && unload.endIdx >= 0 && unload.expIdx < unload.endIdx && unload.exportOk, unload);
  await shot(p, 'flag1-after-unload.png');
  await ctx.close(); }

ok('No page errors', errors.length === 0, errors);
console.log(`shots: ${SHOTS}: ${fs.readdirSync(SHOTS).filter(f => f.endsWith('.png')).sort().join(', ')}`);
await br.close(); srv.stop(); console.log(bad ? `FAILED ${bad}` : 'ALL PASS'); process.exit(bad ? 1 : 0);
