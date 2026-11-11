// QA rc1-ui recheck (fc8e1cf). ENGINE=chromium|firefox|webkit OUT=... node rc1-ui-qa.mjs <worktree>
import { setup } from './s2-lib.mjs';
const { ENGINE, OUT, ok, open, done } = await setup('rc1-ui');
const getOp = () => '';
const S = (p, f) => p.screenshot({ path: `${OUT}/${f}-${ENGINE}.png` });
const set = (p, patch) => p.evaluate(pt => { const g = window.eggfarm; g.state = { ...g.state, ...pt }; }, patch);
const fullQ = n => Array.from({ length: n }, (_, i) => ({ id: 900 + i, demand: 500, filled: 0, waitedS: 0 }));
const tired = { market_hand: { energy: 20, cdS: 0 }, coop_hand: { energy: 30, cdS: 0 }, hawker: { energy: 100, cdS: 0 }, grader: { energy: 100, cdS: 0 } };
const qmax = p => p.evaluate(() => { for (let n = 1; n < 40; n++) { const g = window.eggfarm; } return null; });
const safe = async (n, fn) => { try { await fn(); } catch (e) { ok(n + ' (script error)', false, String(e).slice(0, 300)); } };

// S2-6 + S2-9 + S2-3a full queue pop
await safe('S2-6/S2-9', async () => { for (const w of [360, 375, 390]) {
  const { ctx, p, errs } = await open({ width: w, patch: { customers: fullQ(9), basket: 0, nextCustomerInS: 999 } });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const t = document.querySelector('.qtag'), q = t?.parentElement; if (!t) return null; const tr = t.getBoundingClientRect(), qr = q.getBoundingClientRect();
    const kids = [...q.querySelectorAll('.chip,.cust,.more,[class*=chip]')].filter(e => e !== t && !t.contains(e)).map(e => e.getBoundingClientRect());
    const over = kids.some(k => k.width && !(k.bottom <= tr.top || k.top >= tr.bottom || k.right <= tr.left || k.left >= tr.right));
    return { text: t.innerText.trim(), straddle: tr.top < qr.top && tr.bottom > qr.top, over, n: kids.length }; });
  ok(`S2-6 ${w}px queue-full tag straddles strip, covers no chip`, r && r.straddle && !r.over && (w < 380 ? r.text === 'Full' : r.text === 'Queue full'), r);
  const d = await p.evaluate(() => { const e = document.querySelector('.qdot'), cs = getComputedStyle(e), b = e.getBoundingClientRect();
    return { shown: !e.hidden && cs.display !== 'none', w: b.width, h: b.height, bg: cs.backgroundColor, bw: cs.borderTopWidth, bc: cs.borderTopColor, inner: b.width - 2 * parseFloat(cs.borderTopWidth), aria: document.querySelector('[data-nav=market]').getAttribute('aria-label') }; });
  ok(`S2-9 ${w}px Market dot 14px box, 10px #B83B37 fill (2px white ring), aria`, d.shown && d.w === 14 && d.h === 14 && d.inner === 10 && d.bg === 'rgb(184, 59, 55)' && d.aria === 'Market, queue full', d);
  if (w === 375) { await S(p, 's2-6-s2-9-full-375');
    const pulses = await p.evaluate(() => new Promise(r => { let n = 0; const e = document.querySelector('.qdot'); const mo = new MutationObserver(() => { if (e.classList.contains('qdpulse')) n++; }); mo.observe(e, { attributes: true }); setTimeout(() => { mo.disconnect(); r(n); }, 11500); }));
    ok('S2-9 dot pulses at most once per 10 s (and does pulse)', pulses >= 1 && pulses <= 2, { pulses });
    // full-queue +$X pop (S2-3a)
    const fl = p.waitForSelector('.floater.coin', { timeout: 4000 }).then(e => e.textContent()).catch(() => null);
    await set(p, { basket: 50 }); await p.evaluate(() => window.eggfarm.dispatch({ type: 'sell', customerId: 900 }));
    const ft = await fl; ok('S2-3a full queue: sale shows +$X coin pop', ft && /^\+\$/.test(ft), ft); await p.waitForTimeout(200); await S(p, 's2-3a-pop-375');
    await p.locator('[data-nav=market]').click(); await p.waitForTimeout(500);
    const g = await p.evaluate(() => document.querySelector('.qdot').hidden); ok('S2-9 dot clears when Market opened', g); }
  ok(`${w}px no page errors (full queue)`, !errs.length, errs); await ctx.close(); } });

