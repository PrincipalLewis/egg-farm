// QA aa66bdb S2-8 wage labels in browser via real formatter (balance wage mutated), 360 hire card one-line. Also RELEASE=1 globals.
import { setup } from './s2-lib.mjs';
const { ENGINE, OUT, ok, open, done } = await setup(process.env.RELEASE ? 'release-globals' : 's2-8-wage');
if (process.env.RELEASE) {
  const { ctx, p } = await open({ width: 375 });
  const r = await p.evaluate(() => { const f = document.createElement('iframe'); f.src = 'about:blank'; document.body.appendChild(f); const base = new Set(Object.getOwnPropertyNames(f.contentWindow)); return Object.getOwnPropertyNames(window).filter(k => !base.has(k)); });
  ok('release: app globals = only eggfarmExportTelemetry', r.length === 1 && r[0] === 'eggfarmExportTelemetry', r); await ctx.close(); await done();
}
const { ctx, p, errs } = await open({ width: 360, patch: { farmLevel: 30, coinsCents: 1e12, workers: { hawker: { energy: 100, cdS: 0 } } } });
await p.locator('[data-nav=upgrades]').click(); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(500);
const meas = id => p.evaluate(id => { const e = document.querySelector(`#uRow div.wk[data-w=${id}] .wage`); if (!e) return null; const t = [...e.childNodes].find(n => n.nodeType === 3); const rg = document.createRange(); rg.selectNodeContents(t);
  const card = e.closest('.wk').getBoundingClientRect(), r = e.getBoundingClientRect(), tr = rg.getBoundingClientRect();
  return { text: e.textContent.trim(), lines: new Set([...rg.getClientRects()].filter(q => q.width > 1).map(q => Math.round(q.top))).size, scrollW: e.scrollWidth, clientW: e.clientWidth, rect: [r.left, r.right, r.width, r.height].map(v => +v.toFixed(1)), textRight: +tr.right.toFixed(1), cardRight: +card.right.toFixed(1), ws: getComputedStyle(e).whiteSpace }; }, id);
const fits = m => !!m && m.lines === 1 && m.scrollW <= m.clientW && m.textRight <= m.rect[1] + 0.5 && m.rect[1] <= m.cardRight + 0.5;
const setW = (id, perFarmPerMin, F) => p.evaluate(([id, w, F]) => { const g = window.eggfarm; g.b.workers[id].wage_per_farm_per_min = w; g.state = { ...g.state, farmLevel: F }; }, [id, perFarmPerMin, F]);
const orig = await p.evaluate(() => ({ mh: window.eggfarm.b.workers.market_hand.wage_per_farm_per_min, ch: window.eggfarm.b.workers.coop_hand.wage_per_farm_per_min }));
// real values from balance
for (const [id, F, want] of [['market_hand', 23, 'Wage $5.75/min'], ['market_hand', 24, 'Wage $0.10/s'], ['coop_hand', 30, 'Wage $0.25/s']]) {
  await setW(id, id === 'market_hand' ? orig.mh : orig.ch, F); await p.waitForTimeout(400); const m = await meas(id);
  ok(`real ${id} F${F} -> "${want}", one line, unclipped at 360`, m && m.text === want && fits(m), m);
  await p.locator(`#uRow div.wk[data-w=${id}]`).screenshot({ path: `${OUT}/wage-real-${id}-F${F}-360-${ENGINE}.png` }); }
// boundaries through the real formatter (exact $/s at F30)
for (const [dps, want] of [[0.0999, 'Wage $5.99/min'], [0.1, 'Wage $0.10/s'], [0.5, 'Wage $0.50/s'], [1.25, 'Wage $1.25/s'], [12.34, 'Wage $12.34/s'], [999.99, 'Wage $999.99/s'], [1000, 'Wage $1.0K/s'], [1200, 'Wage $1.2K/s']]) {
  for (const id of ['market_hand', 'coop_hand']) { await setW(id, dps * 60 / 30, 30); }
  await p.waitForTimeout(400);
  for (const id of ['market_hand', 'coop_hand']) { const m = await meas(id); ok(`boundary $${dps}/s ${id} -> "${want}", one line, unclipped at 360`, m && m.text === want && fits(m), m);
    if (id === 'coop_hand' && [0.0999, 999.99, 1000].includes(dps)) await p.locator(`#uRow div.wk[data-w=${id}]`).screenshot({ path: `${OUT}/wage-${dps}-${id}-360-${ENGINE}.png` }); } }
ok('no page errors', !errs.length, errs); await ctx.close(); await done();
