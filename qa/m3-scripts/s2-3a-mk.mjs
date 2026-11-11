// S2-3a MK-16..MK-22 browser checks. PORT=.. ENGINE=.. node s2-3a-mk.mjs <worktree>
import { setup } from './s2-lib.mjs';
const { ok, open, done, OUT, ENGINE } = await setup('s2-3a');
const MH = { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } };
// sample every 100 ms: any customer card (live or served) on screen; record each served card's lifetime + text
// 10536b4: an early-ended card is OK only if it was squeezed (120 ms fade clone, or instant cut under reduced motion) AND a +$X pop fired (±200 ms).
const watch = (p, ms) => p.evaluate(ms => new Promise(res => { let fr = 0, vis = 0, live = 0; const born = new Map(), life = [], early = [], txt = new Set(); let maxServed = 0;
  const pops = [], sq = []; let served = 0; const off = window.eggfarm.on(e => { if (e.type === 'customer_served') served++; });
  const mo = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.classList.contains('qpop')) pops.push(performance.now());
    if (n.classList.contains('squeeze')) sq.push({ t: performance.now(), tr: getComputedStyle(n).transitionDuration, prop: getComputedStyle(n).transitionProperty }); } });
  mo.observe(document.body, { childList: true, subtree: true });
  const iv = setInterval(() => { fr++; const q = document.querySelector('.queue'); const all = q ? [...q.querySelectorAll('.chip:not(.empty)')] : [];
    const sv = all.filter(c => c.classList.contains('served')); const lv = all.filter(c => !c.classList.contains('served') && c.querySelector('img.cust'));
    if (sv.length || lv.length) vis++; if (lv.length) live++; maxServed = Math.max(maxServed, sv.length);
    const now = performance.now(); for (const c of sv) { if (!born.has(c)) { born.set(c, now); txt.add(c.textContent.trim()); } }
    for (const [c, t] of born) if (!c.isConnected || !c.classList.contains('served')) { const L = Math.round(now - t); life.push(L); if (L < 1300) early.push({ L, end: now }); born.delete(c); } }, 100);
  setTimeout(() => { clearInterval(iv); mo.disconnect(); off();
    const ex = early.map(e => ({ L: e.L, pop: pops.some(t => t > e.end - 300 && t <= e.end + 200), squeeze: sq.find(s => s.t > e.end - 300 && s.t <= e.end + 200) ?? null }));
    res({ share: +(vis / fr * 100).toFixed(1), liveShare: +(live / fr * 100).toFixed(1), life, early: ex, txt: [...txt].slice(0, 4), maxServed, served, cards: life.length + born.size, pops: pops.length, squeezes: sq.length, sqTr: [...new Set(sq.map(s => s.tr + ' ' + s.prop))] }); }, ms); }), ms);
const lifeOk = r => r.life.length > 0 && r.life.every(x => x <= 1800) && r.life.filter(x => x >= 1300).length + r.early.filter(e => e.pop).length === r.life.length;
for (const [lbl, workers] of [['market-hand', MH], ['no-workers', {}]]) {
  const { ctx, p, errs } = await open({ patch: { farmLevel: 12, collectionLevel: 9, basket: 1500, workers } });
  const r = await watch(p, 60000); await p.screenshot({ path: `${OUT}/mk21-${lbl}-${ENGINE}.png` });
  
  if (lbl === 'market-hand') {
    ok('MK-16 served card shows "Thanks! +$X" ~1.5 s then leaves', r.life.length > 3 && lifeOk(r) && r.early.every(e => e.squeeze && /0\.12s|120ms/.test(e.squeeze.tr)) && r.txt.every(t => /^Thanks! \+\$/.test(t)), { n: r.life.length, min: Math.min(...r.life), max: Math.max(...r.life), early: r.early, served: r.served, cards: r.cards, pops: r.pops, sqTr: r.sqTr, txt: r.txt });
    ok('MK-21 Market Hand, F12, 1500 stock: card on screen >= 40% over 60 s', r.share >= 40, { ...r, life: undefined, errs });
  } else ok('MK-21b no workers: card on screen ~91.8% (>= 85%)', r.share >= 85, { ...r, life: undefined });
  await ctx.close(); }
