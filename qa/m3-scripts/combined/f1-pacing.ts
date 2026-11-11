// vite-node f1-pacing.ts <clone> [gate|info]: product/f1-proposal.md "QA targets" on the REAL sim (tests/bot-m2 runM2, seller15, no workers, 30 seeds).
// gate = F1 economy merged (bands must hold); info = F1 not merged: prints current-economy numbers vs F1 bands and reports N/A.
const R = process.argv[2], MODE = process.argv[3] ?? 'gate';
const { runM2 } = await import(R + '/tests/bot-m2.ts'); const { balance: b } = await import(R + '/src/config/balance.ts');
const SEEDS = Array.from({ length: +(process.env.SEEDS ?? 30) }, (_, i) => i + 1);
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const t0 = Date.now(); const rs = SEEDS.map(sd => runM2(b, sd, { model: 'seller15', use: [], T: 6 * 3600 }));
let n = 0, f = 0; const lines: string[] = []; const ok = (t: string, p: boolean, i?: any) => { n++; if (!p) f++; lines.push(`${p ? 'PASS' : 'FAIL'} ${t} — ${JSON.stringify(i)}`); };
const reach = (L: number) => med(rs.map(r => r.reach.get(L) ?? Infinity));
const exp: Record<number, [number, number, number]> = { 5: [45, 36, 60], 6: [45, 36, 60], 7: [45, 36, 60], 8: [75, 60, 90], 9: [45, 36, 60], 10: [45, 36, 60], 11: [60, 45, 75], 12: [45, 36, 60], 13: [75, 60, 90], 14: [60, 45, 75] };
for (const [L, [e, lo, hi]] of Object.entries(exp)) { const d = med(rs.map(r => (r.reach.get(+L + 1) ?? Infinity) - (r.reach.get(+L) ?? Infinity))); ok(`time at L${L} ${d.toFixed(1)}s in ${lo}-${hi}s (expected ${e})`, d >= lo && d <= hi, d); }
ok(`reach L10 ${reach(10).toFixed(0)}s in 444-666s`, reach(10) >= 444 && reach(10) <= 666, reach(10));
const inc = [13.19, 17.08, 20.73, 25.57, 29.53, 33.63, 39.72, 44.74, 52.40, 58.25];
inc.forEach((v, i) => { const L = 5 + i; const g = med(rs.map(r => r.incomeAt(L) ?? NaN).filter(x => !isNaN(x))); ok(`income/s at L${L} ${g?.toFixed?.(2)} within ±20% of ${v}`, Math.abs(g - v) <= 0.2 * v, g); });
const at30 = med(rs.map(r => Math.max(...[...r.reach.entries()].filter(([, t]) => t <= 1800).map(([L]) => L))));
ok(`AC7 Farm level at 30:00 = L${at30} in L18-22`, at30 >= 18 && at30 <= 22, at30);
ok(`L30 (no workers) at ${(reach(30) / 60).toFixed(1)} min in 180-300 min`, reach(30) / 60 >= 180 && reach(30) / 60 <= 300, reach(30) / 60);
const steps = rs.map(r => r.maxStep(18, 25) ?? Infinity); ok(`L18-25 worst step ${(med(steps) / 60).toFixed(2)} min <= 6`, med(steps) / 60 <= 6, med(steps) / 60);
lines.forEach(l => console.log(MODE === 'gate' ? l : 'INFO ' + l));
console.log(`runtime ${((Date.now() - t0) / 1000).toFixed(0)}s, ${SEEDS.length} seeds`);
if (MODE !== 'gate') { console.log(`N/A (F1 economy not merged at this SHA; current economy vs F1 bands: ${n - f}/${n} in band)`); process.exit(0); }
console.log(`SUMMARY ${n - f}/${n}`); process.exit(f ? 1 : 0);
