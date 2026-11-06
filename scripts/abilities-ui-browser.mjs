// #116 abilities UI hosted browser gate (QA-D-1106-PR116-CI): Chromium, portrait 360x640, on the QA build (dist-qa;
// release strips window.eggfarm / eggfarmUi). Flag 0 = shipped balance: open / close / reopen / close mid-animation /
// switch panels / reload. Flag on = TEST-ONLY runtime overlay tests/fixtures/abilities-ui-browser-flag-on.json merged into
// the live window.eggfarm.balance in-page (never written to src/config/balance.json; release balance keeps abilities=0):
// Architect edges O1 (dock while the post-call sheet close is pending) and O2 (reopen while it is pending).
// Usage: npm run build:qa && node scripts/abilities-ui-browser.mjs   (SHOTS=artifacts/abilities-ui-browser, CHROME=/usr/bin/google-chrome)
import pw from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path'; import { serveForRun } from './serve-own.mjs';
const SHOTS = process.env.SHOTS ?? 'artifacts/abilities-ui-browser'; // gitignored; created after the build-id check so it never dirties the tree check
// NOTE: this overlay is test-only. It must never be copied into the shipped src/config/balance.json.
const OVERLAY = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/abilities-ui-browser-flag-on.json', import.meta.url), 'utf8'));
const srv = await serveForRun(process.env.DIST ?? 'dist-qa', 'abilities-ui-browser'); fs.mkdirSync(SHOTS, { recursive: true });
const br = await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const PORTRAIT = { width: 360, height: 640 }, DOCKED = { width: 1280, height: 800 };
let bad = 0; const ok = (n, p, i) => { if (!p) bad++; console.log(`${p ? 'PASS' : 'FAIL'} [chromium] ${n} — ${JSON.stringify(i)}`); };
const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: false });
const shot = async (p, f) => { await p.screenshot({ path: path.join(SHOTS, f) }); return f; };
const errors = [];
async function newCtx() {
  const ctx = await br.newContext({ viewport: PORTRAIT, reducedMotion: 'no-preference' }); // transitions must run (mid-close / pending close)
  await ctx.addInitScript(u => { if (!localStorage.getItem('eggfarm.ui')) localStorage.setItem('eggfarm.ui', u); }, UI);
  return ctx;
}
async function boot(p, first = true) {
  if (first) await p.goto(srv.url); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi);
  await p.waitForTimeout(400); const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(200); }
}
const watch = (p, tag) => { p.on('pageerror', e => errors.push(`${tag}: ${e.message}`)); };
const st = p => p.evaluate(() => { const u = document.getElementById('p-upgrades'), m = document.getElementById('p-market'), l = document.getElementById('panel-layer');
  return { layerOpen: l.classList.contains('open'), upHidden: u.hidden, mkHidden: m.hidden, upTransform: getComputedStyle(u).transform,
    navOn: [...document.querySelectorAll('nav.actions button.on')].map(b => b.dataset.nav) }; });
// Real tap when the nav is reachable; while a portrait sheet is open it covers the nav (75dvh), so use a DOM click on the same button.
const nav = async (p, n) => { const l = p.locator(`[data-nav=${n}]`); if (await p.evaluate(() => document.getElementById('panel-layer').classList.contains('open'))) await l.dispatchEvent('click'); else await l.click({ timeout: 5000 }); };
const closeBtn = p => p.locator('#p-upgrades .close').click();