// MK-18: served card not tappable, Sell all ignores it
{ const { ctx, p } = await open({ patch: { farmLevel: 12, collectionLevel: 9, basket: 1500, workers: {} } });
  await p.waitForSelector('.queue .chip:not(.empty):not(.served) img.cust', { timeout: 20000 });
  await p.click('.queue .chip:not(.empty)'); await p.waitForTimeout(400); await p.click('#sellAll').catch(() => {}); await p.locator('#p-market .close').click().catch(() => {});
  await p.waitForSelector('.queue .chip.served', { timeout: 3000 }).catch(() => {});
  const r = await p.evaluate(() => { const c = document.querySelector('.queue .chip.served'); if (!c) return { none: true }; const b = c.getBoundingClientRect();
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); const cs = getComputedStyle(c).pointerEvents;
    const coins = window.eggfarm.state.coinsCents; c.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const opened = !!document.querySelector('#p-market:not([hidden]).open, #p-market[aria-hidden=false]');
    return { pe: cs, hitIsServed: !!hit?.closest('.chip.served'), aria: c.getAttribute('aria-hidden'), coinsSame: coins === window.eggfarm.state.coinsCents, opened, ids: window.eggfarm.state.customers.length }; });
  await p.screenshot({ path: `${OUT}/mk18-served-${ENGINE}.png` });
  ok('MK-18 served card: pointer-events none, aria-hidden, click does nothing', !r.none && r.pe === 'none' && !r.hitIsServed && r.aria === 'true' && r.coinsSame && !r.opened, r); await ctx.close(); }
// MK-19 reduced motion: static card, same dwell
{ const { ctx, p } = await open({ patch: { farmLevel: 12, collectionLevel: 9, basket: 1500, workers: MH } });
  await p.evaluate(() => { const u = JSON.parse(localStorage.getItem('eggfarm.ui')); u.reducedMotion = true; localStorage.setItem('eggfarm.ui', JSON.stringify(u)); }); await p.reload(); await p.getByText('Tap to start').click(); await p.waitForTimeout(600);
  for (const s of ['#wbCollect', '.modal button.btn']) { const l = p.locator(s).first(); if (await l.isVisible().catch(() => false)) await l.click().catch(() => {}); }
  const rm = await p.waitForSelector('.queue .chip.served', { timeout: 20000 }).then(e => e.evaluate(c => ({ rm: c.classList.contains('rm'), anim: getComputedStyle(c).animationName }))).catch(e => ({ err: String(e) }));
  const r = await watch(p, 15000);
  ok('MK-19 reduced motion: static "Thanks!" card, same ~1.5 s dwell', rm.rm && lifeOk(r) && r.squeezes === 0 && r.early.every(e => e.pop), { rm, life: r.life.slice(0, 12), early: r.early, squeezes: r.squeezes, pops: r.pops }); await ctx.close(); }
// MK-22: first customer within 1 s of closing the welcome-back modal
{ const { ctx, p } = await open({ awayMs: 600e3, keepWelcome: true, patch: { farmLevel: 12, customers: [], nextCustomerInS: 999, workers: {} } });
  await p.waitForTimeout(1500); const before = await p.evaluate(() => window.eggfarm.state.customers.length);
  const t = await p.evaluate(() => new Promise(res => { document.querySelector('#wbCollect').click(); const t0 = performance.now();
    const iv = setInterval(() => { if (document.querySelector('.queue .chip:not(.empty):not(.served) img.cust')) { clearInterval(iv); res(Math.round(performance.now() - t0)); } else if (performance.now() - t0 > 5000) { clearInterval(iv); res(-1); } }, 20); }));
  await p.screenshot({ path: `${OUT}/mk22-${ENGINE}.png` });
  ok('MK-22 first customer appears within 1 s of closing welcome-back', before === 0 && t >= 0 && t <= 1000, { before, ms: t }); await ctx.close(); }
await done();
