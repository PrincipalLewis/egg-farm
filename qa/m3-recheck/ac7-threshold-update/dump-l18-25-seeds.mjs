const R = process.argv[2];
const { runM2 } = await import(R + '/tests/bot-m2.ts');
const { balance: b } = await import(R + '/src/config/balance.ts');
const N = 30;
const SEEDS = Array.from({ length: N }, (_, i) => i + 1);
function worstPair(r, from, to) {
  let best = null;
  for (let L = from + 1; L <= to; L++) {
    const a = r.reach.get(L - 1), c = r.reach.get(L);
    if (a == null || c == null) return { missing: true, L };
    const sec = c - a;
    if (!best || sec > best.sec) best = { from: L - 1, to: L, sec, min: sec / 60 };
  }
  return best;
}
const rows = [];
for (const sd of SEEDS) {
  const r = runM2(b, sd, { model: 'seller15', use: [], T: 6 * 3600 });
  const maxSec = r.maxStep(18, 25);
  const wp = worstPair(r, 18, 25);
  rows.push({ seed: sd, maxMin: maxSec == null ? null : maxSec / 60, pair: wp });
}
const need = Math.ceil(0.95 * N);
const steps = rows.map(x => x.maxMin ?? Infinity).sort((a,b)=>a-b);
const p95 = steps[need - 1];
const worst = Math.max(...steps);
const med = (() => { const s=steps, m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; })();
console.log(JSON.stringify({ p95, worst, median: med, need, rows }, null, 2));
