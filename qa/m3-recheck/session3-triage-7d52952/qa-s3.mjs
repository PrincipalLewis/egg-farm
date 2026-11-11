// Session-3 triage on 7d52952 dist-qa. node qa-s3.mjs <engine> <port> <outdir>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const pw = createRequire(process.cwd() + '/package.json')('playwright-core');
const [ENG, PORT, OUT] = process.argv.slice(2); if (+PORT === 4173) process.exit(3); const base = `http://127.0.0.1:${PORT}/`;
const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 240; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
const br = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const DONE = JSON.stringify({ onboardingDone: true, sessions: 3, seenSlots: 99, workersIntroA: true, workersIntroB: true });
const R = {}; const log = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 700)); };
async function open(w, h, save = null) { const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(([ui, sv]) => { if (!sessionStorage.qa) { localStorage.setItem('eggfarm.ui', ui); if (sv) localStorage.setItem('eggfarm.save', sv); sessionStorage.qa = 1; } }, [DONE, save]);
  await p.goto(base, { timeout: 90000 }); await p.getByText('Tap to start').click(); await p.waitForTimeout(900); return { ctx, p, errs }; }
const set = (p, o) => p.evaluate(o => { const g = window.eggfarm; g.state = { ...g.state, ...o }; }, o);
const openUp = async (p, w, tab) => { if (w < 960) { await p.locator('[data-nav=upgrades]').click().catch(() => {}); await p.waitForTimeout(400); } if (tab) { await p.locator(`[role=tab][data-tab=${tab}]`).first().click().catch(() => {}); await p.waitForTimeout(400); } };
const W3 = { market_hand: { energy: 20, cdS: 0 }, coop_hand: { energy: 20, cdS: 0 }, hawker: { energy: 20, cdS: 0 } };
for (const [w, h] of (process.env.SIZES || "360x740,375x700,390x844,430x932,1280x720").split(",").map(s => s.split("x").map(Number))) {
  const k = `${w}`;
  // S3-1 offline vs coop cap (L15, 11m11s away, coop 51/800)
  if (process.env.S31) try { const a = await open(w, h); await set(a.p, { farmLevel: 15, collectionLevel: 15, coop: 51, basket: 0, coinsCents: 887319, customers: [] }); await a.p.waitForTimeout(1300);
    const raw = await a.p.evaluate(() => localStorage.getItem('eggfarm.save')); await a.ctx.close(); const f = JSON.parse(raw); f.savedAt = Date.now() - 671000; const sv = JSON.stringify(f);
    const b = await open(w, h, sv); const modal = await b.p.evaluate(() => (document.querySelector('.modal')?.textContent || '').replace(/\s+/g, ' ').slice(0, 200));
    const st = await b.p.evaluate(() => { const s = window.eggfarm.state; return { pending: s.pendingOfflineEggs, coop: s.coop, basket: s.basket, F: s.farmLevel }; });
    await b.p.screenshot({ path: `${OUT}/${ENG}-s3-1-offline-${k}.png` });
    await b.p.locator('.modal button.btn').first().click().catch(() => {}); await b.p.waitForTimeout(600); const after = await b.p.evaluate(() => { const s = window.eggfarm.state; return { coop: s.coop, basket: s.basket, coins: s.coinsCents }; });
    fs.writeFileSync(`${OUT}/s3-1-save-${ENG}-${k}.json`, sv); log(`${ENG} ${k} S3-1`, { modal, st, after, expect: { eggsPerSecL15: 16, offlineMult: 0.25, awayS: 671, formula: Math.floor(671*0.25*16), coopCap: 800, offline_max_eggs_2h_L15: 28800 } }); await b.ctx.close(); } catch (e) { log(`${ENG} ${k} S3-1 ERR`, String(e)); }
  // S3-2 dropped taps: 15 buy taps on Upgrades (collection), 120 ms apart, coins plenty; chromium also with 6x CPU throttle
  for (const thr of ENG === 'chromium' ? [1, 6] : [1]) { try { const a = await open(w, h); await set(a.p, { farmLevel: 15, collectionLevel: 1, coinsCents: 1e12, workers: W3 }); await openUp(a.p, w, 'collection');
    if (thr > 1) { const c = await a.ctx.newCDPSession(a.p); await c.send('Emulation.setCPUThrottlingRate', { rate: thr }); }
    const sel = '#uRow .btn.buy'; const c0 = await a.p.evaluate(() => window.eggfarm.state.collectionLevel); let miss = 0, detached = 0;
    for (let i = 0; i < 15; i++) { const bx = await a.p.locator(sel).first().boundingBox(); if (!bx) { miss++; continue; }
      const before = await a.p.evaluate(() => window.eggfarm.state.collectionLevel); await a.p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await a.p.waitForTimeout(120);
      const now = await a.p.evaluate(() => window.eggfarm.state.collectionLevel); if (now === before) miss++; }
    const c1 = await a.p.evaluate(() => window.eggfarm.state.collectionLevel); log(`${ENG} ${k} S3-2 thr${thr}`, { taps: 15, levels: c1 - c0, dropped: miss, errs: a.errs }); await a.ctx.close(); } catch (e) { log(`${ENG} ${k} S3-2 ERR`, String(e)); } }
  // S3-3 Manage all vs Market Hand Manage (3 workers tired)
  try { const a = await open(w, h); await set(a.p, { farmLevel: 15, coinsCents: 1e9, workers: W3 }); await openUp(a.p, w, 'workers'); await a.p.waitForTimeout(500);
    const r = await a.p.evaluate(() => { const m = document.querySelector('#uRow [data-w=market_hand] [data-act=manage]'); if (!m) return { found: false };
      m.scrollIntoView({ block: 'nearest' }); const b = m.getBoundingClientRect(); const pts = [[.5,.5],[.15,.5],[.85,.5],[.5,.15],[.5,.85]].map(([fx, fy]) => { const e = document.elementFromPoint(b.left + b.width*fx, b.top + b.height*fy); return e ? (m.contains(e) ? 'self' : (e.closest('[data-act]')?.getAttribute('data-act') || e.className || e.tagName)) : null; });
      const alls = [...document.querySelectorAll('[data-act=manageAll]')].filter(x => x.getBoundingClientRect().width).map(x => { const r = x.getBoundingClientRect(); return { l: r.left|0, t: r.top|0, r: r.right|0, b: r.bottom|0, cls: x.className }; });
      return { found: true, manage: { l: b.left|0, t: b.top|0, r: b.right|0, b: b.bottom|0 }, pts, alls, vh: innerHeight }; });
    await a.p.screenshot({ path: `${OUT}/${ENG}-s3-3-manage-${k}.png` });
    // also scroll the sheet to the bottom (sticky footer case)
    const r2 = await a.p.evaluate(() => { const m = document.querySelector('#uRow [data-w=market_hand] [data-act=manage]'); if (!m) return null; let sc = m.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement; if (sc) sc.scrollTop = 0;
      const b = m.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width/2, b.top + b.height/2); return { top0: e ? (m.contains(e) ? 'self' : (e.closest('[data-act]')?.getAttribute('data-act') || e.className)) : null, inVp: b.top >= 0 && b.bottom <= innerHeight }; });
    let tapOk = null; try { const before = await a.p.evaluate(() => window.eggfarm.state.workers.market_hand.energy); await a.p.locator('#uRow [data-w=market_hand] [data-act=manage]').click({ timeout: 3000 }); await a.p.waitForTimeout(300); tapOk = { before, after: await a.p.evaluate(() => window.eggfarm.state.workers.market_hand.energy) }; } catch (e) { tapOk = 'click blocked: ' + String(e).split('\n').find(l => /intercept/.test(l))?.slice(0, 160); }
    log(`${ENG} ${k} S3-3`, { ...r, scrollTop0: r2, tapOk }); await a.ctx.close(); } catch (e) { log(`${ENG} ${k} S3-3 ERR`, String(e)); }
  // S3-4 price preview vs sale: grader tier 1 working
  try { const a = await open(w, h); await set(a.p, { farmLevel: 10, collectionLevel: 9, coinsCents: 1e9, basket: 50, workers: { grader: { energy: 100, cdS: 0 } }, graderTier: 1, customers: [{ id: 77, demand: 10, filled: 0, waitedS: 0 }] }); const cards = {};
    for (const tb of ['collection', 'farm']) { await openUp(a.p, tb === 'farm' ? 9999 : w, tb); cards[tb] = await a.p.evaluate(() => [...new Set([...document.querySelectorAll('#uRow *')].map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(x => /^Egg price/.test(x) && x.length < 40))]); }
    if (w < 960) { await a.p.locator('.sheet:not([hidden]) .close').click().catch(() => {}); await a.p.locator('[data-nav=market]').click().catch(() => {}); await a.p.waitForTimeout(400); }
    const prev = await a.p.evaluate(() => document.querySelector('button[data-id="77"]')?.getAttribute('aria-label'));
    const c0 = await a.p.evaluate(() => window.eggfarm.state.coinsCents); await a.p.locator('button[data-id="77"]').click({ timeout: 4000 }).catch(() => {}); await a.p.waitForTimeout(300); const c1 = await a.p.evaluate(() => window.eggfarm.state.coinsCents);
    const nograd = await a.p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, workers: {}, graderTier: 0 }; return null; }); await a.p.waitForTimeout(300);
    await a.p.screenshot({ path: `${OUT}/${ENG}-s3-4-price-${k}.png` });
    log(`${ENG} ${k} S3-4`, { cardEggPrice: cards, sellBtnAria: prev, creditedCents: c1 - c0, perEggCents: (c1 - c0) / 10 }); await a.ctx.close(); } catch (e) { log(`${ENG} ${k} S3-4 ERR`, String(e)); }
  // S3-5/S3-6 ghost bubbles: 'Sold out!' (timeout) and 'Queue full!' (walk-off) x2
  try { const a = await open(w, h); await set(a.p, { farmLevel: 15, basket: 0, customers: [{ id: 300, demand: 5, filled: 0, waitedS: 29.6 }] });
    const grab = () => a.p.evaluate(() => [...document.querySelectorAll('.ghost .bubble')].map(b => { const r = b.getBoundingClientRect(), cs = getComputedStyle(b); return { t: b.textContent, l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), sw: b.scrollWidth, cw: b.clientWidth, vw: innerWidth, clipVp: r.right > innerWidth + 0.5 || r.left < -0.5, ws: cs.whiteSpace, ov: cs.overflow }; }));
    let so = []; for (let i = 0; i < 20 && !so.length; i++) { await a.p.waitForTimeout(100); so = await grab(); }
    if (so.length) await a.p.screenshot({ path: `${OUT}/${ENG}-s3-5-soldout-${k}.png` });
    // visible-text check for 'old out' (bubble left clipped by its container)
    const soVis = await a.p.evaluate(() => { const b = document.querySelector('.ghost .bubble.soldout'); if (!b) return null; let p = b.parentElement, clip = null; const r = b.getBoundingClientRect(); while (p) { const cs = getComputedStyle(p); if (cs.overflow !== 'visible' || cs.overflowX !== 'visible') { const q = p.getBoundingClientRect(); if (r.left < q.left - 0.5 || r.right > q.right + 0.5) { clip = { el: p.className || p.tagName, cl: Math.round(q.left), cr: Math.round(q.right) }; break; } } p = p.parentElement; } return { r: [Math.round(r.left), Math.round(r.right)], clip }; });
    await a.p.waitForTimeout(1500);
    const qmax = await a.p.evaluate(() => window.eggfarm.state.queueMax ?? null);
    const qf = []; for (let rep = 0; rep < 2; rep++) { await set(a.p, { customers: Array.from({ length: 9 }, (_, i) => ({ id: 500 + rep * 20 + i, demand: 5, filled: 0, waitedS: 0 })), nextCustomerInS: 0.05 }); for (let i = 0; i < 12; i++) { await a.p.waitForTimeout(80); const g = (await grab()).filter(x => /Queue/.test(x.t)); if (g.length) { qf.push({ rep, n: g.length, g }); if (rep === 0) await a.p.screenshot({ path: `${OUT}/${ENG}-s3-6-qfull-${k}.png` }); break; } } await a.p.waitForTimeout(700); }
    const dup = await a.p.evaluate(() => document.querySelectorAll('.ghost .bubble.qfull').length);
    log(`${ENG} ${k} S3-5`, { soldout: so, vis: soVis }); log(`${ENG} ${k} S3-6`, { qfull: qf, simultaneousAtEnd: dup }); await a.ctx.close(); } catch (e) { log(`${ENG} ${k} S3-5/6 ERR`, String(e)); }
  // S3-7 Farm L17 card
  try { const a = await open(w, h); await set(a.p, { farmLevel: 17, collectionLevel: 15, coinsCents: 1e9 }); await openUp(a.p, w, 'farm');
    const t = await a.p.evaluate(() => [...document.querySelectorAll('#uRow *')].filter(e => e.children.length === 0 || e.tagName === 'LI').map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(x => /^(Hens|Coop capacity|Egg price|Customer demand|Customers every)/.test(x)));
    await a.p.screenshot({ path: `${OUT}/${ENG}-s3-7-farm17-${k}.png` }); log(`${ENG} ${k} S3-7`, { lines: [...new Set(t)] }); await a.ctx.close(); } catch (e) { log(`${ENG} ${k} S3-7 ERR`, String(e)); }
}
fs.writeFileSync(`${OUT}/s3-${ENG}-${process.env.SIZES||"all"}.json`, JSON.stringify(R, null, 1)); await br.close(); kill(); console.log('DONE', ENG); process.exit(0);
