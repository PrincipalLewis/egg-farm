// 10536b4 checks: S2-3a-1 fuzz + full-queue pop, S2-8 $0 gate, S2-9 chip tap, fast Collect. QA build: DIST=dist-qa ENGINE=.. PORT=.. node s2-money-10536b4.mjs <wt>
// FUZZ_S (default 300)
import { setup } from './s2-lib.mjs';
const { ok, open, done, OUT, ENGINE } = await setup('s2-money-10536b4');
const FUZZ_S = +(process.env.FUZZ_S ?? 300);
const MH = { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } };
const mkOpen = p => p.evaluate(() => !document.querySelector('#p-market').hidden);
const closeP = p => p.evaluate(() => window.eggfarmUi.openPanel(null));
// ---- 1. S2-3a-1 fuzz: every served customer -> card or pop
{ const { ctx, p, errs } = await open({ patch: { farmLevel: 12, collectionLevel: 9, basket: 1500, workers: MH } });
  const r = await p.evaluate(ms => new Promise(res => { const g = window.eggfarm; let served = 0, partial = 0; const ids = new Set();
    g.on(e => { if (e.type === 'customer_served') { served++; if (e.partial) partial++; } });
    let cards = 0, pops = 0, squeezes = 0, maxSimul = 0; const seen = new WeakSet();
    const mo = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) {
      if (n.classList.contains('qpop')) pops++; if (n.classList.contains('squeeze')) squeezes++;
      if (n.classList.contains('served') && !n.classList.contains('squeeze') && n.closest('.queue') && !seen.has(n)) { seen.add(n); cards++; } } });
    mo.observe(document.body, { childList: true, subtree: true });
    // random player input: collect / sell all / open+close market / keep stock topped
    const iv = setInterval(() => { const x = Math.random(); if (x < .3) document.querySelector('#collect').click(); else if (x < .4) { window.eggfarmUi.openPanel('market'); document.querySelector('#sellAll')?.click(); window.eggfarmUi.openPanel(null); }
      if (g.state.basket < 200) g.state = { ...g.state, basket: 1500 }; maxSimul = Math.max(maxSimul, document.querySelectorAll('.queue .chip.served').length); }, 400);
    setTimeout(() => { clearInterval(iv); mo.disconnect(); res({ served, partial, cards, pops, squeezes, uncovered: Math.max(0, served - cards - (pops - squeezes)), maxSimul }); }, ms); }), FUZZ_S * 1000);
  // cards+pops counted per DOM node; squeezed card counts once as card (its pop is extra), so uncovered = served - cards - non-squeeze pops
  ok(`S2-3a-1 fuzz ${FUZZ_S}s: every served customer got a card or a pop`, r.served > 20 && r.uncovered <= 1 && r.squeezes <= r.pops, { ...r, errs }); await ctx.close(); }
// ---- 1b. full-queue +$X pop (strip full -> served card has no slot -> pop only)
{ const { ctx, p } = await open({ patch: { farmLevel: 20, collectionLevel: 9, basket: 0, workers: {} } });
  await p.waitForFunction(() => document.querySelector('[data-nav=market]')?.dataset.queueFull === 'true', null, { timeout: 120000 }).catch(() => {});
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 5000 }; });
  const r = await p.evaluate(async () => { const out = []; for (let i = 0; i < 3; i++) { let pop = 0, card = 0; const mo = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.classList.contains('qpop')) pop++; if (n.classList.contains('served') && n.closest('.queue')) card++; } });
      mo.observe(document.body, { childList: true, subtree: true }); const full = document.querySelector('[data-nav=market]').dataset.queueFull, more = !!document.querySelector('.queue .chip.more');
      const g = window.eggfarm, c0 = g.state.coinsCents; g.dispatch({ type: 'sell', customerId: g.state.customers[0].id });
      await new Promise(r => setTimeout(r, 400)); mo.disconnect(); const txt = [...document.querySelectorAll('.qpop')].map(e => e.textContent); out.push({ full, more, pop, card, txt, earned: window.eggfarm.state.coinsCents - c0 }); } return out; });
  await p.screenshot({ path: `${OUT}/fullqueue-pop-${ENGINE}.png` });
  ok('S2-3a full-queue: sale with strip full fires a +$X pop (no card)', r.every(x => x.pop >= 1 && /^\+\$/.test(x.txt[0] ?? '')) && r.some(x => x.more && x.card === 0), r); await ctx.close(); }
