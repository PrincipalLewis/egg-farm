// S2-4b: UI keeps up with sim when rAF is stalled; plus 5cc8889 live-money taps. PORT=.. ENGINE=.. node s2-4b-stall.mjs <worktree>
import { setup, st, saved } from './s2-lib.mjs';
const { ok, open, done, OUT, ENGINE } = await setup('s2-4b');
const W = ms => new Promise(r => setTimeout(r, ms));
// Stall hook: rAF callbacks are held (never run) while window.__stall is true; the app calls the global each frame.
const hook = p => p.evaluate(() => { const o = window.requestAnimationFrame.bind(window); window.__held = []; window.__raf = 0;
  window.requestAnimationFrame = cb => window.__stall ? (window.__held.push(cb), 0) : o(t => { window.__raf++; cb(t); }); });
// Probe (20 ms poll): each time state.coinsCents changes (sim tick), measure how long until #coins text changes ("lag").
// Also counts changes of the sheet hint/ETA, buy-button state and goal chip, and their longest unchanged gap.
const probe = (p, ms) => p.evaluate(ms => new Promise(res => { const sel = { coins: '#coins', hint: '#uRow .hint', goal: '#goal', buy: '#uRow .btn.buy' };
  const val = k => { const e = document.querySelector(sel[k]); return e ? e.textContent + '|' + (e.getAttribute('aria-disabled') ?? '') : ''; };
  const t0 = performance.now(), prev = {}, last = {}, gap = {}, n = {}; for (const k in sel) { prev[k] = val(k); last[k] = t0; gap[k] = 0; n[k] = 0; }
  let pc = window.eggfarm.state.coinsCents, pend = null; const lags = []; let simTicks = 0; const c0 = pc, raf0 = window.__raf;
  const iv = setInterval(() => { const t = performance.now(); const c = window.eggfarm.state.coinsCents;
    if (c !== pc) { simTicks++; pc = c; if (pend === null) pend = t; }
    for (const k in sel) { const v = val(k); if (v !== prev[k]) { gap[k] = Math.max(gap[k], t - last[k]); last[k] = t; n[k]++; prev[k] = v; if (k === 'coins' && pend !== null) { lags.push(Math.round(t - pend)); pend = null; } } } }, 20);
  setTimeout(() => { clearInterval(iv); const t = performance.now(); if (pend !== null) lags.push(Math.round(t - pend) + 9e6); for (const k in sel) gap[k] = Math.round(Math.max(gap[k], t - last[k]));
    res({ maxLag: Math.max(0, ...lags), lags: lags.slice(0, 12), simTicks, gap, n, dCoins: window.eggfarm.state.coinsCents - c0, rafRan: window.__raf - raf0, hdr: document.querySelector('#coins').textContent }); }, ms); }), ms);
// (1) header + open Upgrades sheet + ETA with rAF stalled 8 s. Fast income so text should change every tick.
{ const cost = 3664 * 100; const { ctx, p, errs } = await open({ patch: { farmLevel: 12, coinsCents: cost - 110000 } });
  await hook(p); await p.click('[data-nav=upgrades]'); await p.waitForTimeout(400); await p.click('[data-tab=farm]'); await p.waitForTimeout(400);
  const base = await probe(p, 2000);
  await p.evaluate(() => { window.__stall = true; }); await W(300);
  const r = await probe(p, 9500); await p.screenshot({ path: `${OUT}/1-stalled-sheet-${ENGINE}.png` });
  const live = await p.evaluate(() => ({ cs: window.eggfarm.state.coinsCents, hdr: document.getElementById('coins').textContent }));
  await p.evaluate(() => { window.__stall = false; const h = window.__held; window.__held = []; h.forEach(cb => requestAnimationFrame(cb)); });
  ok('(1) baseline (rAF running): header follows each sim tick within 250 ms', base.simTicks >= 1 && base.maxLag <= 250, base);
  ok('(1) rAF stalled 8 s: header, Upgrades hint/ETA and buy button keep updating, header lag <= ~250 ms (300 ms allowed for 20 ms polling)', r.rafRan === 0 && r.simTicks >= 5 && r.maxLag <= 300 && r.n.hint > 0 && r.n.buy > 0, { ...r, live, errs }); await ctx.close(); }
// (1b) goal chip ETA with rAF stalled (main screen)
{ const { ctx, p } = await open({ patch: { coinsCents: 1000 } }); await hook(p); await p.evaluate(() => { window.__stall = true; }); await W(300);
  const r = await probe(p, 6000); await p.screenshot({ path: `${OUT}/1b-stalled-goal-${ENGINE}.png` });
  ok('(1b) rAF stalled 6 s: goal chip ETA/progress keeps updating', r.rafRan === 0 && r.n.goal >= 3 && r.maxLag <= 300, r); await ctx.close(); }
// (2b) 5cc8889: tap uses live money, not the drawn state. Change money and click in the same task (no redraw in between).
{ const cost = 3664 * 100; const { ctx, p } = await open({ patch: { farmLevel: 12, coinsCents: 1500, workers: {}, customers: [], nextCustomerInS: 999 } });
  await p.click('[data-nav=upgrades]'); await p.waitForTimeout(400); await p.click('[data-tab=farm]'); await p.waitForTimeout(500);
  const A = await p.evaluate(cost => { const g = window.eggfarm; const b = document.querySelector('#uRow .btn.buy'); const drawn = b.getAttribute('aria-disabled');
    try { g.state = { ...g.state, coinsCents: cost + 5000 }; } catch (e) { return { err: String(e) }; } const set = g.state.coinsCents; const f0 = g.state.farmLevel; b.click();
    return { drawn, set, f0, f1: g.state.farmLevel, c1: g.state.coinsCents }; }, cost);
  ok('(2b-i) button drawn grey but money now enough: tap buys from live money', A.drawn === 'true' && A.set === cost + 5000 && A.f1 === A.f0 + 1, A);
  await p.waitForTimeout(600); const s0 = await st(p);
  const B = await p.evaluate(() => { const g = window.eggfarm; const b = document.querySelector('#uRow .btn.buy'); const drawn = b.getAttribute('aria-disabled');
    g.state = { ...g.state, coinsCents: 1000 }; const f0 = g.state.farmLevel; b.click(); return { drawn, f0, f1: g.state.farmLevel, c1: g.state.coinsCents }; });
  await p.waitForTimeout(6500); const v = await saved(p);
  ok('(2b-ii) money drops below cost after draw: tap rejected, no spend, save unchanged', B.f1 === B.f0 && B.c1 === 1000 && v.farm === B.f0 && v.coins <= 1000 + 500, { B, saved: v, prevFarm: s0.farm }); await ctx.close(); }
// (1c) Chromium only, informational: real backgrounded tab (another tab in front)
if (ENGINE === 'chromium') { const { ctx, p } = await open({ patch: { coinsCents: 1000 } }); await hook(p); const q = await ctx.newPage(); await q.goto('about:blank'); await q.bringToFront();
  const r = await probe(p, 5000); const vis = await p.evaluate(() => document.visibilityState);
  ok('(1c info) background tab: header still advances (browser throttles timers ~1/s when hidden)', r.n.coins >= 2, { vis, ...r }); await ctx.close(); }
await done();
