// QA L18-25 / AC7 L@30 under HoP 23:15. Does NOT edit f1-pacing.ts.
// vite-node ac7-l18-25-gate.ts <clone>
const R = process.argv[2];
if (!R) { console.error('usage: vite-node ac7-l18-25-gate.ts <clone>'); process.exit(2); }
const { runM2 } = await import(R + '/tests/bot-m2.ts');
const { balance: b } = await import(R + '/src/config/balance.ts');
const N = +(process.env.SEEDS ?? 30);
if (N < 30) { console.error('need >=30 seeds'); process.exit(2); }
const need = Math.ceil(0.95 * N);
const p95 = (a: number[]) => [...a].sort((x, y) => x - y)[need - 1];
const p05 = (a: number[]) => [...a].sort((x, y) => x - y)[N - need];
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const SEEDS = Array.from({ length: N }, (_, i) => i + 1);
const t0 = Date.now();
const rs = SEEDS.map(sd => runM2(b, sd, { model: 'seller15', use: [], T: 6 * 3600 }));
const at30 = rs.map(r => Math.max(...[...r.reach.entries()].filter(([, t]) => t <= 1800).map(([L]) => L)));
const steps = rs.map(r => (r.maxStep(18, 25) ?? Infinity) / 60);
const med30 = med(at30), p95hi = p95(at30), p95lo = p05(at30);
const medStep = med(steps), p95Step = p95(steps), worstStep = Math.max(...steps);
const old_l = med30 >= 18 && med30 <= 22;
const old_s = medStep <= 6;
const new_l = p95lo >= 18 && p95hi <= 22;
const new_s = p95Step <= 6 && worstStep <= 8;
console.log(`QA ac7-l18-25-gate | clone=${R} | seeds=${N} | need=${need}`);
console.log(`${new_l ? 'PASS' : 'FAIL'} L@30 P95-low=${p95lo} P95-high=${p95hi} median=${med30} in L18-22; OLD=${old_l ? 'PASS' : 'FAIL'} (median only)`);
console.log(`${new_s ? 'PASS' : 'FAIL'} L18-25 step min: P95=${p95Step.toFixed(2)} (<=6) worst=${worstStep.toFixed(2)} (<=8) median=${medStep.toFixed(2)}; OLD=${old_s ? 'PASS' : 'FAIL'} (median<=6)`);
console.log(`OLD_RESULT: ${old_l && old_s ? 'PASS' : 'FAIL'}`);
console.log(`NEW_RESULT: ${new_l && new_s ? 'PASS' : 'FAIL'}`);
console.log(`runtime ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('RESULT:', new_l && new_s ? 'PASS' : 'FAIL');
process.exit(new_l && new_s ? 0 : 1);
