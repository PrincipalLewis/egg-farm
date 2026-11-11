// Player 7d52952 playtest bugs (P-1..P-7, collect label). node qa-p.mjs <engine> <port> <outdir>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const pw = createRequire(process.cwd() + '/package.json')('playwright-core');
const [ENG, PORT, OUT] = process.argv.slice(2); if (+PORT === 4173) process.exit(3); const base = `http://127.0.0.1:${PORT}/`;
const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 240; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
const br = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const DONE = JSON.stringify({ onboardingDone: true, sessions: 3, seenSlots: 99, workersIntroA: true, workersIntroB: true });
const R = {}; const log = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 900)); };
async function open(w, h, ui = DONE) { const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: false }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(u => { if (!sessionStorage.qa) { localStorage.clear(); if (u) localStorage.setItem('eggfarm.ui', u); sessionStorage.qa = 1; } }, ui);
  await p.goto(base, { timeout: 90000 }); await p.getByText('Tap to start').click(); await p.waitForTimeout(900); return { ctx, p, errs }; }
const set = (p, o) => p.evaluate(o => { const g = window.eggfarm; g.state = { ...g.state, ...o }; }, o);
const st = p => p.evaluate(() => { const s = window.eggfarm.state; return { coins: s.coinsCents, basket: s.basket, coop: s.coop, cust: s.customers.map(c => `${c.id}:${c.filled}/${c.demand}`) }; });
const onb = p => p.evaluate(() => { const R = e => { if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) } : null; };
  const hand = R(document.querySelector('.onb-hand')), ring = R(document.querySelector('.onb-ring')); const ov = (a, c) => a && c && Math.min(a.r,c.r) > Math.max(a.l,c.l) && Math.min(a.b,c.b) > Math.max(a.t,c.t);
  const at = ring ? document.elementFromPoint((ring.l + ring.r) / 2, (ring.t + ring.b) / 2) : null; const sells = [...document.querySelectorAll('#mRows button[data-id]')].map((b, i) => ({ i, id: b.dataset.id, r: R(b) })).filter(x => x.r);
  return { cap: document.querySelector('.onb-cap')?.textContent, hand, ring, ringOn: at ? (at.id || at.closest('[id]')?.id || '') + '|' + (at.closest('button')?.textContent || at.className).toString().replace(/\s+/g, ' ').slice(0, 40) : null, handOverSell: sells.filter(s => ov(hand, s.r)).map(s => s.i), sells: sells.map(s => s.i + ':' + s.r.t), coach: [...document.querySelectorAll('.coach')].map(c => ({ t: c.textContent.slice(0, 40), r: R(c) })) }; });
