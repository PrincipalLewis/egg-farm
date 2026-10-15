/** M2 Workers bots on the REAL sim, ported from product/sim/economy_sim.py run_m2 (m2-economy-validation.md).
 *  Each sell visit: Sell all -> Manage (lowest worker at <= tired_below, if cooldown ready) -> buy loop:
 *  hire any unlocked + affordable worker, then next Grader tier, then the M1 buy rule (seller15 / cheapest). */
import type { Balance } from '../src/config/balance';
import { initialState, collectionCost, farmCost, GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import type { SimEvent } from '../src/sim/events';
import { WorkerId, hireCostCents, unlockFarm, graderTierCostCents } from '../src/sim/workers';
import type { Model } from './bot';
export interface M2Opts {
  model: Model; T?: number; sellEvery?: number;
  /** player taps n times (1/s) at the start of every period_s window; undefined = 1 tap/s */
  taps?: [number, number];
  use?: WorkerId[]; manage?: 'managed' | 'unmanaged';
}
export interface M2Result { reach: Map<number, number>; manages: number; hired: WorkerId[]; tiers: number; incomeAt: (L: number) => number | null; maxStep: (from: number, to: number) => number | null; }
export const SLOW = { sellEvery: 30, taps: [30, 5] as [number, number] }; // economy_sim.py SLOW
export function runM2(b: Balance, seed: number, o: M2Opts): M2Result {
  const T = o.T ?? 7200, sellEvery = o.sellEvery ?? 15, use = new Set(o.use ?? ['market_hand', 'coop_hand', 'hawker', 'grader']), managed = (o.manage ?? 'managed') === 'managed';
  let s: GameState = initialState(b, seed); const dt = 1 / b.tickHz, n = Math.round(T * b.tickHz);
  const reach = new Map<number, number>([[0, 0]]), income: { t: number; f: number; v: number }[] = [];
  let tapT = 1, sellT = sellEvery, manages = 0;
  const ev: SimEvent[] = [];
  const drain = (t: number, f: number) => { for (const e of ev) if (e.type === 'sell') income.push({ t, f, v: e.value }); ev.length = 0; };
  for (let i = 1; i <= n; i++) {
    const t = Math.round(i * dt * 10) / 10, f = s.farmLevel;
    s = step(s, dt, b, ev); drain(t, f);
    if (t >= tapT) { tapT += 1; if (!o.taps || ((tapT - 2) % o.taps[0]) < o.taps[1]) s = apply(s, { type: 'collect' }, b); }
    if (t < sellT) continue;
    sellT += sellEvery;
    s = apply(s, { type: 'sellAll' }, b, ev); drain(t, s.farmLevel);
    if (managed && s.manageCdS <= 1e-9) {
      const low = (Object.entries(s.workers) as [WorkerId, { energy: number }][]).filter(([, w]) => w.energy <= b.workers.energy.tired_below_pct).sort((a, c) => a[1].energy - c[1].energy);
      if (low.length) { s = apply(s, { type: 'manage', worker: low[0][0] }, b); manages++; }
    }
    for (let guard = 0; guard < 200; guard++) {
      let bought = false;
      for (const w of ['market_hand', 'coop_hand', 'hawker'] as const)
        if (use.has(w) && !s.workers[w] && s.farmLevel >= unlockFarm(w, b) && s.coinsCents >= hireCostCents(w, b)) { s = apply(s, { type: 'hire', worker: w }, b); bought = true; }
      const tiers = b.workers.grader.tiers;
      if (use.has('grader') && s.graderTier < tiers.length && s.farmLevel >= tiers[s.graderTier].farm && s.coinsCents >= graderTierCostCents(s.graderTier, b)) { s = apply(s, { type: 'buyGraderTier' }, b); bought = true; }
      const fc = s.farmLevel < b.maxLevel ? farmCost(s.farmLevel, b) * 100 : Infinity, cc = s.collectionLevel < b.maxLevel ? collectionCost(s.collectionLevel, b) * 100 : Infinity;
      let kind: 'c' | 'f' | null;
      if (o.model === 'seller15') kind = s.coinsCents >= fc ? 'f' : s.coinsCents >= cc && cc <= 0.5 * fc ? 'c' : null;
      else kind = s.coinsCents >= Math.min(cc, fc) ? (cc <= fc ? 'c' : 'f') : null;
      if (kind === 'f') { s = apply(s, { type: 'buyFarm' }, b); reach.set(s.farmLevel, t); }
      else if (kind === 'c') s = apply(s, { type: 'buyCollection' }, b);
      if (!kind && !bought) break;
    }
  }
  return {
    reach, manages, hired: Object.keys(s.workers) as WorkerId[], tiers: s.graderTier,
    incomeAt: (L) => { const t0 = reach.get(L), t1 = reach.get(L + 1); if (t0 == null || t1 == null || t1 <= t0) return null; return income.filter(x => x.f === L && x.t >= t0 && x.t < t1).reduce((a, x) => a + x.v, 0) / 100 / (t1 - t0); },
    maxStep: (from, to) => { let m = 0; for (let L = from + 1; L <= to; L++) { const a = reach.get(L - 1), c = reach.get(L); if (a == null || c == null) return null; m = Math.max(m, c - a); } return m; },
  };
}
