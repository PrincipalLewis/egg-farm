// F1 Market Hand min wait in the browser (QA build): held with no wage while all customers < min wait; serves + paid once one reaches it.
import { setup } from '../s2-lib.mjs';
const { ok, open, done } = await setup('mh-min-wait');
const { ctx, p } = await open({ patch: { farmLevel: 12, coinsCents: 1e7, basket: 2000, coop: 0, nextCustomerInS: 1e9, customers: [0, 1, 2].map(i => ({ id: 800 + i, demand: 20, filled: 0, waitedS: 0 })), workers: { market_hand: { energy: 100, cdS: 0 } } } });
const r = await p.evaluate(async () => { const g = window.eggfarm; const ev = []; g.on(e => ev.push([performance.now(), e])); 
  g.state = { ...g.state, customers: g.state.customers.map(c => ({ ...c, waitedS: 0 })) }; const t0 = performance.now();
  await new Promise(r => setTimeout(r, 1700)); const maxW = Math.max(...g.state.customers.map(c => c.waitedS));
  const hold = ev.filter(([t]) => t - t0 < 1700).map(x => x[1]); await new Promise(r => setTimeout(r, 2500)); const all = ev.map(x => x[1]);
  const w = a => a.filter(e => e.type === 'wage' && e.worker === 'market_hand').reduce((s, e) => s + e.cents, 0), sl = a => a.filter(e => e.type === 'sell' && e.by === 'market_hand').length;
  return { maxW, holdWage: w(hold), holdSales: sl(hold), wage: w(all), sales: sl(all) }; });
ok('MH holds with no wage while all customers waited < 2 s', r.maxW < 2 && r.holdWage === 0 && r.holdSales === 0, r);
ok('MH serves and is paid once a customer reaches 2 s', r.sales > 0 && r.wage > 0, r);
await ctx.close(); await done();
