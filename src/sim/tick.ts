import type { Balance } from '../config/balance';
import { GameState, eggsPerSec, coopCapacity, customerIntervalS, demandRange, nextRand } from './state';
import type { Sink } from './events';
/** Pure: advance sim by dt seconds. Optional `ev` collects events. */
export function step(s: GameState, dt: number, b: Balance, ev?: Sink): GameState {
  const L = s.farmLevel, C = b.customers;
  const coop = Math.min(coopCapacity(L, b), s.coop + eggsPerSec(L, b) * dt);
  // Patience: unserved customers leave after customer_patience_s. Served (filled>0) customers stay until filled
  // when served_customer_ignores_patience=1 (Product rule 2026-10-15; see sim-rules.md re MK-10).
  let customers = [];
  for (const c0 of s.customers) {
    const c = { ...c0, waitedS: c0.waitedS + dt };
    const exempt = c.filled > 0 && C.served_customer_ignores_patience === 1;
    if (!exempt && c.waitedS >= C.customer_patience_s - 1e-9) ev?.push({ type: 'customer_lost', reason: 'timeout', id: c.id, N: c.demand, filled: c.filled });
    else customers.push(c);
  }
  let { nextCustomerInS, nextCustomerId, rng } = s;
  nextCustomerInS -= dt;
  while (nextCustomerInS <= 1e-9) {
    nextCustomerInS += customerIntervalS(L, b); // interval for farm level at timer restart (MK-2)
    if (customers.length < C.queue_max) {
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
