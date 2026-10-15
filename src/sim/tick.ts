import type { Balance } from '../config/balance';
import { GameState, eggsPerSec, coopCapacity, customerIntervalS, demandRange, nextRand, queueMax, patienceS } from './state';
import type { Sink } from './events';
/** Pure: advance sim by dt seconds. Optional `ev` collects events. */
export function step(s: GameState, dt: number, b: Balance, ev?: Sink): GameState {
  const L = s.farmLevel;
  const coop = Math.min(coopCapacity(L, b), s.coop + eggsPerSec(L, b) * dt);
  // MK-10: every customer not fully served leaves customer_patience_s after arrival, including partly served ones
  // (timer never reset). Partly served leaver => customer_partial event, never-served => customer_lost.
  const customers = [];
  for (const c0 of s.customers) {
    const c = { ...c0, waitedS: c0.waitedS + dt };
    if (c.waitedS >= patienceS(L, b) - 1e-9) ev?.push(c.filled > 0
      ? { type: 'customer_partial', id: c.id, N: c.demand, filled: c.filled } // bought >= 1 egg, then timed out
      : { type: 'customer_lost', reason: 'timeout', id: c.id, N: c.demand });
    else customers.push(c);
  }
  let { nextCustomerInS, nextCustomerId, rng } = s;
  nextCustomerInS -= dt;
  while (nextCustomerInS <= 1e-9) {
    nextCustomerInS += customerIntervalS(L, b); // interval for farm level at timer restart (MK-2)
    if (customers.length < queueMax(L, b)) { // F8: grows with farm level
      const [lo, hi] = demandRange(L, b); let r: number; [rng, r] = nextRand(rng);
      const c = { id: nextCustomerId++, demand: lo + Math.floor(r * (hi - lo + 1)), filled: 0, waitedS: 0 };
      customers.push(c); ev?.push({ type: 'customer_arrive', id: c.id, N: c.demand });
    } else ev?.push({ type: 'customer_lost', reason: 'full_queue' }); // lost, no backlog
  }
  return { ...s, coop, customers, nextCustomerInS, nextCustomerId, rng };
}
/** Fixed-timestep accumulator: runs whole 1/tickHz ticks, returns leftover ms. */
export function advance(s: GameState, elapsedMs: number, accMs: number, b: Balance, ev?: Sink) {
  const dtMs = 1000 / b.tickHz;
  let acc = accMs + elapsedMs, ticks = 0;
  while (acc >= dtMs - 1e-9) { s = step(s, dtMs / 1000, b, ev); acc -= dtMs; ticks++; }
  return { state: s, accMs: Math.max(0, acc), ticks };
}
