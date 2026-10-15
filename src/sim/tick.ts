import type { Balance } from '../config/balance';
import { GameState, eggsPerSec, coopCapacity, customerIntervalS, demandRange, nextRand } from './state';
/** Pure: advance sim by dt seconds. */
export function step(s: GameState, dt: number, b: Balance): GameState {
  const L = s.farmLevel;
  const coop = Math.min(coopCapacity(L, b), s.coop + eggsPerSec(L, b) * dt);
  let customers = s.customers.map(c => ({ ...c, waitedS: c.waitedS + dt })).filter(c => c.waitedS < b.customers.patienceS);
  let { nextCustomerInS, nextCustomerId, rng } = s;
  nextCustomerInS -= dt;
  while (nextCustomerInS <= 1e-9) {
    nextCustomerInS += customerIntervalS(L, b);
    if (customers.length < b.customers.maxQueue) {
      const [lo, hi] = demandRange(L, b); let r: number; [rng, r] = nextRand(rng);
      customers = [...customers, { id: nextCustomerId++, demand: lo + Math.floor(r * (hi - lo + 1)), waitedS: 0 }];
    }
  }
  return { ...s, coop, customers, nextCustomerInS, nextCustomerId, rng };
}
/** Fixed-timestep accumulator: runs whole 1/tickHz ticks, returns leftover ms. */
export function advance(s: GameState, elapsedMs: number, accMs: number, b: Balance) {
  const dtMs = 1000 / b.tickHz;
  let acc = accMs + elapsedMs, ticks = 0;
  while (acc >= dtMs) { s = step(s, dtMs / 1000, b); acc -= dtMs; ticks++; }
  return { state: s, accMs: acc, ticks };
}
