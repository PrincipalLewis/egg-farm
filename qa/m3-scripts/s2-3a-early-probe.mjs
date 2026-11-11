// Probe: what happens to a served card that leaves the strip before 1.3 s (DIST=dist-qa)
import { setup } from './s2-lib.mjs';
const { ok, open, done, ENGINE } = await setup('s2-3a-early-probe');
const { ctx, p } = await open({ patch: { farmLevel: 12, collectionLevel: 9, basket: 1500, workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } } } });
const r = await p.evaluate(() => new Promise(res => { const born = new Map(), ends = [], adds = []; const g = window.eggfarm; const served = []; g.on(e => { if (e.type === 'customer_served') served.push(performance.now()); });
  const mo = new MutationObserver(ms => { const t = performance.now(); for (const m of ms) { for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList?.contains('served')) adds.push({ t, txt: n.textContent, inQ: !!n.closest('.queue'), cls: n.className });
      for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList?.contains('qpop')) adds.push({ t, pop: n.textContent });
      for (const n of m.removedNodes) if (n.nodeType === 1 && n.classList?.contains('served') && born.has(n)) { ends.push({ t, L: Math.round(t - born.get(n)), txt: n.textContent, live: document.querySelectorAll('.queue .chip:not(.empty):not(.served) img.cust').length, more: !!document.querySelector('.queue .chip.more') }); born.delete(n); } }
    for (const n of document.querySelectorAll('.queue .chip.served')) if (!born.has(n) && !ends.some(e => false)) born.set(n, born.get(n) ?? t); });
  mo.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => { mo.disconnect(); const early = ends.filter(e => e.L < 1300).map(e => ({ ...e, sameTxtReadded: adds.some(a => a.txt === e.txt && a.t >= e.t - 5 && a.t <= e.t + 300), popNear: adds.some(a => a.pop && Math.abs(a.t - e.t) < 300) }));
    res({ served: served.length, ends: ends.length, early }); }, 60000); }));
console.log(JSON.stringify(r, null, 0)); await ctx.close(); await done();
