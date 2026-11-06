/** AC7 scripted players driving the REAL sim (step/apply), per core-loop-spec AC7. */
import type { Balance } from '../src/config/balance';
import { initialState, GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { SellerVariance, SellerVarianceParams, TRACE } from './seller-variance';
import { pickBuy, pickAction, observe, type Observe } from './bot-m4';
export type Model = 'seller15' | 'cheapest';
export interface BotResult { firstUpgradeS: number | null; upgradesAt: (s: number) => number; farmAt: (s: number) => number; farmReachedS: (L: number) => number | null;
  /** Farm level -> first time reached (s); 0 -> 0. */ reach: Map<number, number> }
/** Buy step: tests/bot-m4.ts pickBuy (D-HOP-2026-10-19-01: + HENS/VALUE with M4 on; flag off = the old Farm/Collection rule).
 *  Track buys log as 't' (they count as upgrades, never as Farm levels). */
export function buy(s: GameState, model: Model, b: Balance, log: (kind: 'c' | 'f' | 't', next: GameState) => void, cheapFirst = false): GameState {
  for (let guard = 0; guard < 100; guard++) {
    const pick = pickBuy(s, b, model, cheapFirst);
    if (pick === 'c' && cheapFirst) cheapFirst = false; // variance p_cheap_first: one affordable Collection, ignoring the 50 % rule
    if (!pick) return s;
    const next = apply(s, pickAction(pick), b); if (next === s) return s; // refused buy: stop (no spin)
    s = next; log(pick === 'f' ? 'f' : pick === 'c' ? 'c' : 't', next);
  }
  return s;
}
/** `variance` (seller-variance-proposal.md): undefined = old deterministic bot (fixed 1 s taps, fixed sell grid). */
/** `opts.onObserve`: QA seam Q4, observe-only (tests/bot-m4.ts Observe); results are byte-identical with or without it. */
export function runBot(b: Balance, seed: number, model: Model, T = 1800, sellEvery = 15, variance?: SellerVarianceParams, opts: { onObserve?: Observe } = {}): BotResult {
  const V = variance ? new SellerVariance(variance, seed) : null;
  if (V) V.trace = TRACE.fn;
  if (V && variance!.poisson) b = { ...b, sim_test: { ...b.sim_test, poisson_arrivals: true } };
  let s = initialState(b, seed); const dt = 1 / b.tickHz, n = Math.round(T * b.tickHz);
  const buys: { t: number; kind: 'c' | 'f' | 't'; farm: number }[] = [];
  let tapT = 1, sellT = V ? V.checkInterval(sellEvery) : sellEvery;
  const reach = new Map<number, number>([[0, 0]]);
  for (let i = 1; i <= n; i++) {
    const t = Math.round(i * dt * 10) / 10;
    s = step(s, dt, b);
    if (t >= tapT) { tapT += V ? V.tapInterval() : 1; s = apply(s, { type: 'collect' }, b); observe(opts.onObserve, 'action', 'collect', t, s); }
    if (t >= sellT) {
      sellT = V ? t + V.checkInterval(sellEvery) : sellT + sellEvery; s = apply(s, { type: 'sellAll' }, b); observe(opts.onObserve, 'action', 'sellAll', t, s);
      if (V?.delay()) continue; // variance p_delay: this check-in skips buying
      const chf = V ? V.cheapFirst() : false;
      observe(opts.onObserve, 'buyCheck', 'buyCheck', t, s);
      // HoQA ac7-twobot-528f1a7: record the level AFTER the buy (the outer `s` is stale inside buy(), so two Farm buys in one check-in were logged as the same level).
      s = buy(s, model, b, (k, next) => { const farm = next.farmLevel; buys.push({ t, kind: k, farm }); if (k === 'f') reach.set(farm, t); observe(opts.onObserve, 'action', 'buy:' + k, t, next); }, chf);
    }
  }
  return {
    firstUpgradeS: buys[0]?.t ?? null,
    upgradesAt: (x) => buys.filter(u => u.t <= x).length,
    farmAt: (x) => buys.filter(u => u.t <= x && u.kind === 'f').length,
    reach,
    farmReachedS: (L) => buys.find(u => u.kind === 'f' && u.farm >= L)?.t ?? null,
  };
}
export const median = (xs: number[]) => { const a = [...xs].sort((p, q) => p - q), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