// Yellow fragment: 1 s after collect / toast animation, no particles left, none at top-left
await safe('fragment', async () => { const { ctx, p } = await open({ width: 375, patch: { coop: 500, workers: {}, customers: [], nextCustomerInS: 9999 } });
  await p.locator('#collect, .collect, [data-act=collect]').first().click().catch(() => p.evaluate(() => window.eggfarm.dispatch({ type: 'collect' })));
  await p.waitForTimeout(400); const mid = await p.evaluate(() => document.querySelector('#fx-layer').children.length);
  await p.waitForTimeout(2600);
  const r = await p.evaluate(() => { const L = document.querySelector('#fx-layer'); const left = [...document.querySelectorAll('#fx-layer *, .floater, .particle')].map(e => { const b = e.getBoundingClientRect(); return { c: e.className, x: b.x, y: b.y }; }); return { left, corner: left.filter(e => e.x < 60 && e.y < 60).length }; });
  await S(p, 'fragment-1s-after-collect-375'); ok('Yellow fragment: no fx nodes ~1 s after collect animation, none near top-left', r.left.length === 0 && r.corner === 0, { mid, ...r }); await ctx.close(); });

// S2-5 Refill nav
await safe('S2-5', async () => { const { ctx, p, errs } = await open({ width: 375, patch: { workers: tired, manageCdS: 0 } }); await p.waitForTimeout(800);
  const v = await p.evaluate(() => { const vis = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    const all = [...document.querySelectorAll('[data-act=manageAll]')].filter(vis); const nb = [...document.querySelectorAll('nav.actions > button')].filter(vis);
    const m = document.querySelector('nav.actions .nav-manage'), lb = m?.querySelector('.nav-lbl'), bd = m?.querySelector('.count-badge'), cs = lb && getComputedStyle(lb);
    return { manageAll: all.length, unlabeled: all.filter(e => !e.innerText.trim() || !e.getAttribute('aria-label')).length, nav: nb.map(b => [b.innerText.trim().replace(/\s+/g, ' '), Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]),
      label: lb?.textContent, fs: cs?.fontSize, badge: bd && !bd.hidden ? bd.textContent : null, badgeBg: bd && getComputedStyle(bd).backgroundColor, aria: m?.getAttribute('aria-label'), bg: m && getComputedStyle(m).backgroundColor }; });
  const widths = v.nav.map(n => n[1]);
  ok('S2-5 one visible Manage-all control, labelled (no unlabeled/duplicate)', v.manageAll === 1 && v.unlabeled === 0, v);
  ok('S2-5 nav "Refill" 12px + red N=2 badge, aria "Refill 2 tired workers", no green fill', v.label === 'Refill' && v.fs === '12px' && v.badge === '2' && v.aria === 'Refill 2 tired workers' && v.bg === 'rgba(0, 0, 0, 0)', v);
  ok('S2-5 4 equal nav buttons, 64px tall', v.nav.length === 4 && Math.max(...widths) - Math.min(...widths) <= 1 && v.nav.every(n => n[2] >= 64), v.nav);
  await S(p, 's2-5-refill-375'); await p.locator('nav.actions .nav-manage').click(); await p.waitForTimeout(1500);
  const c = await p.evaluate(() => { const m = document.querySelector('nav.actions .nav-manage'), img = m.querySelector('.manage-ico img'); m.focus();
    return { label: m.querySelector('.nav-lbl').textContent, dis: m.getAttribute('aria-disabled'), aria: m.getAttribute('aria-label'), focus: document.activeElement === m, imgFilter: getComputedStyle(img).filter + ' ' + getComputedStyle(m.querySelector('.manage-ico')).filter, imgOp: getComputedStyle(img).opacity, icoOp: +getComputedStyle(m.querySelector('.manage-ico')).opacity, ring: !!m.querySelector('.ring-cooldown') }; });
  ok('S2-5 cooldown "0:2x", aria-disabled, focusable, aria "Refill available in N seconds"', /^0:2\d$/.test(c.label) && c.dis === 'true' && c.focus && /^Refill available in \d+ seconds$/.test(c.aria), c);
  ok('S2-5 (c) Refill nav icon greyed during cooldown (greyscale + .55 opacity)', /grayscale\(1\)|grayscale\(100%\)/.test(c.imgFilter + getOp(c)) && Math.abs(+c.imgOp * (c.icoOp ?? 1) - 0.55) < 0.02, c);
  await S(p, 's2-5-cooldown-375');
  const a1 = c.aria; await p.waitForTimeout(2500); const a2 = await p.locator('nav.actions .nav-manage').getAttribute('aria-label');
  ok('S2-5 cooldown aria not changed within 5 s', a1 === a2, { a1, a2 }); ok('S2-5 no page errors', !errs.length, errs); await ctx.close();
  for (const w of [960, 1280]) { const { ctx, p } = await open({ width: w, height: 800, patch: { workers: tired, manageCdS: 0 } }); await p.waitForTimeout(800);
    await p.locator('[data-nav=upgrades]').click().catch(() => {}); await p.waitForTimeout(500);
    const d = await p.evaluate(() => [...document.querySelectorAll('[data-act=manageAll]')].map(e => { const b = e.getBoundingClientRect(); return { cls: e.className, t: e.innerText.trim(), h: b.height, w: b.width }; }).filter(x => x.h > 0));
    const pill = d.find(x => /Refill tired/.test(x.t));
    ok(`S2-5 (d) ${w}px docked "Refill tired (N)" pill >= 44px tall`, pill && pill.h >= 44, d); await S(p, `s2-5-docked-${w}`); await ctx.close(); } });

