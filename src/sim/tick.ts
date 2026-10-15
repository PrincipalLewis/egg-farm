import type { Balance } from '../config/balance';
import { GameState, eggsPerSec, eggsPerTap, coopCapacity, customerIntervalS, demandRange, nextRand, queueMax, patienceS } from './state';
import type { Sink } from './events';
import { sellTo } from './actions';
import { Workers, WORKERS, mood, hawkerDemandMult, wageCents } from './workers';
/** Pure: advance sim by dt seconds. Optional `ev` collects events.
 *  Order within a tick: worker energy -> coop fill -> timeouts -> arrivals -> Coop Hand -> Market Hand.
 *  AC3: timeouts are processed BEFORE arrivals, so a customer leaving on the same tick frees a queue slot for a new one. */
export function step(s: GameState, dt: number, b: Balance, ev?: Sink): GameState {
  const L = s.farmLevel, E = b.workers.energy;
  // Energy: Working and Tired workers drain 1% per drain_s_per_pct; Asleep stays at 0 until managed.
  let workers: Workers = s.workers;
  if (Object.keys(workers).length) {
    workers = {};
    for (const id of WORKERS) {
      const w0 = s.workers[id]; if (!w0) continue;
      const before = mood(w0, b), w = { ...w0, energy: before === 'asleep' ? 0 : Math.max(0, w0.energy - dt / E.drain_s_per_pct) };
      const after = mood(w, b); if (after !== before) ev?.push({ type: 'worker_state', worker: id, state: after! });
      workers[id] = w;
    }
  }
  const cap = coopCapacity(L, b), coop = Math.min(cap, s.coop + eggsPerSec(L, b) * dt);
  const coopFullS = coop >= cap - 1e-9 ? s.coopFullS + dt : 0;
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
  const dm = hawkerDemandMult(workers, b);
  while (nextCustomerInS <= 1e-9) {
    nextCustomerInS += customerIntervalS(L, b); // interval for farm level at timer restart (MK-2)
    if (customers.length < queueMax(L, b)) { // F8: grows with farm level; cap stays 5 in M2 (no Hawker slot)
      const [lo, hi] = demandRange(L, b); let r: number; [rng, r] = nextRand(rng);
      const raw = lo + Math.floor(r * (hi - lo + 1));
      const c = { id: nextCustomerId++, demand: dm === 1 ? raw : Math.max(1, Math.round(raw * dm)), filled: 0, waitedS: 0 };
      customers.push(c); ev?.push({ type: 'customer_arrive', id: c.id, N: c.demand });
    } else ev?.push({ type: 'customer_lost', reason: 'full_queue' }); // lost, no backlog
  }
  let out: GameState = { ...s, coop, coopFullS, customers, nextCustomerInS, nextCustomerId, rng, workers, manageCdS: Math.max(0, s.manageCdS - dt) };
  if (workers.coop_hand || workers.market_hand) out = workerActions(out, dt, b, ev);
  return out;
}
/** Coop Hand: collects eggs_per_tap every every_s (tired_every_s when Tired). Market Hand: serves the queue
 *  (front first, like Sell all) every every_s / tired_every_s. Wage is charged per action interval. Asleep = nothing, no wage. */
function workerActions(s: GameState, dt: number, b: Balance, ev?: Sink): GameState {
  const ws = { ...s.workers };
  for (const id of ['coop_hand', 'market_hand'] as const) {
    const w = ws[id]; if (!w) continue;
    const m = mood(w, b); if (m === 'asleep') continue;
    let cdS = w.cdS - dt;
    if (cdS <= 1e-9) {
      const cfg = b.workers[id], interval = m === 'working' ? cfg.every_s : cfg.tired_every_s;
      cdS = interval;
      const wage = wageCents(id, s.farmLevel, interval, s.coinsCents, b);
      if (wage > 0) { s = { ...s, coinsCents: s.coinsCents - wage }; ev?.push({ type: 'wage', worker: id, cents: wage }); }
      if (id === 'coop_hand') {
        const n = Math.min(Math.floor(s.coop), eggsPerTap(s.collectionLevel, b));
        if (n > 0) { s = { ...s, coop: s.coop - n, basket: s.basket + n }; ev?.push({ type: 'worker_collect', eggs: n }); }
      } else for (const c of s.customers) { if (s.basket < 1) break; s = sellTo(s, c.id, b, ev, 'market_hand'); }
    }
    ws[id] = { ...w, cdS };
  }
  return { ...s, workers: { ...ws } };
}
/** Fixed-timestep accumulator: runs whole 1/tickHz ticks, returns leftover ms. */
export function advance(s: GameState, elapsedMs: number, accMs: number, b: Balance, ev?: Sink) {
  const dtMs = 1000 / b.tickHz;
  let acc = accMs + elapsedMs, ticks = 0;
  while (acc >= dtMs - 1e-9) { s = step(s, dtMs / 1000, b, ev); acc -= dtMs; ticks++; }
  return { state: s, accMs: Math.max(0, acc), ticks };
}
