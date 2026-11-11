// Art & UX checks: (1) net-rate pill codepoints at 390 incl. pseudo-elements + 4x crop; (2) docked Refill pill at 960 rect, normal + cooldown.
import { setup } from './s2-lib.mjs';
const { ENGINE, OUT, ok, open, done } = await setup('artux-pill-960');
{ const { ctx, p } = await open({ width: 390, height: 844, dsf: 4, patch: { farmLevel: 2, customers: [], basket: 0, nextCustomerInS: 9999, workers: { market_hand: { energy: 100, cdS: 0 } } } });
  await p.waitForTimeout(3500);
  const r = await p.evaluate(() => { const e = document.querySelector('#rate'), cp = t => [...t].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
    const els = [e, ...e.querySelectorAll('*')], pseudo = [];
    for (const el of els) for (const ps of ['::before', '::after']) { const c = getComputedStyle(el, ps).content; if (c && c !== 'none' && c !== 'normal' && c !== '""') pseudo.push({ el: el.id || el.className, ps, content: c }); }
    for (const ps of ['::before', '::after']) { const pe = e.parentElement; const c = getComputedStyle(pe, ps).content; if (c && c !== 'none' && c !== 'normal' && c !== '""') pseudo.push({ el: 'parent ' + pe.className, ps, content: c }); }
    const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT), nodes = []; let n; while ((n = tw.nextNode())) nodes.push({ text: n.textContent, cps: cp(n.textContent) });
    const all = e.textContent; return { nodes, pseudo, all, cps: cp(all), sign: e.dataset.sign, color: getComputedStyle(e).color }; });
  const exp = ['U+25BC', 'U+2212', 'U+0024', 'U+0030', 'U+002E', 'U+0030', 'U+0031', 'U+002F', 'U+0073'];
  const bad = r.cps.filter(c => ['U+002D', 'U+2013', 'U+2014', 'U+2012', 'U+FE63', 'U+FF0D'].includes(c)).length + r.cps.filter(c => c === 'U+2212').length - 1;
  ok('ArtUX-1 390 net rate text is exactly ▼ U+2212 $0.01/s; no hyphen/en-dash/2nd minus; no pseudo-element content', JSON.stringify(r.cps) === JSON.stringify(exp) && bad === 0 && r.pseudo.length === 0, r);
  const bb = await p.locator('.pill.coins').boundingBox(); await p.screenshot({ path: `${OUT}/artux1-rate-crop-4x-390-${ENGINE}.png`, clip: { x: bb.x - 4, y: bb.y - 4, width: bb.width + 8, height: bb.height + 8 } });
  await ctx.close(); }
const tired = { market_hand: { energy: 20, cdS: 0 }, coop_hand: { energy: 30, cdS: 0 }, hawker: { energy: 100, cdS: 0 }, grader: { energy: 100, cdS: 0 } };
{ const { ctx, p } = await open({ width: 960, height: 800, patch: { workers: tired, manageCdS: 0 } }); await p.waitForTimeout(800);
  await p.locator('[data-nav=upgrades]').click().catch(() => {}); await p.waitForTimeout(500);
  const meas = () => p.evaluate(() => { const e = [...document.querySelectorAll('.desk-manage-all')].find(x => x.getBoundingClientRect().height > 0); if (!e) return null; const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { t: e.innerText.trim().replace(/\s+/g, ' '), x: b.x, y: b.y, w: b.width, h: b.height, pad: cs.padding, minH: cs.minHeight, border: cs.borderTopWidth, dis: e.getAttribute('aria-disabled'), boxSizing: cs.boxSizing }; });
  const a = await meas(); ok('ArtUX-2 960 docked Refill pill normal >= 44px tall (getBoundingClientRect)', a && a.h >= 44, a);
  if (a) await p.screenshot({ path: `${OUT}/artux2-pill-normal-960-${ENGINE}.png`, clip: { x: a.x - 6, y: a.y - 6, width: a.w + 12, height: a.h + 12 } });
  await p.evaluate(() => window.eggfarm.dispatch({ type: 'manageAll' })); await p.waitForTimeout(1200);
  const c = await meas(); ok('ArtUX-2 960 docked Refill pill cooldown >= 44px tall', c && c.h >= 44 && c.dis === 'true', c);
  if (c) await p.screenshot({ path: `${OUT}/artux2-pill-cooldown-960-${ENGINE}.png`, clip: { x: c.x - 6, y: c.y - 6, width: c.w + 12, height: c.h + 12 } });
  await ctx.close(); }
await done();