// S2-1 coop tiers + 2.5 s toast over open sheet
await safe('S2-1', async () => { const { ctx, p } = await open({ width: 375 }); await p.locator('[data-nav=upgrades]').click(); await p.locator('[data-tab=farm]').click().catch(() => {});
  for (const [F, sp] of [[4, 'coop-l5.svg'], [9, 'coop-l10.svg'], [19, 'coop-l20.svg']]) {
    await set(p, { farmLevel: F, celebratedTier: F >= 19 ? 2 : F >= 9 ? 1 : 0, coinsCents: 1e15 }); await p.waitForTimeout(300);
    const t0 = Date.now(); await p.evaluate(() => window.eggfarm.dispatch({ type: 'buyFarm' })); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const t = document.querySelector('.toast'), b = t.getBoundingClientRect(), x = b.x + b.width / 2, y = b.y + b.height / 2; const pz = +getComputedStyle(document.querySelector('#panel-layer')).zIndex, mz = +getComputedStyle(document.querySelector('.modal') ?? document.body).zIndex || 0, tz = +getComputedStyle(t).zIndex; // toast is pointer-events:none, so compare stacking
      const top = null;
      return { src: document.querySelector('#coop').getAttribute('src').split('/').pop(), sheet: !document.querySelector('#p-upgrades').hidden, text: t.textContent, show: t.classList.contains('show'), onTop: tz > pz && tz > mz && getComputedStyle(t).visibility === 'visible' && b.top >= 0, tz, pz }; });
    await S(p, `s2-1-toast-sheet-F${F + 1}-375`);
    await p.waitForTimeout(2200 - (Date.now() - t0)); const at22 = await p.evaluate(() => document.querySelector('.toast').classList.contains('show'));
    await p.waitForTimeout(2900 - (Date.now() - t0)); const at29 = await p.evaluate(() => document.querySelector('.toast').classList.contains('show'));
    ok(`S2-1 F${F}->${F + 1}: ${sp}, toast above open sheet, up at 2.2 s, gone by 2.9 s`, r.src === sp && r.sheet && r.text === 'Coop upgraded!' && r.show && r.onTop && at22 && !at29, { ...r, at22, at29 }); }
  await ctx.close();
  const srcs = await (async () => { const { ctx, p } = await open({ width: 375 }); const out = await p.evaluate(async () => Promise.all(['coop-l5.svg', 'coop-l10.svg', 'coop-l20.svg'].map(f => fetch('assets/' + f).then(r => r.text()).then(t => t.length + ':' + t.slice(0, 0)).catch(e => 'ERR')))); await ctx.close(); return out; })();
  ok('S2-1 three distinct coop SVGs served', new Set(srcs).size === 3 && !srcs.includes('ERR'), srcs); });

// S2-4c welcome-back sold line
await safe('S2-4c', async () => { const { ctx, p } = await open({ width: 375, awayMs: 600_000, keepWelcome: true, patch: { customers: fullQ(3), basket: 0 } }); await p.waitForTimeout(600);
  const t = await p.evaluate(() => document.querySelector('#wbSold')?.textContent ?? null); await S(p, 's2-4c-welcome-375');
  const m = t && t.match(/^Market Hand sold ([\d.,]+[KMB]?) right away\u00a0· \+\$([\d.,]+[KMB]?)$/);
  const c0 = await p.evaluate(() => window.eggfarm.state.coinsCents);
  await p.locator('#wbCollect').click().catch(() => {}); await p.waitForTimeout(1500);
  const c1 = await p.evaluate(() => window.eggfarm.state.coinsCents);
  const css = await p.evaluate(() => null);
  ok('S2-4c line "Market Hand sold X right away · +$Y" with formatted values', !!m, t);
  ok('S2-4c money rises by at least +$Y within 1.5 s of Collect (one Market Hand cycle)', m && (c1 - c0) / 100 >= parseFloat(m[2].replace(/,/g, '')) * (/K$/.test(m[2]) ? 1000 : /M$/.test(m[2]) ? 1e6 : 1) * 0.9, { t, gain: (c1 - c0) / 100 });
  await ctx.close();
  const { ctx: c2, p: p2 } = await open({ width: 375, awayMs: 600_000, keepWelcome: true, patch: { customers: [], workers: { coop_hand: { energy: 100, cdS: 0 } } } }); await p2.waitForTimeout(600);
  const h = await p2.evaluate(() => ({ wb: !!document.querySelector('#wbCollect'), sold: document.querySelector('#wbSold')?.textContent ?? null }));
  ok('S2-4c line hidden when nothing sold (no Market Hand)', h.wb && h.sold === null, h); await c2.close(); });

