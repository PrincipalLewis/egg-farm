// vite-node mh-min-wait.ts <clone>: F1 market_hand_min_wait_s (Head of Product option (b), f1-proposal §5):
// a Market Hand turn is held with NO wage while every customer has waited < min wait; once one reaches it, MH serves and is paid.
const R = process.argv[2]; const { balance: b } = await import(R + '/src/config/balance.ts'); const { initialState } = await import(R + '/src/sim/state.ts'); const { step } = await import(R + '/src/sim/tick.ts');
const find = (o: any, d = 0): any => { if (!o || typeof o !== 'object' || d > 4) return undefined; for (const [k, v] of Object.entries(o)) { if (/min_?wait/i.test(k) && typeof v === 'number') return [k, v]; const r = find(v, d + 1); if (r) return r; } };
const kv = find(b); if (!kv) { console.log('N/A (no market_hand_min_wait_s in balance at this SHA)'); process.exit(0); }
let n = 0, f = 0; const ok = (t: string, p: boolean, i?: any) => { n++; if (!p) f++; console.log(`${p ? 'PASS' : 'FAIL'} ${t} — ${JSON.stringify(i)}`); };
const W = kv[1]; ok(`balance ${kv[0]} = 2`, W === 2, kv);
const dt = 1 / b.tickHz;
for (const F of [10, 14, 18]) {
  let s: any = { ...initialState(b, 7), farmLevel: F, collectionLevel: F, coinsCents: 1e7, basket: 2000, coop: 0, nextCustomerInS: 1e9,
    customers: [0, 1, 2].map(i => ({ id: 800 + i, demand: 20, filled: 0, waitedS: 0 })), workers: { market_hand: { energy: 100, cdS: 0 } } };
  const run = (secs: number) => { const ev: any[] = []; for (let i = 0; i < Math.round(secs / dt); i++) { s = step(s, dt, b, ev); if (s.workers.market_hand) s.workers.market_hand.energy = 100; } return ev; };
  const hold = run(W - 0.25), maxWait = Math.max(...s.customers.map((c: any) => c.waitedS));
  const wH = hold.filter(e => e.type === 'wage' && e.worker === 'market_hand').reduce((a, e) => a + e.cents, 0), sH = hold.filter(e => e.type === 'sell' && e.by === 'market_hand').length;
  ok(`F${F}: all customers < ${W}s (max ${maxWait.toFixed(2)}s): MH holds, no sale, no wage`, maxWait < W && sH === 0 && wH === 0, { sales: sH, wageCents: wH });
  const go = run(W + 1.5); const wG = go.filter(e => e.type === 'wage' && e.worker === 'market_hand').reduce((a, e) => a + e.cents, 0), sG = go.filter(e => e.type === 'sell' && e.by === 'market_hand');
  const first = go.findIndex(e => e.type === 'sell' && e.by === 'market_hand');
  ok(`F${F}: once a customer reaches ${W}s MH serves and is paid`, sG.length > 0 && wG > 0, { sales: sG.length, wageCents: wG, firstSellEventIdx: first });
}
console.log(`SUMMARY ${n - f}/${n}`); process.exit(f ? 1 : 0);
