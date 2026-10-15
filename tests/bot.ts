/** AC7 scripted players driving the REAL sim (step/apply), per core-loop-spec AC7. */
import type { Balance } from '../src/config/balance';
import { initialState, collectionCost, farmCost, GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
export type Model = 'seller15' | 'cheapest';
export interface BotResult { firstUpgradeS: number | null; upgradesAt: (s: number) => number; farmAt: (s: number) => number; farmReachedS: (L: number) => number | null }
const can = (s: GameState, cents: number) => s.coinsCents >= cents;
function buy(s: GameState, model: Model, b: Balance, log: (kind: 'c' | 'f') => void): GameState {
  for (let guard = 0; guard < 100; guard++) {
    const cc = collectionCost(s.collectionLevel, b) * 100, fc = farmCost(s.farmLevel, b) * 100;
    const cOk = s.collectionLevel < b.maxLevel && can(s, cc), fOk = s.farmLevel < b.maxLevel && can(s, fc);
    let pick: 'c' | 'f' | null = null;
    if (model === 'seller15') pick = fOk ? 'f' : cOk && cc <= 0.5 * fc ? 'c' : null;
    else pick = cOk && fOk ? (cc <= fc ? 'c' : 'f') : cOk ? 'c' : fOk ? 'f' : null;
    if (!pick) return s;
    s = apply(s, { type: pick === 'f' ? 'buyFarm' : 'buyCollection' }, b); log(pick);
  }
  return s;
}
export function runBot(b: Balance, seed: number, model: Model, T = 1800, sellEvery = 15): BotResult {
  let s = initialState(b, seed); const dt = 1 / b.tickHz, n = Math.round(T * b.tickHz);
  const buys: { t: number; kind: 'c' | 'f'; farm: number }[] = [];
  let tapT = 1, sellT = sellEvery;
  for (let i = 1; i <= n; i++) {
    const t = Math.round(i * dt * 10) / 10;
    s = step(s, dt, b);
    if (t >= tapT) { tapT += 1; s = apply(s, { type: 'collect' }, b); }
    if (t >= sellT) { sellT += sellEvery; s = apply(s, { type: 'sellAll' }, b); s = buy(s, model, b, k => buys.push({ t, kind: k, farm: s.farmLevel + (k === 'f' ? 1 : 0) })); }
  }
  return {
    firstUpgradeS: buys[0]?.t ?? null,
    upgradesAt: (x) => buys.filter(u => u.t <= x).length,
    farmAt: (x) => buys.filter(u => u.t <= x && u.kind === 'f').length,
    farmReachedS: (L) => buys.find(u => u.kind === 'f' && u.farm >= L)?.t ?? null,
  };
}
export const median = (xs: number[]) => { const a = [...xs].sort((p, q) => p - q), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