// S2-8 (stub) wage + net rate
await safe('S2-8', async () => { const { ctx, p, errs } = await open({ width: 375, patch: { customers: [], basket: 0, nextCustomerInS: 9999 } }); await p.waitForTimeout(3500);
  const r = await p.evaluate(() => { const e = document.querySelector('#rate'); return { text: e.textContent, sign: e.dataset.sign, color: getComputedStyle(e).color, fs: getComputedStyle(e).fontSize, aria: e.getAttribute('aria-label'), cps: [...e.textContent].map(c => c.codePointAt(0).toString(16)) }; });
  ok('S2-8 (a) negative rate: "▼−$X/s" with U+25BC + U+2212, no hyphen, #B83B37 11px', r.sign === 'neg' && /^\u25BC\u2212\$\d+\.\d\d\/s$/.test(r.text) && !r.text.includes('-') && r.color === 'rgb(184, 59, 55)' && r.fs === '11px' && /^Net income minus /.test(r.aria), r);
  await S(p, 's2-8-neg-rate-375');
  await p.locator('[data-nav=upgrades]').click(); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(600);
  const wl = await p.evaluate(() => [...document.querySelectorAll('.wage')].map(e => e.textContent.trim()));
  const wrate = await p.evaluate(() => null);
  ok('S2-8 wage lines on worker cards: "Wage $X/min" (<$0.10/s) or "Wage $X/s"', wl.length >= 1 && wl.every(t => /^Wage \$\d+\.\d\d\/min$|^Wage \$[\d.]+[KM]?\/s$/.test(t)), wl); await S(p, 's2-8-wage-375');
  await ctx.close();
  // zero/neutral rate: no paid awake waged worker, no income
  { const { ctx, p } = await open({ width: 375, patch: { customers: [], basket: 0, nextCustomerInS: 9999, workers: { hawker: { energy: 100, cdS: 0 } } } }); await p.waitForTimeout(3000);
    const z = await p.evaluate(() => { const e = document.querySelector('#rate'); return { text: e.textContent, sign: e.dataset.sign, color: getComputedStyle(e).color }; });
    ok('S2-8 neutral rate "$0.00/s": no ▼, no minus, not red', z.text === '$0.00/s' && z.sign === 'zero' && z.color !== 'rgb(184, 59, 55)', z); await S(p, 's2-8-zero-rate-375'); await ctx.close(); }
  // hire cards at 360: F1 (per-minute) and F19 (per-second), one line, no wrap
  for (const F of [1, 3, 19]) { const { ctx, p } = await open({ width: 360, patch: { farmLevel: F, coinsCents: 1e12, workers: { hawker: { energy: 100, cdS: 0 } } } }); await p.waitForTimeout(500);
    await p.locator('[data-nav=upgrades]').click(); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(500);
    const h = await p.evaluate(() => [...document.querySelectorAll('.wage')].map(e => { const tops = new Set(); for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const r = document.createRange(); r.selectNodeContents(n); for (const x of r.getClientRects()) if (x.width > 1) tops.add(Math.round(x.top)); } /* text only (coin icon excluded) */ const cs = getComputedStyle(e);
      return { t: e.textContent.trim(), lines: tops.size, ws: cs.whiteSpace, over: e.scrollWidth > e.clientWidth + 1, h: e.getBoundingClientRect().height }; }));
    ok(`S2-8 360px F${F} hire-card wage on one line, no wrap/overflow, unit per threshold`, h.length >= 1 && h.every(x => x.lines === 1 && !x.over && x.ws === 'nowrap' && /^Wage \$\d+\.\d\d\/min$|^Wage \$[\d.]+[KM]?\/s$/.test(x.t)), h);
    await S(p, `s2-8-hire-360-F${F}`); await ctx.close(); }
  { const ctx = null; }
  ok('S2-8 no page errors', !errs.length, errs); });
await done();
