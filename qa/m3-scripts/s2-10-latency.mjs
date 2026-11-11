// S2-10 (money reset to $9,000 before each buy/hire tap so the header shows cents and always changes; collect watches #basket): tap -> header/button update latency (median, p95), frames normal vs rAF stalled. PORT=.. ENGINE=.. node s2-10-latency.mjs <worktree>
import { setup } from './s2-lib.mjs';
const { ok, open, done, OUT, ENGINE } = await setup('s2-10');
const hook = p => p.evaluate(() => { const o = window.requestAnimationFrame.bind(window); window.__held = [];
  window.requestAnimationFrame = cb => window.__stall ? (window.__held.push(cb), 0) : o(cb); });
// one tap: click element `btn` (selector) in-page, then watch `watch` selectors via MutationObserver; returns ms to first change of each
const tap = (p, btn, watch) => p.evaluate(([btn, watch]) => new Promise(res => {
  const el = document.querySelector(btn); if (!el) return res({ miss: true }); const before = watch.map(s => document.querySelector(s)?.outerHTML ?? '');
  const t = watch.map(() => null); const t0 = performance.now();
  const check = () => watch.forEach((s, i) => { if (t[i] === null && (document.querySelector(s)?.outerHTML ?? '') !== before[i]) t[i] = performance.now() - t0; });
  const mo = new MutationObserver(check); mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  el.click(); check(); const sync = t.map(x => x !== null);
  setTimeout(() => { mo.disconnect(); res({ t: t.map(x => x === null ? null : Math.round(x)), sync }); }, 1200); }), [btn, watch]);
const q = (a, f) => { const s = a.filter(x => x !== null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))] : null; };
const R = {};
for (const mode of ['normal', 'stalled']) {
  // buy (farm) and collect
  { const { ctx, p } = await open({ patch: { farmLevel: 5, coinsCents: 3000000, coop: 5000, workers: {}, customers: [], nextCustomerInS: 999 } }); await hook(p);
    await p.click('[data-nav=upgrades]'); await p.waitForTimeout(400); await p.click('[data-tab=farm]'); await p.waitForTimeout(400);
    if (mode === 'stalled') { await p.evaluate(() => { window.__stall = true; }); await p.waitForTimeout(400); }
    const buy = []; for (let i = 0; i < 15; i++) { await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 3000000 }; }); await p.waitForTimeout(450); buy.push(await tap(p, '#uRow .btn.buy', ['#coins', '#uRow .btn.buy'])); await p.waitForTimeout(150); }
    R[`buy-${mode}`] = buy; await p.screenshot({ path: `${OUT}/buy-${mode}-${ENGINE}.png` });
    await p.evaluate(() => { window.__stall = false; window.__held.splice(0).forEach(cb => requestAnimationFrame(cb)); }); await p.locator('#p-upgrades .close').click(); await p.waitForTimeout(300);
    if (mode === 'stalled') { await p.evaluate(() => { window.__stall = true; }); await p.waitForTimeout(400); }
    const col = []; for (let i = 0; i < 15; i++) { col.push(await tap(p, '#collect', ['#basket', '#basket'])); await p.waitForTimeout(150); }
    R[`collect-${mode}`] = col; await ctx.close(); }
  // hire: hire each unhired worker once per fresh page (3 workers) x 5 pages
  { const hire = []; for (let k = 0; k < 5; k++) { const { ctx, p } = await open({ patch: { farmLevel: 20, coinsCents: 3000000, workers: {} } }); await hook(p);
      await p.click('[data-nav=upgrades]'); await p.waitForTimeout(400); await p.click('[data-tab=workers]'); await p.waitForTimeout(400);
      if (mode === 'stalled') { await p.evaluate(() => { window.__stall = true; }); await p.waitForTimeout(400); }
      for (let i = 0; i < 3; i++) { await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coinsCents: 3000000 }; }); await p.waitForTimeout(450); hire.push(await tap(p, '#uRow button[data-act=hire]:not([aria-disabled=true])', ['#coins', '#uRow'])); await p.waitForTimeout(200); }
      if (k === 0) await p.screenshot({ path: `${OUT}/hire-${mode}-${ENGINE}.png` }); await ctx.close(); }
    R[`hire-${mode}`] = hire; }
}
for (const [k, v] of Object.entries(R)) { const a = v.filter(x => !x.miss); const h = a.map(x => x.t[0]), b = a.map(x => x.t[1]);
  const stale = a.filter(x => x.t.some(y => y === null)).length; const stats = { n: a.length, miss: v.length - a.length, hdrMed: q(h, .5), hdrP95: q(h, .95), btnMed: q(b, .5), btnP95: q(b, .95), noChange: stale, sync: a.filter(x => x.sync.every(Boolean)).length };
  ok(`S2-10 ${k}: header+button update <= 100 ms (p95), never left on pre-tap state`, a.length > 0 && stale === 0 && stats.hdrP95 <= 100 && stats.btnP95 <= 100, stats); }
await done();
