/** Copies of QA tests/bot.ts runBot (no workers) and tests/bot-m2.ts runM2 (workers), seller15 + variance only, buy step via pickM4. */
import type { Balance } from '../src/config/balance';
import { initialState, GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { WorkerId, showManageAll, hireCostCents, unlockFarm, graderTierCostCents } from '../src/sim/workers';
import { SellerVariance, SellerVarianceParams } from './seller-variance';
import { pickM4, Pick } from './m4buy';
import { pickM4All } from './m4all';
import { m4On } from '../src/config/formulas';
const WID = { W1: 'market_hand', W2: 'coop_hand', W3: 'hawker' } as const;
export interface R { reach: Map<number, number>; at30: { F: number; H: number; V: number; C: number }; buys: Record<string, number>; bt: number[] }
const act = (k: any): any => k === 'W4' ? { type: 'buyGraderTier' } : k in WID ? { type: 'hire', worker: (WID as any)[k] } : k === 'f' ? { type: 'buyFarm' as const } : k === 'c' ? { type: 'buyCollection' as const } : { type: 'buyTrack' as const, track: k };
export function run(b: Balance, seed: number, workers: boolean, T: number, variance?: SellerVarianceParams): R {
  const sellEvery = 15, V = variance ? new SellerVariance(variance, seed) : null;
  if (V && variance!.poisson) b = { ...b, sim_test: { ...b.sim_test, poisson_arrivals: true } };
  let s: GameState = initialState(b, seed); const dt = 1 / b.tickHz, n = Math.round(T * b.tickHz);
  const reach = new Map<number, number>([[0, 0]]), buys: Record<string, number> = { c: 0, f: 0, hens: 0, eggValue: 0 }, bt: number[] = [];
  let tapT = 1, sellT = V ? V.checkInterval(sellEvery) : sellEvery, at30 = { F: 0, H: 0, V: 0, C: 0 };
  for (let i = 1; i <= n; i++) {
    const t = Math.round(i * dt * 10) / 10;
    s = step(s, dt, b);
    if (t >= tapT) { tapT += V ? V.tapInterval() : 1; s = apply(s, { type: 'collect' }, b); }
    if (t >= sellT) {
      sellT = V ? t + V.checkInterval(sellEvery) : sellT + sellEvery; s = apply(s, { type: 'sellAll' }, b);
      if (workers && s.manageCdS <= 1e-9) {
        const low = (Object.entries(s.workers) as [WorkerId, { energy: number }][]).filter(([, w]) => w.energy <= b.workers.energy.manage_prompt_threshold * 100).sort((a, c) => a[1].energy - c[1].energy);
        if (low.length) s = apply(s, showManageAll(s.workers, b) && low.length >= b.workers.energy.manage_all_min_workers ? { type: 'manageAll' } : { type: 'manage', worker: low[0][0] }, b);
      }
      if (!V?.delay()) {
        let chf = V ? V.cheapFirst() : false;
        for (let g = 0; g < 200; g++) {
          let bought = false;
          const all = m4On(b) && process.env.ALIGN === '1';
          if (workers && !all) {
            for (const w of ['market_hand', 'coop_hand', 'hawker'] as const)
              if (!s.workers[w] && s.farmLevel >= unlockFarm(w, b) && s.coinsCents >= hireCostCents(w, b)) { s = apply(s, { type: 'hire', worker: w }, b); bought = true; bt.push(t); }
            const tiers = b.workers.grader.tiers;
            if (s.graderTier < tiers.length && s.farmLevel >= tiers[s.graderTier].farm && s.coinsCents >= graderTierCostCents(s.graderTier, b)) { s = apply(s, { type: 'buyGraderTier' }, b); bought = true; bt.push(t); }
          }
          const k: any = all ? pickM4All(s, b, workers ? ['FARM', 'HENS', 'VALUE', 'COLL', 'W1', 'W2', 'W3', 'W4'] : ['FARM', 'HENS', 'VALUE', 'COLL']) : pickM4(s, b, chf); if (!all && k === 'c' && chf) chf = false;
          if (k) { const before = s; s = apply(s, act(k), b); if (s === before) break; buys[k] = (buys[k] ?? 0) + 1; bt.push(t); if (k === 'f') reach.set(s.farmLevel, t); }
          if (!k && !bought) break;
          if (!workers && !k) break;
        }
      }
    }
    if (i === 1800 * b.tickHz) at30 = { F: s.farmLevel, H: s.hensLevel, V: s.eggValueLevel, C: s.collectionLevel };
  }
  return { reach, at30, buys, bt };
}
