/**
 * Bundle best-buy (Economy best() in product/sim/f1choice/f1_choice.py).
 * Scores assume hired workers are Working (float dollars). UC4/UC5.
 * Shared with rc1/ux-clarity (ported from 8631e94, same API). M4-A (HoP decisions 15:29): with the flag on the
 * options add HENS / VALUE (never when capped or MAX), and the Farm-tab highlight + next-goal use this payback.
 * Tie-breaks (deterministic): lower payback; within 1e-12, lower cost; then BUY_ORDER.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { farmCost, collectionCost } from '../sim/state';
import { hireCostCents, unlockFarm, graderTierCostCents, mood, isOff, type WorkerId } from '../sim/workers';
import { incomePerSec } from './income';
import { m4On } from '../config/formulas';
import { bestBuyV2On } from '../config/flags';
import { trackLock, trackCost } from '../sim/tracks';

export type BuyKey = 'FARM' | 'HENS' | 'VALUE' | 'COLL' | 'W1' | 'W2' | 'W3' | 'W4';
export const BUY_ORDER: BuyKey[] = ['FARM', 'HENS', 'VALUE', 'COLL', 'W1', 'W2', 'W3', 'W4'];
const WK = { W1: 'market_hand', W2: 'coop_hand', W3: 'hawker' } as const;

export interface BuyOpt {
  key: BuyKey;
  /** Cost in dollars (Economy). */
  cost: number;
  after: GameState;
}

export interface BestBuy {
  key: BuyKey;
  cost: number;
  /** Single-step gain $/s (after − now), Working assumption. */
  gain: number;
  /** cost/gain when gain > 0; else Infinity. */
  payback: number;
  /** Best bundle score Σgain/Σcost for paths starting with this buy. */
  bundleScore: number;
  /** Bundle payback (Σcost/Σgain) for the winning path, or null. */
  bundlePayback: number | null;
}

function withWorker(s: GameState, id: WorkerId): GameState {
  return { ...s, workers: { ...s.workers, [id]: { energy: 100, cdS: 0 } } };
}

export function options(s: GameState, b: Balance): BuyOpt[] {
  const out: BuyOpt[] = [];
  const F = s.farmLevel, C = s.collectionLevel;
  if (F < b.maxLevel) out.push({ key: 'FARM', cost: farmCost(F, b), after: { ...s, farmLevel: F + 1 } });
  if (m4On(b)) {
    if (!trackLock(s, 'hens', b)) out.push({ key: 'HENS', cost: trackCost(s.hensLevel, 'hens', b), after: { ...s, hensLevel: s.hensLevel + 1 } });
    if (!trackLock(s, 'eggValue', b)) out.push({ key: 'VALUE', cost: trackCost(s.eggValueLevel, 'eggValue', b), after: { ...s, eggValueLevel: s.eggValueLevel + 1 } });
  }
  if (C < b.maxLevel) out.push({ key: 'COLL', cost: collectionCost(C, b), after: { ...s, collectionLevel: C + 1 } });
  for (const k of ['W1', 'W2', 'W3'] as const) {
    const id = WK[k];
    if (!s.workers[id] && F >= unlockFarm(id, b))
      out.push({ key: k, cost: hireCostCents(id, b) / 100, after: withWorker(s, id) });
  }
  const tiers = b.workers.grader.tiers;
  const i = s.workers.grader ? s.graderTier : 0;
  if (i < tiers.length && F >= tiers[i].farm) {
    const after = s.workers.grader
      ? { ...s, graderTier: s.graderTier + 1 }
      : { ...withWorker(s, 'grader'), graderTier: 1 };
    out.push({ key: 'W4', cost: graderTierCostCents(i, b) / 100, after });
  }
  return out;
}

const working = { assumeWorking: true as const };

/** BBv2 (spec v1.0.3 27e753d8 §2; m4.flags.bestBuyV2). Exempt keys: always meaningful (Farm's single-step gain is negative by design). */
export const BBV2_EXEMPT: readonly BuyKey[] = ['FARM', 'W1', 'W2', 'W3', 'W4'];
/** Offered keys that are meaningful: exempt, or single-step gain > 0 ($/s, assumeWorking, ε = 0; = optionGain().gain > 0). */
export function meaningfulKeys(s: GameState, b: Balance): Set<BuyKey> {
  const base = incomePerSec(s, b, working), out = new Set<BuyKey>();
  for (const o of options(s, b)) if (BBV2_EXEMPT.includes(o.key) || incomePerSec(o.after, b, working) - base > 0) out.add(o.key);
  return out;
}
export const isMeaningful = (s: GameState, b: Balance, key: BuyKey): boolean => meaningfulKeys(s, b).has(key);
/** BBv2-1: the keys a picker may rank. Flag off: `keys` unchanged. Flag on: only the meaningful ones while any meaningful row is
 *  offered; when none is offered (after Farm L30 = MAX) every key stays (zero-gain strip target allowed, never ★). */
export function rankable<K extends BuyKey>(s: GameState, b: Balance, keys: readonly K[]): K[] {
  if (!bestBuyV2On(b)) return [...keys];
  const m = meaningfulKeys(s, b);
  return m.size ? keys.filter(k => m.has(k)) : [...keys];
}
/** BBv2 ★ key (PMFU BB12): the hint's key when it is affordable and meaningful, else null (the inert mark-null net). */
export const bbv2Mark = (pick: { key: BuyKey; affordable: boolean } | null | undefined, s: GameState, b: Balance): BuyKey | null =>
  pick?.affordable && isMeaningful(s, b, pick.key) ? pick.key : null;
