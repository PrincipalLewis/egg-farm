// vite-node offline-code.ts <clone>: AC11 offline earnings + clock change at code level (offlineEggs/applyOffline).
const R = process.argv[2]; const o = await import(R + '/src/sim/offline.ts'); const st = await import(R + '/src/sim/state.ts'); const { balance: b } = await import(R + '/src/config/balance.ts');
let n = 0, f = 0; const ok = (t: string, p: boolean, i?: any) => { n++; if (!p) f++; console.log(`${p ? 'PASS' : 'FAIL'} ${t} — ${JSON.stringify(i)}`); };
const cap = b.offline.offlineCapSeconds, mult = b.offline.offlineRateMultiplier, min = b.offline.offlineMinSeconds;
for (const F of [1, 10, 20]) { const eps = st.eggsPerSec(F, b);
  for (const away of [min, 3600, cap, cap * 24]) ok(`F${F} away ${away}s = floor(min(away,cap)*${mult}*eps)`, o.offlineEggs(away, F, b) === Math.floor(Math.min(away, cap) * mult * eps), o.offlineEggs(away, F, b)); }
ok(`capped: 48 h == ${cap / 3600} h grant`, o.offlineEggs(172800, 10, b) === o.offlineEggs(cap, 10, b));
ok(`under ${min}s -> 0`, o.offlineEggs(min - 1, 10, b) === 0);
ok('clock moved back (negative away) -> 0', o.offlineEggs(-3600, 10, b) === 0 && o.applyOffline(st.initialState(b, 1), -3600e3, b).eggs === 0);
ok('NaN/Infinity away -> 0', o.offlineEggs(NaN, 10, b) === 0 && o.offlineEggs(Infinity, 10, b) === 0);
ok('clock jumped forward a year -> still capped', o.applyOffline({ ...st.initialState(b, 1), farmLevel: 10 }, 365 * 864e5, b).eggs === o.offlineEggs(cap, 10, b));
console.log(`SUMMARY ${n - f}/${n}`); process.exit(f ? 1 : 0);
