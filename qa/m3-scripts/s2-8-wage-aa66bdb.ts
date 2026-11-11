// QA aa66bdb: wage label code-level. vite-node <this> <rc1ui-wt> <s2money-wt>
import { readFileSync } from 'node:fs';
const [A, B] = process.argv.slice(2);
const ui = await import(A + '/src/ui/s2-economy-ui.ts'); const b = (await import(A + '/src/config/balance.ts')).balance;
const rt = await import(B + '/src/ui/rates.ts'); const bB = (await import(B + '/src/config/balance.ts')).balance;
let fail = 0, n = 0; const ok = (t: string, p: boolean, i?: any) => { n++; if (!p) fail++; console.log(`${p ? 'PASS' : 'FAIL'} ${t}${i !== undefined ? ' — ' + JSON.stringify(i) : ''}`); };
const L = (dps: number) => 'Wage ' + ui.fmtExactRate(dps * 100);
for (const [d, want] of [[0.0999, 'Wage $5.99/min'], [0.099999, 'Wage $6.00/min'], [0.1, 'Wage $0.10/s'], [0.5, 'Wage $0.50/s'], [1.25, 'Wage $1.25/s'], [12.34, 'Wage $12.34/s'], [999.99, 'Wage $999.99/s'], [999.994, 'Wage $999.99/s'], [999.996, 'Wage $1.0K/s'], [1000, 'Wage $1.0K/s'], [1200, 'Wage $1.2K/s'], [0.0125, 'Wage $0.75/min'], [0.001, 'Wage $0.06/min']] as [number, string][])
  ok(`boundary $${d}/s -> ${want}`, L(d) === want, L(d));
ok('/min form has two decimals', /^\$\d+\.\d\d\/min$/.test(ui.fmtExactRate(5)));
// exact economy.csv rate per Farm level vs label vs ui.rates() helpers
const csv = readFileSync(A + '/data/economy.csv', 'utf8').trim().split(/\r?\n/).map(l => l.split(',')); const h = csv[0];
const ci = (k: string) => h.indexOf(k);
let rows = 0, bad: any[] = [];
for (const r of csv.slice(1)) { const F = +r[ci('level')]; if (!F) continue;
  for (const [id, col] of [['market_hand', 'w1_wage_per_min'], ['coop_hand', 'w2_wage_per_min']] as const) { const perMin = +r[ci(col)]; if (!perMin) continue; rows++;
    const csvCps = perMin * 100 / 60, stub = ui.wagePerSecCents(id, F, b);
    const rmA = rt.listedWageCentsPerSec ? rt.listedWageCentsPerSec(id, { farmLevel: F } as any, bB) : NaN;
    const lab = ui.fmtExactRate(stub), labCsv = ui.fmtExactRate(csvCps), labRt = ui.fmtExactRate(rmA);
    if (Math.abs(stub - csvCps) > 1e-9 || lab !== labCsv || lab !== labRt) bad.push({ F, id, perMin, csvCps, stub, rmA, lab, labCsv, labRt }); } }
ok(`label == fmt(exact economy.csv rate) == fmt(s2-money listedWageCentsPerSec) for all ${rows} (F, worker) rows`, rows > 0 && bad.length === 0, bad.slice(0, 5));
console.log(`SUMMARY ${n - fail}/${n}`);