// ---------------- Flag 0 (shipped balance) ----------------
{ const ctx = await newCtx(); const p = await ctx.newPage(); watch(p, 'flag0'); await boot(p);
  const flag = await p.evaluate(() => window.eggfarm.balance.m4?.flags?.abilities);
  const bid = await p.evaluate(() => document.querySelector('meta[name="build-id"]')?.content);
  ok('F0-0 QA build boots at 360x640 with shipped abilities flag 0 and HEAD build-id', flag === 0 && bid === srv.buildId, { flag, bid });
  await nav(p, 'upgrades'); await p.waitForTimeout(400); let s = await st(p); const f1 = await shot(p, 'flag0-open.png');
  ok('F0-1 open Upgrades: layer open, #p-upgrades visible, nav on=upgrades', s.layerOpen && !s.upHidden && s.navOn.includes('upgrades'), { ...s, f1 });
  await closeBtn(p); await p.waitForTimeout(400); s = await st(p); const f2 = await shot(p, 'flag0-closed.png');
  ok('F0-2 close via .close: layer closed, sheet hidden, nav on=farm', !s.layerOpen && s.upHidden && s.navOn.includes('farm'), { ...s, f2 });
  await nav(p, 'upgrades'); await p.waitForTimeout(400); s = await st(p); const f3 = await shot(p, 'flag0-reopen.png');
  ok('F0-3 reopen Upgrades: open again', s.layerOpen && !s.upHidden, { ...s, f3 });
  await closeBtn(p); await p.waitForTimeout(60); const sMid = await st(p); const f4 = await shot(p, 'flag0-close-mid.png'); await p.waitForTimeout(500); const sEnd = await st(p);
  ok('F0-4 close mid-animation (60 ms): layer not open, scrim not interactive; settles closed + hidden', !sMid.layerOpen && !sEnd.layerOpen && sEnd.upHidden, { sMid, sEnd, f4 });
  // At 360x640 the open sheet (75dvh) covers the nav, so the switch is a DOM click on the Market nav button (same handler as a tap/keyboard).
  await nav(p, 'upgrades'); await p.waitForTimeout(300); await nav(p, 'market'); await p.waitForTimeout(400); s = await st(p); const f5 = await shot(p, 'flag0-switch.png');
  ok('F0-5 switch Upgrades -> Market while open: Market shown, Upgrades hidden, layer open', s.layerOpen && s.upHidden && !s.mkHidden && s.navOn.includes('market'), { ...s, f5 });
  await nav(p, 'upgrades'); await p.waitForTimeout(300); await p.reload(); await boot(p, false); await p.waitForTimeout(300); s = await st(p); const f6a = await shot(p, 'flag0-reload.png');
  ok('F0-6 reload while Upgrades open: boots clean, no panel stuck open', !s.layerOpen && s.upHidden && s.mkHidden, { ...s, f6a });
  await nav(p, 'upgrades'); await p.waitForTimeout(400); s = await st(p); const f6b = await shot(p, 'flag0-reload-reopen.png');
  ok('F0-6b after reload Upgrades opens normally', s.layerOpen && !s.upHidden, { ...s, f6b });
  const calls = await p.locator('[data-testid^="call-"]').count();
  ok('F0-7 flag 0: no call buttons in DOM', calls === 0, { calls }); await ctx.close(); }

