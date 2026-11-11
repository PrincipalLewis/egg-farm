#!/usr/bin/env node
// QA L18-25 / AC7 L@30 gate under HoP 23:15 (does NOT edit f1-pacing.ts — Engineering-owned per task).
// P95(steps L18-25) <= 6 min AND worst-seed <= 8 min; L@30 P95-low and P95-high both in L18-22.
// Usage: node ac7-l18-25-gate.mjs <clone>   SEEDS default 30.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const R = process.argv[2];
if (!R) { console.error('usage: node ac7-l18-25-gate.mjs <clone>'); process.exit(2); }
const { runM2 } = await import(R + '/tests/bot-m2.ts');
const { balance: b } = await import(R + '/src/config/balance.ts');
const N = +(process.env.SEEDS ?? 30);
if (N < 30) { console.error('need >=30 seeds'); process.exit(2); }
const need = Math.ceil(0.95 * N);
const p95 = (a) => [...a].sort((x, y) => x - y)[need - 1];
const p05 = (a) => [...a].sort((x, y) => x - y)[N - need]; // symmetric lower: ceil(0.95N) seeds at or above
const med = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const SEEDS = Array.from({ length: N }, (_, i) => i + 1);
const t0 = Date.now();
const rs = SEEDS.map(sd => runM2(b, sd, { model: 'seller15', use: [], T: 6 * 3600 }));
const at30 = rs.map(r => Math.max(...[...r.reach.entries()].filter(([, t]) => t <= 1800).map(([L]) => L)));
const steps = rs.map(r => (r.maxStep(18, 25) ?? Infinity) / 60);
const med30 = med(at30), p95hi = p95(at30), p95lo = p05(at30);
const medStep = med(steps), p95Step = p95(steps), worstStep = Math.max(...steps);
// OLD f1-pacing: median L@30 in 18-22; median step <= 6
const old_l = med30 >= 18 && med30 <= 22;
const old_s = medStep <= 6;
// NEW: P95-low and P95-high in band; P95 step <=6 and worst <=8
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
