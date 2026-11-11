// QA: rc1-ui stub (s2-economy-ui.ts) vs s2-money ui.rates() (rates.ts @9c3d47b) + rateView/fmtExactRate matrix. vite-node <this> <rc1ui-wt> <s2money-wt>
const [A, B] = process.argv.slice(2);
const ui = await import(A + '/src/ui/s2-economy-ui.ts'), bA = (await import(A + '/src/config/balance.ts')).balance;
const rt = await import(B + '/src/ui/rates.ts'), bB = (await import(B + '/src/config/balance.ts')).balance;
const out: any[] = []; let fail = 0; const ok = (n: string, p: boolean, i?: any) => { if (!p) fail++; out.push(`${p ? 'PASS' : 'FAIL'} ${n}${i !== undefined ? ' — ' + JSON.stringify(i) : ''}`); };
for (const id of ['market_hand', 'coop_hand'] as const) for (const F of [1, 2, 3, 5, 10, 19, 20, 30]) for (const energy of [100, 30, 0]) for (const unpaid of [false, true]) {
  const s: any = { farmLevel: F, customers: [], workers: { [id]: { energy, cdS: 0, unpaid } } };
  const stubW = (!unpaid && energy > 0) ? ui.wagePerSecCents(id, F, bA) : 0, realW = rt.wageCentsPerSec(id, s, bB), listed = rt.listedWageCentsPerSec(id, s, bB);
  const stubNet = ui.netRateCents(0, s, bA), realNet = rt.netCentsPerSec(0, s, bB);
  ok(`${id} F${F} e${energy}${unpaid ? ' unpaid' : ''}: stub net == rates() net`, Math.abs(stubNet - realNet) < 1e-9, { stubNet, realNet });
  if (energy === 100 && !unpaid) ok(`${id} F${F}: listed wage stub == rates() listed`, Math.abs(ui.wagePerSecCents(id, F, bA) - listed) < 1e-9, { stub: ui.wagePerSecCents(id, F, bA), listed });
}
// display matrix (cents/s in)
const rv: [number, string, string][] = [[-0.4, '$0.00/s', 'zero'], [0.4, '$0.00/s', 'zero'], [-0.49, '$0.00/s', 'zero'], [0, '$0.00/s', 'zero'], [-0.5, '\u2212$0.01/s', 'neg'], [-7, '\u2212$0.07/s', 'neg'], [-1.25, '\u2212$0.01/s', 'neg'],
  [3, '+$0.03/s', 'pos'], [120, '+$1.20/s', 'pos'], [12345, '+$123.45/s', 'pos'], [99999, '+$999.99/s', 'pos'], [99999.6, '+$1K/s?', 'pos'], [100000, '+$1.0K/s', 'pos'], [120000, '+$1.2K/s', 'pos'], [-150000, '\u2212$1.5K/s', 'neg'], [3.4e8, '+$3.4M/s', 'pos']];
for (const [c, t, sg] of rv) { const v = ui.rateView(c); if (t.endsWith('?')) { ok(`rateView(${c}) at the $1K boundary uses short form`, /K\/s$/.test(v.text), v); continue; }
  ok(`rateView(${c}c/s) -> "${t}" ${sg}`, v.text === t && v.sign === sg && !v.text.includes('-'), v); }
const wv: [number, string][] = [[0.0125 * 100 / 1, ''], [1.25, '$0.75/min'], [5, '$3.00/min'], [9.99, '$5.99/min'], [10, '$0.10/s'], [50, '$0.50/s'], [125, '$1.3/s']];
for (const [c, t] of wv) if (t) ok(`fmtExactRate(${c}c/s) -> ${t}`, ui.fmtExactRate(c) === t, ui.fmtExactRate(c));
console.log(out.filter(l => l.startsWith('FAIL') || !l.includes('==')).join('\n')); console.log(`parity+format: ${out.length - fail}/${out.length} pass (${out.filter(l => l.includes('==')).length} parity rows)`);
