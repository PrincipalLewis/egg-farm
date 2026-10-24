/**
 * Steady-state income (rc1-upgrade-clarity-spec.md §1 / §2(f) UC18).
 * Pure; recomputed from config + live worker moods. Not the rolling 60 s average.
 * Dollars per second; may be ≤ 0 (no clamp). Asleep Grader keeps 15% bonus via graderMult.
 * Shared with rc1/ux-clarity (same path + API, ported from 8631e94) so the branches converge; M4-A: with the flag on,
 * eggs/s and the unit price come from sim/tracks.ts (Hens / Egg value), otherwise identical to rc1.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { eggsPerTap, demandRange, customerIntervalS } from '../sim/state';
import { prodEggsPerSec, salePriceCents } from '../sim/tracks';
import { mood, isOff, graderMult, hawkerDemandMult, type Workers } from '../sim/workers';

export type IncomeOpts = {
  /** When true, treat every hired worker as Working (Economy best() scoring). */
  assumeWorking?: boolean;
};

/** Egg sale price in dollars (Python-compatible round to 2 dp × grader mult). */
export function priceDollars(s: GameState, b: Balance, opts: IncomeOpts = {}): number {
  const base = salePriceCents(s, b) / 100; // one price source (config-driven; flag off = eggPriceCents(F, C))
  const ws = opts.assumeWorking ? workingClone(s.workers) : s.workers;
  return base * graderMult(ws, s.graderTier, b);
}

/** Collect eggs/s: 1 tap/s + Coop Hand (Working = +0.5×eggs/tap, matching Economy sim). Model assumptions of the rc1 spec, not tunables. */
export function collectPerSec(s: GameState, b: Balance, opts: IncomeOpts = {}): number {
  const tap = eggsPerTap(s.collectionLevel, b);
  const w = s.workers.coop_hand;
  if (!w) return tap;
  if (opts.assumeWorking) return tap * 1.5;
  const m = mood(w, b);
  if (!m || isOff(m)) return tap; // asleep / unpaid / paused → no auto collect
  if (m === 'working') return tap * 1.5;
  const { every_s, tired_every_s } = b.workers.coop_hand;
  return tap * (1 + (every_s / tired_every_s) * 0.5);
}

export function demandPerSec(s: GameState, b: Balance, opts: IncomeOpts = {}): number {
  const F = s.farmLevel;
  const [lo, hi] = demandRange(F, b);
  const ws = opts.assumeWorking ? workingClone(s.workers) : s.workers;
  return ((lo + hi) / 2) / customerIntervalS(F, b) * hawkerDemandMult(ws, b);
}

/** Wage $/s for hired Market/Coop Hand; 0 when Asleep, Unpaid, or paused. */
export function wagesPerSec(s: GameState, b: Balance, opts: IncomeOpts = {}): number {
  let w = 0;
  for (const id of ['market_hand', 'coop_hand'] as const) {
    const worker = s.workers[id];
    if (!worker) continue;
    if (!opts.assumeWorking) {
      const m = mood(worker, b);
      if (!m || isOff(m)) continue;
    }
    w += b.workers[id].wage_per_farm_per_min * s.farmLevel / 60;
  }
  return w;
}

/** Gross eggs sold/s × price − wages. Live moods unless assumeWorking. */
export function incomePerSec(s: GameState, b: Balance, opts: IncomeOpts = {}): number {
  const eggs = Math.min(prodEggsPerSec(s, b), demandPerSec(s, b, opts), collectPerSec(s, b, opts));
  return eggs * priceDollars(s, b, opts) - wagesPerSec(s, b, opts);
}

/** Gross sales per second ($), before wages. */
export const grossSalesPerSec = (s: GameState, b: Balance) => incomePerSec(s, b) + wagesPerSec(s, b);
/** PM Workers ruling (a), one shared threshold (review 23a3798 #3): production is "stopped" only when gross sales round to $0.00/s.
 *  A negative net rate (wages > sales) is not "stopped": production is running. Used by the header aria and the worker banners. */
export const salesStopped = (s: GameState, b: Balance) => Math.round(grossSalesPerSec(s, b) * 100) <= 0;
/** True when any hired worker is asleep/unpaid (Critic #3 / AC-R2). */
export function productionStopped(s: GameState, b: Balance): boolean {
  for (const id of ['market_hand', 'coop_hand', 'hawker', 'grader'] as const) {
    const w = s.workers[id];
    if (w && isOff(mood(w, b))) return true;
  }
  return false;
}

export function asleepOrUnpaidCount(s: GameState, b: Balance): number {
  let n = 0;
  for (const id of ['market_hand', 'coop_hand', 'hawker', 'grader'] as const) {
    const w = s.workers[id];
    if (w && isOff(mood(w, b))) n++;
  }
  return n;
}

function workingClone(ws: Workers): Workers {
  const out: Workers = {};
  for (const id of ['market_hand', 'coop_hand', 'hawker', 'grader'] as const) {
    const w = ws[id];
    if (w) out[id] = { energy: 100, cdS: w.cdS };
  }
  return out;
}

/** Seconds to afford needCents at steady-state income; null when income ≤ 0. */
export function secondsToAffordSteady(s: GameState, b: Balance, needCents: number): number | null {
  if (needCents <= 0) return 0;
  const r = incomePerSec(s, b);
  if (r <= 0) return null;
  return needCents / 100 / r;
}

/**
 * Monotonic ETA (UC15): displayed seconds never rise by more than maxRise between updates,
 * unless income dropped or coins were spent.
 */
export class EtaHold {
  private shown: number | null = null;
  private lastIncome = NaN;
  private lastCoins = NaN;
  constructor(private maxRise = 5) {}
  tick(raw: number | null, income: number, coinsCents: number): number | null {
    const incomeDropped = Number.isFinite(this.lastIncome) && income < this.lastIncome - 1e-9;
    const coinsSpent = Number.isFinite(this.lastCoins) && coinsCents < this.lastCoins - 1e-9;
    const force = incomeDropped || coinsSpent;
    this.lastIncome = income;
    this.lastCoins = coinsCents;
    if (raw === null) { this.shown = null; return null; }
    if (this.shown === null || force) { this.shown = raw; return raw; }
    if (raw > this.shown + this.maxRise) return this.shown;
    this.shown = raw;
    return raw;
  }
}
