// MK-20: same seed + inputs -> identical sim. Run with vite-node from a worktree root; prints a hash of the trajectory.
import { balance as b } from './src/config/balance';
import { initialState } from './src/sim/state';
import { advance } from './src/sim/tick';
import { apply } from './src/sim/actions';
import { createHash } from 'node:crypto';
const out: any = {};
for (const [name, workers] of [['mh', { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } }], ['none', {}]] as const)
 for (const seed of [1, 7, 42]) {
  let s: any = { ...initialState(b, seed), farmLevel: 12, collectionLevel: 9, coinsCents: 1e6, basket: 1500, workers };
  const h = createHash('sha1'); let evs = 0;
  for (let i = 0; i < 6000; i++) { const ev: any[] = []; s = advance(s, 100, 0, b, ev).state; if (i % 50 === 0) s = apply(s, { type: 'sellAll' } as any, b, ev); if (i % 37 === 0) s = apply(s, { type: 'collect' } as any, b, ev);
    evs += ev.length; h.update(JSON.stringify(ev)); }
  h.update(JSON.stringify({ c: s.coinsCents, b: s.basket, cu: s.customers, r: s.rng }));
  out[`${name}-s${seed}`] = { hash: h.digest('hex').slice(0, 12), coins: s.coinsCents, events: evs };
 }
console.log(JSON.stringify(out));
