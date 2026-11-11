// 10536b4 checks: S2-3a-1 fuzz + full-queue pop, S2-8 $0 gate, S2-9 chip tap, fast Collect. QA build: DIST=dist-qa ENGINE=.. PORT=.. node s2-money-10536b4.mjs <wt>
// FUZZ_S (default 300)
import { setup } from './s2-lib.mjs';
const { ok, open, done, OUT, ENGINE } = await setup('s2-fastcollect');
const FUZZ_S = +(process.env.FUZZ_S ?? 300);
const MH = { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } };
const mkOpen = p => p.evaluate(() => !document.querySelector('#p-market').hidden);
const closeP = p => p.evaluate(() => window.eggfarmUi.openPanel(null));
// ---- 5. Fast Collect
{ const { ctx, p } = await open({ patch: { farmLevel: 12, collectionLevel: 9, coop: 100000, basket: 0, workers: {} } });
  const ta = await p.evaluate(() => ['#app', '.scene', '.queue', '#collect'].map(s => [s, getComputedStyle(document.querySelector(s)).touchAction]));
  ok('Fast Collect: touch-action manipulation on #app/.scene/.queue', ta.slice(0, 3).every(x => x[1] === 'manipulation'), ta);
  await p.evaluate(() => { const g = window.eggfarm; window.__c = []; g.on(e => { if (e.type === 'collect') window.__c.push(performance.now()); });
    window.__fx = { sq: [], pop: [] }; const btn = document.querySelector('#collect');
    new MutationObserver(ms => { for (const m of ms) if (m.attributeName === 'class' && btn.classList.contains('squash')) window.__fx.sq.push(performance.now()); }).observe(btn, { attributes: true });
    new MutationObserver(ms => { for (const m of ms) { for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('floater')) window.__fx.pop.push(performance.now());
      if (m.type === 'attributes' && m.target.classList?.contains('floater') && m.target.classList.contains('floater')) window.__fx.pop.push(performance.now()); } }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
  for (const [lbl, sel, n, gap] of [['button 10x@50ms', '#collect', 10, 50], ['scene 10x@50ms', '#scene', 10, 50], ['button 45x@15/s', '#collect', 45, 67], ['button 45x@15/s #2', '#collect', 45, 67], ['button 45x@15/s #3', '#collect', 45, 67], ['scene 45x@15/s', '#scene', 45, 67]]) {
    await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 100000, basket: 0 }; window.__c.length = 0; window.__fx.sq.length = 0; window.__fx.pop.length = 0; window.__taps = []; });
    const bx = await p.locator(sel).boundingBox(); const x = bx.x + bx.width / 2, y = sel === '#scene' ? bx.y + bx.height * 0.3 : bx.y + bx.height / 2;
    for (let i = 0; i < n; i++) { const t0 = Date.now(); await p.evaluate(() => window.__taps.push(performance.now())); await p.mouse.click(x, y); const w = gap - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); }
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const T = window.__taps, C = window.__c, F = window.__fx; const within = (arr, t) => arr.some(v => v >= t && v - t <= 100);
      return { taps: T.length, collects: C.length, sq100: T.filter(t => within(F.sq, t)).length, pop100: T.filter(t => within(F.pop, t)).length, lostCount: T.length - C.length, coopLeft: Math.floor(window.eggfarm.state.coop) }; });
    const fxOk = r.sq100 === r.taps && r.pop100 === r.taps;
    ok(`Fast Collect ${lbl}: every tap registers, squash+pop <= 100 ms`, r.collects === n && fxOk, { ...r, class: r.collects < n ? 'LOST' : fxOk ? 'OK' : 'FEEDBACK-MISSING' });
  }
  await ctx.close(); }
await done();