// ---- 3. S2-8 $0 gate, accelerated 2 h with player loop
{ const { ctx, p, errs } = await open({ patch: { farmLevel: 12, collectionLevel: 9, coinsCents: 0, basket: 0, coop: 0, workers: MH } });
  await p.evaluate(() => { const g = window.eggfarm; window.__ev = []; g.on(e => { if (e.type === 'worker_state' || e.type === 'wage') window.__ev.push(e); }); });
  const r = await p.evaluate(() => { const g = window.eggfarm; let minCoins = Infinity, unpaidSeen = new Set(), resumed = new Set(), collectOk = 0, collectTry = 0, sellOk = 0, sellTry = 0, wagesWhileUnpaid = 0;
    for (let s = 0; s < 7200; s++) { // 2 h in 1 s steps; player acts every 20 s only
      const before = JSON.stringify(Object.fromEntries(Object.entries(g.state.workers).map(([k, w]) => [k, !!w.unpaid])));
      g.debugAdvance(1000); minCoins = Math.min(minCoins, g.state.coinsCents);
      for (const [k, w] of Object.entries(g.state.workers)) { if (w.unpaid) unpaidSeen.add(k); else if (JSON.parse(before)[k]) resumed.add(k); }
      if (s % 20 === 0 && s < 1200) { if (g.state.coop >= 1) { collectTry++; const b0 = g.state.basket; document.querySelector('#collect').click(); if (g.state.basket > b0) collectOk++; }
        if (g.state.basket >= 1 && g.state.customers.length) { sellTry++; const c0 = g.state.coinsCents; window.eggfarmUi.openPanel('market'); document.querySelector('#sellAll').click(); window.eggfarmUi.openPanel(null); if (g.state.coinsCents > c0) sellOk++; } }
      if (s === 1200) g.state = { ...g.state, coinsCents: 0 }; // second $0 drop mid-session, then hands-off 100 min
    }
    // soft-lock probe at end: drain to $0 again; collect + sell must still earn
    g.state = { ...g.state, coinsCents: 0 }; g.debugAdvance(5000); const c0 = g.state.coinsCents, b0 = g.state.basket; document.querySelector('#collect').click(); const collected = g.state.basket > b0 || g.state.coop < 1;
    window.eggfarmUi.openPanel('market'); document.querySelector('#sellAll').click(); window.eggfarmUi.openPanel(null);
    const ev = window.__ev; return { minCoins, endCoins: g.state.coinsCents, unpaidSeen: [...unpaidSeen], resumed: [...resumed], collectOk, collectTry, sellOk, sellTry, endCollect: collected, endSellEarned: g.state.coinsCents > c0 || !g.state.customers.length || g.state.basket < 1,
      unpaidEvents: ev.filter(e => e.state === 'unpaid').length, resumeEvents: ev.filter(e => e.type === 'worker_state' && e.state !== 'unpaid').length, workers: g.state.workers }; });
  ok('S2-8 $0 gate: money never negative over 2 h accelerated', r.minCoins >= 0, r);
  ok('S2-8 $0 gate: unpaid workers pause and resume', r.unpaidSeen.length > 0 && r.resumed.length > 0, { unpaid: r.unpaidSeen, resumed: r.resumed, unpaidEvents: r.unpaidEvents, resumeEvents: r.resumeEvents });
  ok('S2-8 $0 gate: Collect and Sell always work at $0, no soft-lock', r.collectOk === r.collectTry && r.sellOk === r.sellTry && r.endCollect && r.endSellEarned, { collect: `${r.collectOk}/${r.collectTry}`, sell: `${r.sellOk}/${r.sellTry}`, end: [r.endCollect, r.endSellEarned], errs });
  await ctx.close(); }
