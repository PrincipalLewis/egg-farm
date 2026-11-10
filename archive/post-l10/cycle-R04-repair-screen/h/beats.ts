import { run } from './econ-v2';
import { quantile } from './tests/pacing-guards';
const rs = Array.from({ length: 100 }, (_, i) => run(i + 1, { tap: 'ac7', T: 4000, mech: { kind: 'none' } }));
const o: any = {};
for (const L of [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]) { const a = rs.map(r => (r.reach.get(L) ?? Infinity) / 60); o[L] = [quantile(a, .5), quantile(a, .95)].map(x => +x.toFixed(2)); }
// spend by kind F10-F18 and total earnings to F30
const sp: any = {}; console.log(JSON.stringify({ reach: o, buysPerSeedF10to18: quantile(rs.map(r => r.buys.filter(b => b.f >= 10 && b.f < 18).length), .5), earnTo30: quantile(rs.map(r => r.baseCents / 100), .5) }));
