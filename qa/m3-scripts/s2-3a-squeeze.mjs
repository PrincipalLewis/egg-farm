// S2-3a-1 squeeze path: a drawn Thanks card pushed out by arriving live customers -> 120 ms opacity fade + "+$X" pop from its slot; reduced motion: instant cut + pop. DIST=dist-qa
import { setup } from './s2-lib.mjs';
const { ok, open, done, OUT, ENGINE } = await setup('s2-3a-squeeze');
for (const rmo of [false, true]) {
  const { ctx, p } = await open({ patch: { farmLevel: 12, collectionLevel: 9, basket: 1500, workers: {}, customers: [], nextCustomerInS: 999 } });
  if (rmo) { await p.evaluate(() => { const u = JSON.parse(localStorage.getItem('eggfarm.ui')); u.reducedMotion = true; localStorage.setItem('eggfarm.ui', JSON.stringify(u)); }); await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(800);
    for (const s of ['#wbCollect', '.modal button.btn']) { const l = p.locator(s).first(); if (await l.isVisible().catch(() => false)) await l.click().catch(() => {}); } await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: [], nextCustomerInS: 999, workers: {} }; }); await p.waitForTimeout(300); }
  const r = await p.evaluate(async () => { const g = window.eggfarm, sl = ms => new Promise(r => setTimeout(r, ms));
    const arrive = async () => { g.state = { ...g.state, nextCustomerInS: 0 }; await sl(120); g.state = { ...g.state, nextCustomerInS: 999 }; await sl(80); };
    while (g.state.customers.length < 5) await arrive(); await sl(400);
    const ev = []; const mo = new MutationObserver(ms => { const t = performance.now(); for (const m of ms) { for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.classList.contains('qpop')) ev.push({ t, k: 'pop', txt: n.textContent, x: n.style.left });
          if (n.classList.contains('squeeze')) { const cs = getComputedStyle(n); ev.push({ t, k: 'squeeze', tr: cs.transitionDuration, prop: cs.transitionProperty, fixed: n.style.position, left: n.style.left }); } }
        for (const n of m.removedNodes) if (n.nodeType === 1 && n.classList.contains('served') && !n.classList.contains('squeeze')) ev.push({ t, k: 'cardGone', left: Math.round(n.__l ?? -1) }); } });
    g.dispatch({ type: 'sell', customerId: g.state.customers[0].id }); await sl(250);
    const card = document.querySelector('.queue .chip.served'); const cardInfo = card ? { txt: card.textContent, live: document.querySelectorAll('.queue .chip:not(.empty):not(.served) img.cust').length, left: Math.round(card.getBoundingClientRect().left) } : null;
    mo.observe(document.body, { childList: true, subtree: true });
    const t0 = performance.now(); await arrive(); await sl(400); mo.disconnect();
    const live = document.querySelectorAll('.queue .chip:not(.empty):not(.served) img.cust').length, still = !!document.querySelector('.queue .chip.served');
    // opacity sample of fading clone
    return { cardInfo, ev: ev.map(e => ({ ...e, t: Math.round(e.t - t0) })), liveAfter: live, cardStillInStrip: still }; });
  await p.screenshot({ path: `${OUT}/squeeze-${rmo ? 'rm' : 'anim'}-${ENGINE}.png` });
  const pop = r.ev.find(e => e.k === 'pop'), sq = r.ev.find(e => e.k === 'squeeze');
  if (!rmo) ok('S2-3a-1 squeezed card: 120 ms opacity fade + "+$X" pop', !!r.cardInfo && !r.cardStillInStrip && pop && /^\+\$/.test(pop.txt) && sq && /0\.12s|120ms/.test(sq.tr) && /opacity/.test(sq.prop), r);
  else ok('S2-3a-1 squeezed card, reduced motion: instant cut (no fade clone) + pop', !!r.cardInfo && !r.cardStillInStrip && pop && !sq, r);
  await ctx.close(); }
await done();