// ---- 4. S2-9 chip tap rules
{ const { ctx, p } = await open({ patch: { farmLevel: 20, collectionLevel: 9, basket: 0, workers: {} } });
  // (a) no auto-open while queue fills to full (watch 60 s)
  const auto = await p.evaluate(() => new Promise(res => { let opened = false; const iv = setInterval(() => { if (!document.querySelector('#p-market').hidden) opened = true; }, 50);
    const t0 = performance.now(); const w = setInterval(() => { if (document.querySelector('[data-nav=market]').dataset.queueFull === 'true' && performance.now() - t0 > 5000 || performance.now() - t0 > 60000) { clearInterval(iv); clearInterval(w); res({ opened, full: document.querySelector('[data-nav=market]').dataset.queueFull, ms: Math.round(performance.now() - t0) }); } }, 100); }));
  ok('S2-9 no auto-open as queue fills', !auto.opened && auto.full === 'true', auto);
  const chips = p.locator('.queue .chip:not(.empty):not(.served)');
  // (b) deliberate tap on an on-screen chip opens
  await chips.first().click(); await p.waitForTimeout(200); const b1 = await mkOpen(p); await closeP(p); await p.waitForTimeout(200);
  ok('S2-9 tap on on-screen chip opens Market', b1, { opened: b1 });
  // (c) down on chip A, up on chip B -> no open
  const ba = await chips.nth(0).boundingBox(), bb = await chips.nth(1).boundingBox();
  await p.mouse.move(ba.x + ba.width / 2, ba.y + ba.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(200);
  const c1 = await mkOpen(p); await closeP(p);
  // (d) down on empty strip area / scene, up on chip -> no open
  const qb = await p.locator('.queue').boundingBox(); await p.mouse.move(qb.x + qb.width - 4, qb.y + qb.height - 2); await p.mouse.down(); await p.mouse.move(ba.x + ba.width / 2, ba.y + ba.height / 2, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(200);
  const d1 = await mkOpen(p); await closeP(p);
  ok('S2-9 tap that started elsewhere (other chip / empty area) does not open', !c1 && !d1, { chipAtoB: c1, emptyToChip: d1 });
  // (e) fresh chip < 250 ms: sell front so a new chip appears, then tap it immediately (in-page, real pointer events)
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: [], basket: 0, nextCustomerInS: 0.5 }; });
  const e1 = await p.evaluate(() => new Promise(res => { const q = document.querySelector('.queue'); const mo = new MutationObserver(() => { const c = q.querySelector('.chip:not(.empty):not(.served)'); if (c) { mo.disconnect();
      const r = c.getBoundingClientRect(), o = { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 1, isPrimary: true };
      setTimeout(() => { c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); c.dispatchEvent(new MouseEvent('click', o));
        setTimeout(() => { const early = !document.querySelector('#p-market').hidden; window.eggfarmUi.openPanel(null);
          setTimeout(() => { c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); c.dispatchEvent(new MouseEvent('click', o)); setTimeout(() => res({ at100ms: early, at400ms: !document.querySelector('#p-market').hidden }), 100); }, 200); }, 50); }, 100); } });
    mo.observe(q, { childList: true, subtree: true }); setTimeout(() => res({ timeout: true }), 15000); }));
  await closeP(p);
  ok('S2-9 chip on screen < 250 ms does not open; same chip later does', e1.at100ms === false && e1.at400ms === true, e1); await ctx.close(); }
// ---- 5. Fast Collect
{ const { ctx, p } = await open({ patch: { farmLevel: 12, collectionLevel: 9, coop: 5000, basket: 0, workers: {} } });
  const ta = await p.evaluate(() => ['#app', '.scene', '.queue', '#collect'].map(s => [s, getComputedStyle(document.querySelector(s)).touchAction]));
  ok('Fast Collect: touch-action manipulation on #app/.scene/.queue', ta.slice(0, 3).every(x => x[1] === 'manipulation'), ta);
  await p.evaluate(() => { const g = window.eggfarm; window.__c = []; g.on(e => { if (e.type === 'collect') window.__c.push(performance.now()); });
    window.__fx = { sq: [], pop: [] }; const btn = document.querySelector('#collect');
    new MutationObserver(ms => { for (const m of ms) if (m.attributeName === 'class' && btn.classList.contains('squash')) window.__fx.sq.push(performance.now()); }).observe(btn, { attributes: true });
    new MutationObserver(ms => { for (const m of ms) { for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('floater')) window.__fx.pop.push(performance.now());
      if (m.type === 'attributes' && m.target.classList?.contains('floater') && m.target.classList.contains('floater')) window.__fx.pop.push(performance.now()); } }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
  for (const [lbl, sel, n, gap] of [['button 10x@50ms', '#collect', 10, 50], ['scene 10x@50ms', '#scene', 10, 50], ['button 45x@15/s', '#collect', 45, 67], ['scene 45x@15/s', '#scene', 45, 67]]) {
    await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 5000, basket: 0 }; window.__c.length = 0; window.__fx.sq.length = 0; window.__fx.pop.length = 0; window.__taps = []; });
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