/** BBv2-3: two ∞ paybacks tie on BUY_ORDER alone (FARM first); cost never decides an ∞-tie. Finite ties unchanged. */
export const infTie = (bb: boolean, a: number, z: number) => bb && a === Infinity && z === Infinity;

/** Depth-3 look-ahead: pick first item of the best Σgain/Σcost bundle. Ties → BUY_ORDER. */
export function bestBuy(s: GameState, b: Balance): BestBuy | null {
  const base = incomePerSec(s, b, working);
  const opts = options(s, b);
  if (!opts.length) return null;

  type Path = { first: BuyOpt; score: number; sumCost: number; sumGain: number };
  let bestPath: Path | undefined;

  const walk = (st: GameState, first: BuyOpt | null, sumCost: number, depth: number) => {
    if (first) {
      const gn = incomePerSec(st, b, working) - base;
      if (gn > 0) {
        const score = gn / sumCost;
        const cand: Path = { first, score, sumCost, sumGain: gn };
        if (!bestPath || score > bestPath.score + 1e-12
          || (Math.abs(score - bestPath.score) <= 1e-12
            && BUY_ORDER.indexOf(first.key) < BUY_ORDER.indexOf(bestPath.first.key))) {
          bestPath = cand;
        }
      }
    }
    if (depth === 0) return;
    for (const o of options(st, b)) walk(o.after, first ?? o, sumCost + o.cost, depth - 1);
  };
  walk(s, null, 0, 3);

  // Fallback: first option by BUY_ORDER (Economy returns farm when nothing gains).
  const pick = bestPath?.first ?? opts.slice().sort((a, z) => BUY_ORDER.indexOf(a.key) - BUY_ORDER.indexOf(z.key))[0];
  const gain = incomePerSec(pick.after, b, working) - base;
  const payback = gain > 0 ? pick.cost / gain : Infinity;
  return {
    key: pick.key,
    cost: pick.cost,
    gain,
    payback,
    bundleScore: bestPath?.score ?? 0,
    bundlePayback: bestPath && bestPath.sumGain > 0 ? bestPath.sumCost / bestPath.sumGain : null,
  };
}

/** Per-option single-step stats for card chips (Working assumption). */
export function optionGain(s: GameState, b: Balance, key: BuyKey): { gain: number; cost: number; payback: number; bundlePayback: number | null } | null {
  const o = options(s, b).find(x => x.key === key);
  if (!o) return null;
  const base = incomePerSec(s, b, working);
  const gain = incomePerSec(o.after, b, working) - base;
  // bundle payback: best path starting with this key
  let bundlePayback: number | null = null;
  const walk = (st: GameState, sumCost: number, depth: number, started: boolean) => {
    if (started) {
      const gn = incomePerSec(st, b, working) - base;
      if (gn > 0) {
        const pb = sumCost / gn;
        if (bundlePayback === null || pb < bundlePayback) bundlePayback = pb;
      }
    }
    if (depth === 0) return;
    for (const x of options(st, b)) {
      if (!started && x.key !== key) continue;
      walk(x.after, sumCost + x.cost, depth - 1, true);
    }
  };
  walk(s, 0, 3, false);
  return { gain, cost: o.cost, payback: gain > 0 ? o.cost / gain : Infinity, bundlePayback };
}

/** True when the best-buy target is a hired worker who is asleep/unpaid → hint shows Refill. */
export function bestBuyNeedsRefill(s: GameState, b: Balance, key: BuyKey): boolean {
  const id = key === 'W1' ? 'market_hand' : key === 'W2' ? 'coop_hand' : key === 'W3' ? 'hawker' : key === 'W4' ? 'grader' : null;
  if (!id) return false;
  const w = s.workers[id];
  return !!w && isOff(mood(w, b));
}

/** Payback rank of one option: bundle payback (best depth-3 path starting with it), else Infinity. */
export function paybackOf(s: GameState, b: Balance, key: BuyKey): number {
  const g = optionGain(s, b, key); return g?.bundlePayback ?? Infinity;
}
/** Best-payback option among `keys` (only those currently offered). Tie-breaks: payback, then cost, then BUY_ORDER. */
export function bestPaybackAmong(s: GameState, b: Balance, keys: BuyKey[]): { key: BuyKey; cost: number; payback: number } | null {
  let best: { key: BuyKey; cost: number; payback: number } | null = null;
  const bb = bestBuyV2On(b), ranked = rankable(s, b, keys); // BBv2-1: zero-gain keys are never ranked (flag off: keys)
  for (const o of options(s, b)) {
    if (!ranked.includes(o.key)) continue;
    const c = { key: o.key, cost: o.cost, payback: paybackOf(s, b, o.key) };
    const tie = c.payback === best?.payback || (best !== null && Math.abs(c.payback - best.payback) <= 1e-12);
    const order = best !== null && BUY_ORDER.indexOf(c.key) < BUY_ORDER.indexOf(best.key);
    const better = !best || (!tie && c.payback < best.payback)
      || (tie && (infTie(bb, c.payback, best.payback) ? order : (c.cost < best.cost || (c.cost === best.cost && order))));
    if (better) best = c;
  }
  return best;
}