// ---------------- Flag on (TEST-ONLY runtime overlay) ----------------
{ const ctx = await newCtx(); const p = await ctx.newPage(); watch(p, 'flag1'); await boot(p);
  const applied = await p.evaluate(ov => { const g = window.eggfarm; // deep-merge the overlay onto the LIVE in-memory balance (keys starting '_' are comments)
    const merge = (t, o) => { for (const [k, v] of Object.entries(o)) { if (k.startsWith('_')) continue; if (v && typeof v === 'object' && !Array.isArray(v)) merge(t[k] ??= {}, v); else t[k] = v; } }; merge(g.balance, ov);
    const unlock = g.balance.m4.tc.ability_unlock_farm ?? 10;
    g.state = { ...g.state, farmLevel: Math.max(g.state.farmLevel, unlock), coinsCents: 1e12,
      workers: { ...g.state.workers, market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, hawker: { energy: 100, cdS: 0 } } };
    window.eggfarmUi.render(); return { abilities: g.balance.m4.flags.abilities, unlock, farmLevel: g.state.farmLevel }; }, OVERLAY);
  ok('F1-0 runtime overlay applied in-page only (live balance abilities=1), farm seeded >= unlock', applied.abilities === 1 && applied.farmLevel >= applied.unlock, applied);
  const openWorkers = async () => { await nav(p, 'upgrades'); await p.waitForTimeout(400); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(300); };
  const fire = id => p.locator(`[data-testid="call-${id}"]`).click();
  // O1: dock while pending
  await openWorkers(); const callN = await p.locator('[data-testid^="call-"]').count(); await shot(p, 'flag1-workers.png');
  ok('F1-1 Workers tab shows call buttons (flag on)', callN >= 1, { callN });
  // INFO (not gated; reported to UI QA): Workers tab horizontal overflow at 360 with call buttons (scrollWidth vs clientWidth).
  const ovf = await p.evaluate(() => { const b = document.querySelector('#p-upgrades .body'); return { scrollWidth: b.scrollWidth, clientWidth: b.clientWidth }; });
  console.log(`INFO [chromium] F1-1i Workers tab @360 horizontal overflow (flag on): ${ovf.scrollWidth > ovf.clientWidth ? 'YES' : 'no'} — ${JSON.stringify(ovf)}`);
  const actS = id => p.evaluate(i => window.eggfarm.state.abilities?.[i]?.activeS ?? null, id);
  await fire('market_hand'); await p.waitForTimeout(40); const pend = await st(p); 
  ok('F1-2 call fired from sheet -> pending close (layer closed, sheet still in DOM for transform close)', !pend.layerOpen && !pend.upHidden, pend);
  await p.setViewportSize(DOCKED); await p.waitForTimeout(400); // dock inside the --t-med transform transition (pending window)
  const o1 = await p.evaluate(() => ({ docked: matchMedia('(min-width:960px) and (orientation:landscape)').matches, ...(() => { const u = document.getElementById('p-upgrades'); return { upHidden: u.hidden }; })(),
    layerOpen: document.getElementById('panel-layer').classList.contains('open') }));
  const f7 = await shot(p, 'flag1-o1-dock-mid-pending.png');
  // late transitionend after dock must be a no-op (listener removed)
  await p.evaluate(() => { const u = document.getElementById('p-upgrades'); const e = new Event('transitionend', { bubbles: true }); Object.defineProperty(e, 'propertyName', { value: 'transform' }); u.dispatchEvent(e); window.eggfarmUi.render(); });
  const a0 = await actS('market_hand'); await p.waitForTimeout(1500); const a1 = await actS('market_hand'); const o1b = { activeS_afterDock: a0, activeS_1500msLater: a1, abilities: await p.evaluate(() => window.eggfarm.state.abilities?.market_hand) };
  ok('O1 dock mid-pending: docked media matches, sheetCloseComplete ran (portrait sheet hidden, no layer open); call timer resumes (attendance not frozen)', o1.docked && o1.upHidden && !o1.layerOpen && !!o1b.abilities && a1 < a0, { o1, o1b, f7 });
  await p.setViewportSize(PORTRAIT); await p.waitForTimeout(400);
  // O2: reopen while pending (different worker; market_hand is on cooldown)
  await openWorkers(); await fire('coop_hand'); await p.waitForTimeout(30); const pend2 = await st(p);
  await p.locator('[data-nav=upgrades]').click({ timeout: 2000 }); /* real tap: the pending layer is pointer-events:none */ await p.waitForTimeout(30); const o2a = await st(p);
  await p.evaluate(() => { const u = document.getElementById('p-upgrades'); const e = new Event('transitionend', { bubbles: true }); Object.defineProperty(e, 'propertyName', { value: 'transform' }); u.dispatchEvent(e); });
  await p.waitForTimeout(600); const o2b = await st(p); const f8 = await shot(p, 'flag1-o2-reopen-pending.png');
  ok('O2 reopen while pending: Upgrades reopens; synthetic late transitionend(transform) does NOT hide it', !pend2.layerOpen && !pend2.upHidden && o2a.layerOpen && !o2a.upHidden && o2b.layerOpen && !o2b.upHidden, { pend2, o2a, o2b, f8 });
  await closeBtn(p); await p.waitForTimeout(400); const o2c = await st(p); await shot(p, 'flag1-o2-closed-after.png');
  ok('O2b close after reopen works normally', !o2c.layerOpen && o2c.upHidden, o2c);
  await ctx.close(); }
ok('No page errors', errors.length === 0, errors);
console.log(`shots: ${SHOTS}: ${fs.readdirSync(SHOTS).filter(f => f.endsWith('.png')).sort().join(', ')}`);
await br.close(); srv.stop(); console.log(bad ? `FAILED ${bad}` : 'ALL PASS'); process.exit(bad ? 1 : 0);