for (const [w, h] of (process.env.SIZES || "360x740,375x700,390x844").split(",").map(s => s.split("x").map(Number))) {
  const k = `${w}`;
  // P-2 fresh-save FTUE at phone sizes
  try { const a = await open(w, h, null); const P = a.p; const out = {};
    await set(P, { coop: 40 }); for (let i = 0; i < 4; i++) { await P.locator('#collect').click(); await P.waitForTimeout(150); }
    for (let i = 0; i < 40; i++) { const c = await P.evaluate(() => window.eggfarm.state.customers.length); if (c >= 2) break; await P.waitForTimeout(500); if (i === 6) await set(P, { customers: [{ id: 901, demand: 3, filled: 0, waitedS: 0 }, { id: 902, demand: 4, filled: 0, waitedS: 0 }] }); }
    await P.waitForTimeout(500); out.sellStepStrip = await onb(P); await P.screenshot({ path: `${OUT}/${ENG}-p2-sellstep-strip-${k}.png` });
    await P.locator('#queue .chip:not(.empty)').first().click().catch(() => {}); await P.waitForTimeout(700); out.sellStepMarket = await onb(P); await P.screenshot({ path: `${OUT}/${ENG}-p2-sellstep-market-${k}.png` });
    await P.locator('#mRows button[data-id]').first().click().catch(() => {}); await P.waitForTimeout(800); out.upgradeStep = await onb(P); await P.screenshot({ path: `${OUT}/${ENG}-p2-upgradestep-${k}.png` });
    await set(P, { coinsCents: 1e6 }); await P.locator('.sheet:not([hidden]) .close').click().catch(() => {}); await P.waitForTimeout(400); await P.locator('[data-nav=upgrades]').click().catch(() => {}); await P.waitForTimeout(600); out.buyStep = await onb(P);
    await P.locator('#uRow .btn.buy').first().click().catch(() => {}); await P.waitForTimeout(900); out.goalTip = await onb(P);
    out.goalTipVsBuy = await P.evaluate(() => { const c = [...document.querySelectorAll('.coach')].find(x => /next goal/.test(x.textContent)); if (!c) return null; const b = c.getBoundingClientRect(); const ov = r => Math.min(b.right, r.right) > Math.max(b.left, r.left) && Math.min(b.bottom, r.bottom) > Math.max(b.top, r.top);
      const g = document.querySelector('.goal-label, #goal, .goal'); const gr = g?.getBoundingClientRect();
      return { coversBuy: [...document.querySelectorAll('.btn.buy')].filter(x => x.getBoundingClientRect().width && ov(x.getBoundingClientRect())).length, goalVisible: !!(gr && gr.width && gr.bottom > 0 && gr.top < innerHeight), goalRect: gr ? [gr.left|0, gr.top|0, gr.width|0, gr.height|0] : null, tip: [b.left|0, b.top|0, b.right|0, b.bottom|0], sheetOpen: !!document.querySelector('.sheet:not([hidden])') }; });
    await P.screenshot({ path: `${OUT}/${ENG}-p2-goaltip-${k}.png` }); log(`${ENG} ${k} P-2`, out); await a.ctx.close(); } catch (e) { log(`${ENG} ${k} P-2 ERR`, String(e)); }
  // P-4 / P-3 Sell all with 60 eggs, 4 orders
  try { const a = await open(w, h); const P = a.p; await set(P, { farmLevel: 5, basket: 60, nextCustomerInS: 999, customers: [{ id: 11, demand: 10, filled: 0, waitedS: 0 }, { id: 12, demand: 19, filled: 0, waitedS: 0 }, { id: 13, demand: 17, filled: 0, waitedS: 0 }, { id: 14, demand: 14, filled: 0, waitedS: 0 }] });
    await P.locator('[data-nav=market]').click().catch(() => {}); await P.waitForTimeout(500); const label = await P.locator('#sellAll').textContent(); const s0 = await st(P);
    await P.locator('#sellAll').click(); await P.waitForTimeout(250); const s1 = await st(P);
    const view = await P.evaluate(() => ({ rows: [...document.querySelectorAll('#mRows .order')].map(o => (o.querySelector('.l1')?.textContent || '') + ' [' + (o.querySelector('button')?.dataset.id || '') + ']'), served: [...document.querySelectorAll('.chip.served, .toast, .thanks')].map(e => e.textContent.replace(/\s+/g, ' ').slice(0, 40)) }));
    await P.screenshot({ path: `${OUT}/${ENG}-p4-after-sellall-${k}.png` }); await P.waitForTimeout(1500); const view2 = await P.evaluate(() => [...document.querySelectorAll('#mRows .order .l1')].map(e => e.textContent));
    log(`${ENG} ${k} P-4`, { label, s0, s1, credited: s1.coins - s0.coins, eggsSold: s0.basket - s1.basket, view, view1500ms: view2 });
    // P-3: label at the tap moment vs credit, with a customer arriving just before the tap
    await set(P, { basket: 80, customers: [{ id: 21, demand: 30, filled: 0, waitedS: 0 }], nextCustomerInS: 0.02 }); await P.waitForTimeout(16); const lab = await P.locator('#sellAll').textContent(); const t0 = await st(P); await P.locator('#sellAll').click(); await P.waitForTimeout(200); const t1 = await st(P);
    await set(P, { basket: 80, customers: [{ id: 31, demand: 30, filled: 0, waitedS: 0 }], nextCustomerInS: 999 }); await P.waitForTimeout(300); const lab2 = await P.locator('#sellAll').textContent(); await set(P, { customers: [{ id: 31, demand: 30, filled: 0, waitedS: 0 }, { id: 32, demand: 4, filled: 0, waitedS: 0 }] }); const lab2b = await P.locator('#sellAll').textContent(); const u0 = await st(P); await P.locator('#sellAll').click(); await P.waitForTimeout(200); const u1 = await st(P);
    log(`${ENG} ${k} P-3`, { arrivalRace: { labelBeforeTap: lab, sold: t0.basket - t1.basket, credited: t1.coins - t0.coins }, staleCheck: { labelOneCust: lab2, labelRightAfterArrival_sameFrame: lab2b, sold: u0.basket - u1.basket, credited: u1.coins - u0.coins } });
    await a.ctx.close(); } catch (e) { log(`${ENG} ${k} P-4/3 ERR`, String(e)); }
  // P-1 / P-5 / collect label
  try { const a = await open(w, h); const P = a.p; await set(P, { farmLevel: 3, basket: 20, customers: [], nextCustomerInS: 999 }); await P.locator('[data-nav=market]').click().catch(() => {}); await P.waitForTimeout(500);
    const p1 = await P.evaluate(() => ({ sellAll: document.querySelector('#sellAll')?.textContent, body: (document.querySelector('#mRows')?.textContent || '').replace(/\s+/g, ' ').slice(0, 80), basket: Math.floor(window.eggfarm.state.basket) }));
    await P.screenshot({ path: `${OUT}/${ENG}-p1-noeggs-${k}.png` }); await P.locator('.sheet:not([hidden]) .close').click().catch(() => {});
    await set(P, { farmLevel: 6, coinsCents: 5e6, customers: [] }); await P.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' })); await P.waitForTimeout(1200);
    const p5 = await P.evaluate(() => ({ qtag: [...document.querySelectorAll('.qtag, .bubble.qfull')].map(e => e.textContent), queueText: (document.querySelector('#queue')?.textContent || '').replace(/\s+/g, ' ').slice(0, 80), cust: window.eggfarm.state.customers.length }));
    await P.screenshot({ path: `${OUT}/${ENG}-p5-qfull-${k}.png` });
    // collect label / meter
    await set(P, { coop: 0.6, workers: {} }); await P.waitForTimeout(300); const c0 = await P.evaluate(() => ({ collect: document.querySelector('#collect')?.textContent.replace(/\s+/g, ' '), meter: document.querySelector('#meterText')?.textContent, coop: window.eggfarm.state.coop }));
    await set(P, { coop: 19.2 }); await P.waitForTimeout(200); const pre = await P.evaluate(() => ({ collect: document.querySelector('#collect')?.textContent.replace(/\s+/g, ' '), meter: document.querySelector('#meterText')?.textContent })); await P.locator('#collect').click(); await P.waitForTimeout(60); const post = await P.evaluate(() => ({ collect: document.querySelector('#collect')?.textContent.replace(/\s+/g, ' '), meter: document.querySelector('#meterText')?.textContent, coop: window.eggfarm.state.coop }));
    log(`${ENG} ${k} P-1`, p1); log(`${ENG} ${k} P-5`, p5); log(`${ENG} ${k} COLLECT`, { emptyCoop: c0, before: pre, after60ms: post }); await a.ctx.close(); } catch (e) { log(`${ENG} ${k} P-1/5 ERR`, String(e)); }
  // P-7 taps: Upgrades nav open/close x10, Farm Buy x10, card swap under the finger
  try { const a = await open(w, h); const P = a.p; await set(P, { farmLevel: 8, coinsCents: 1e12, workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } } }); let navMiss = 0, buyMiss = 0;
    for (let i = 0; i < 10; i++) { const bx = await P.locator('[data-nav=upgrades]').boundingBox(); await P.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await P.waitForTimeout(350); if (!(await P.evaluate(() => !!document.querySelector('.sheet:not([hidden]) #uRow')))) navMiss++; await P.locator('.sheet:not([hidden]) .close').click().catch(() => {}); await P.waitForTimeout(300); }
    await P.locator('[data-nav=upgrades]').click(); await P.waitForTimeout(300); await P.locator('[role=tab][data-tab=farm]').click(); await P.waitForTimeout(300);
    for (let i = 0; i < 10; i++) { const f0 = await P.evaluate(() => window.eggfarm.state.farmLevel); const bx = await P.locator('#uRow .btn.buy').first().boundingBox(); await P.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await P.waitForTimeout(250); if (await P.evaluate(() => window.eggfarm.state.farmLevel) === f0) buyMiss++; }
    await P.locator('.sheet:not([hidden]) .close').click().catch(() => {}); await set(P, { workers: {}, basket: 50, nextCustomerInS: 999, customers: [{ id: 41, demand: 5, filled: 0, waitedS: 29.5 }, { id: 42, demand: 5, filled: 0, waitedS: 0 }, { id: 43, demand: 5, filled: 0, waitedS: 0 }] });
    await P.locator('[data-nav=market]').click(); await P.waitForTimeout(150); const tgt = await P.locator('#mRows button[data-id="42"]').boundingBox(); await P.waitForTimeout(900);
    const s0 = await st(P); await P.mouse.click(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2); await P.waitForTimeout(200); const s1 = await st(P);
    log(`${ENG} ${k} P-7`, { navTaps: 10, navMiss, farmBuyTaps: 10, buyMiss, cardSwap: { aimedAt: 42, before: s0.cust, after: s1.cust } }); await a.ctx.close(); } catch (e) { log(`${ENG} ${k} P-7 ERR`, String(e)); }
  // P-6 worker tip vs tabs + Market Hand title (first hire via the hire tip)
  try { const a = await open(w, h, JSON.stringify({ onboardingDone: true })); const P = a.p; await set(P, { farmLevel: 6, coinsCents: 5e6 }); await P.locator('#iaOpen').click({ timeout: 8000 }); await P.waitForTimeout(600);
    const hire = await P.evaluate(() => { const c = document.querySelector('.coach'); if (!c) return null; const b = c.getBoundingClientRect(); const ov = r => r && r.width && Math.min(b.right, r.right) > Math.max(b.left, r.left) && Math.min(b.bottom, r.bottom) > Math.max(b.top, r.top);
      const row = document.querySelector('#uRow [data-w=market_hand]'); const title = row?.querySelector('b, h3, .name, .wname, .t'); return { t: c.textContent.slice(0, 40), tabs: [...document.querySelectorAll('[role=tablist]')].some(t => ov(t.getBoundingClientRect())), title: title ? ov(title.getBoundingClientRect()) : null, titleText: title?.textContent }; });
    await P.screenshot({ path: `${OUT}/${ENG}-p6-hiretip-${k}.png` }); await P.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' })); await P.waitForTimeout(700);
    const tired = await P.evaluate(() => { const c = [...document.querySelectorAll('.coach')].find(x => /tired/.test(x.textContent)); if (!c) return null; const b = c.getBoundingClientRect(); const ov = r => r && r.width && Math.min(b.right, r.right) > Math.max(b.left, r.left) && Math.min(b.bottom, r.bottom) > Math.max(b.top, r.top);
      const row = document.querySelector('#uRow [data-w=market_hand]'); const title = row?.querySelector('b, h3, .name, .wname, .t'); return { tabs: [...document.querySelectorAll('[role=tablist]')].some(t => ov(t.getBoundingClientRect())), title: title ? ov(title.getBoundingClientRect()) : null }; });
    await P.screenshot({ path: `${OUT}/${ENG}-p6-tiredtip-${k}.png` }); log(`${ENG} ${k} P-6`, { hireTip: hire, tiredTip: tired }); await a.ctx.close(); } catch (e) { log(`${ENG} ${k} P-6 ERR`, String(e)); }
}
fs.writeFileSync(`${OUT}/p-${ENG}-${process.env.SIZES||"all"}.json`, JSON.stringify(R, null, 1)); await br.close(); kill(); console.log('DONE', ENG); process.exit(0);
