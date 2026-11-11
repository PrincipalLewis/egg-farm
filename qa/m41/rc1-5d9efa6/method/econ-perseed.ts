// QA per-seed economy dump (acw1 casual t10/t18 seeds 1-299; D-CEO-04 L10 nw/w seeds 1-300; AC7 workers L@30 + L18-25 maxStep seeds 1-100).
// vite-node econ-perseed.ts <worktree> <out.json>   Mirrors tests/pacing-acw1.test.ts, tests/ac7-dceo-04.slow.test.ts, qa/m3-scripts/ac7-l18-25-gate-workers.ts.
import { writeFileSync } from 'node:fs';
const [W, OUT] = [process.argv[2], process.argv[3]];
const { runM2 } = await import(W + '/tests/bot-m2.ts');
const { runBot } = await import(W + '/tests/bot.ts');
const { VAR_DEFAULT } = await import(W + '/tests/seller-variance.ts');
const { balance } = await import(W + '/src/config/balance.ts');
const casual = { ...balance, sim_test: { poisson_arrivals: true, demand_scale: 0.75 } };
const g = (r: any, L: number) => (r instanceof Map ? r.get(L) : r[L]) ?? null;
const out: any = { acw1: {}, l10: {}, ac7: {} };
for (let s = 1; s <= 299; s++) { const r = runM2(casual, s, { model: 'seller15', sellEvery: 20 }); out.acw1[s] = { t10: g(r.reach, 10), t18: g(r.reach, 18) }; }
for (let s = 1; s <= 300; s++) { const a = runBot(balance, s, 'seller15', 3600, 15, VAR_DEFAULT).reach, c = runM2(balance, s, { model: 'seller15', T: 7200, variance: VAR_DEFAULT }).reach;
  out.l10[s] = { nw: g(a, 10), w: g(c, 10) }; }
for (let s = 1; s <= 100; s++) { const r = runM2(balance, s, { model: 'seller15', T: 6 * 3600 });
  out.ac7[s] = { at30: Math.max(...[...r.reach.entries()].filter(([, t]: any) => t <= 1800).map(([L]: any) => L)), step18_25: r.maxStep(18, 25) }; }
writeFileSync(OUT, JSON.stringify(out)); console.log('ECON_PERSEED_DONE', OUT);
