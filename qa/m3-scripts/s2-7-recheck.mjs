// S2-7 re-check list (session 2). PORT=.. ENGINE=chromium|webkit HEADED=1 OUT=.. node s2-7-recheck.mjs <worktree>
import { setup, st } from './s2-lib.mjs';
const { ok, open, done, OUT, ENGINE } = await setup('s2-7');
const W = [375, 390];
const rect = (p, s) => p.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed').map(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, cls: e.className, t: e.textContent.trim().slice(0, 20) }; }), s);
const inter = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
// 1. Toast at Farm L5 not hidden behind sheet
{ const { ctx, p } = await open({ patch: { farmLevel: 4, celebratedTier: 0, coinsCents: 1e9 } });
  await p.click('[data-nav=upgrades]'); await p.waitForTimeout(400); await p.click('[data-tab=farm]'); await p.waitForTimeout(300);
  await p.click('#uRow .btn.buy'); await p.waitForTimeout(450);
  const r = await p.evaluate(() => { const t = document.querySelector('.toast'); const b = t.getBoundingClientRect(); const s = getComputedStyle(t); const hit = document.elementsFromPoint(b.left + b.width / 2, b.top + b.height / 2); const top = hit.find(e => getComputedStyle(e).pointerEvents !== 'none' || e === t); return { show: t.classList.contains('show'), text: t.textContent, vis: s.visibility, op: s.opacity, top: b.top, bot: b.bottom, z: s.zIndex, sheetZ: getComputedStyle(document.getElementById('panel-layer')).zIndex, farm: window.eggfarm.state.farmLevel }; });
  await p.screenshot({ path: `${OUT}/s2-7-1-toast-L5-${ENGINE}.png` });
  ok('S2-7.1 toast visible above sheet at Farm L5', r.farm === 5 && r.show && /Coop upgraded/.test(r.text) && r.vis === 'visible' && +r.z > +r.sheetZ, r); await ctx.close(); }
// 2. chips / sprite / Queue full chip inside queue, no overlap (375 & 390), S2-6
for (const w of W) { const custs = Array.from({ length: 9 }, (_, i) => ({ id: 900 + i, demand: 50, filled: 0, waitedS: 1 }));
  const { ctx, p } = await open({ patch: { farmLevel: 19, customers: custs, nextCustomerInS: 999, basket: 0 }, width: w });
  await p.waitForTimeout(500);
  const q = (await rect(p, '#queue'))[0], chips = await rect(p, '#queue .chip'), tag = await rect(p, '#queue .qtag'), imgs = await rect(p, '#queue .chip img');
  let ov = [], out = [];
  for (let i = 0; i < chips.length; i++) { for (let j = i + 1; j < chips.length; j++) if (inter(chips[i], chips[j]) > 1) ov.push([i, j]); for (const t of tag) if (inter(chips[i], t) > 1) ov.push(['qtag', i, chips[i].t]); }
  for (const e of [...chips, ...imgs, ...tag]) if (e.x < q.x - 1 || e.r > q.r + 1 || e.y < q.y - 1 || e.b > q.b + 1) out.push(e);
  const scW = await p.evaluate(() => document.documentElement.scrollWidth);
  await p.screenshot({ path: `${OUT}/s2-7-2-queue-${w}-${ENGINE}.png` });
  ok(`S2-7.2/S2-6 queue chips, sprite and Queue full tag inside strip, no overlap @${w}px`, tag.length === 1 && !ov.length && !out.length && scW <= w, { tag: tag.length, ov, out: out.slice(0, 4), q, scW }); await ctx.close(); }
// 3. Market X: 12 open/close cycles via real pointer at X centre
{ const { ctx, p } = await open(); let miss = 0, sz;
  for (let i = 0; i < 12; i++) { await p.click('[data-nav=market]'); await p.waitForTimeout(350 + (i % 3) * 100); const x = p.locator('#p-market .close'); const b = await x.boundingBox(); sz = b; await p.mouse.click(b.x + b.width / 2 + (i % 2 ? 15 : -15) * 0, b.y + b.height / 2); await p.waitForTimeout(400); if (!(await p.locator('#p-market').isHidden())) { miss++; await p.keyboard.press('Escape'); } }
  ok('S2-7.3 Market X closes every time (12/12), tap target >=44px', miss === 0 && sz.width >= 44 && sz.height >= 44, { miss, w: sz.width, h: sz.height }); await ctx.close(); }
// 4. Collect label vs ready count; 5. eggs-per-tap. Loosened 2026-10-16: the tap may also pick up eggs laid during the ~150 ms tap, so got is in [min(per, ready), per].
for (const [coop, coll] of [[12.7, 17], [500, 17], [3.2, 0], [40, 0]]) { const { ctx, p } = await open({ patch: { farmLevel: 19, coop, collectionLevel: coll, basket: 0, workers: {} } });
  const per = 5 + 5 * coll; await p.waitForTimeout(200);
  const m = await p.evaluate(() => ({ lbl: document.getElementById('collect').textContent.trim(), coop: window.eggfarm.state.coop, b0: window.eggfarm.state.basket }));
  const ready = Math.floor(m.coop), lbl = m.lbl, want = ready >= per ? `Collect +${per}` : `Collect +${per} · ${ready} ready`;
  const b0 = m.b0; await p.click('#collect'); await p.waitForTimeout(150); const b1 = (await st(p)).basket;
  ok(`S2-7.4 Collect label matches ready count (coop ${coop}, C${coll})`, lbl === want && b1 - b0 >= Math.min(per, ready) && b1 - b0 <= per, { lbl, want, got: b1 - b0, allowed: [Math.min(per, ready), per] }); await ctx.close(); }
for (const C of [0, 10, 17, 25, 30]) { const { ctx, p } = await open({ patch: { farmLevel: 30, coop: 1500, collectionLevel: C, basket: 0, workers: {} } });
  const b0 = (await st(p)).basket; await p.click('#collect'); await p.waitForTimeout(150); const d = (await st(p)).basket - b0;
  ok(`S2-7.5 eggs per tap uncapped at C${C} (expect ${5 + 5 * C})`, d === 5 + 5 * C, { d }); await ctx.close(); }
// 6. Goal-chip ETA keeps updating
{ const { ctx, p } = await open({ patch: { coinsCents: 1000 } }); const seen = [];
  for (let i = 0; i < 12; i++) { seen.push(((await p.textContent('#goal').catch(() => '')) || '').trim()); await p.waitForTimeout(1000); }
  await p.screenshot({ path: `${OUT}/s2-7-6-goal-${ENGINE}.png` });
  const uniq = [...new Set(seen)]; ok('S2-7.6 goal chip ETA/progress not frozen over 12 s', uniq.length >= 3, { uniq: uniq.slice(0, 6) }); await ctx.close(); }
await done();
