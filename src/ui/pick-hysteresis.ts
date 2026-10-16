/** M4A-18 v1.4 / M4A-41 / clarity UC6 (PM Farm, HoP 16:08): ONE shared picker for the Farm-tab highlight and the
 *  next-goal hint (M4 on). Replaces the old holdTicks = 2 hold.
 *  - pick = best-payback AFFORDABLE row (econ/best-buy.ts 3-buy look-ahead; ties lower cost, then Farm > Hens > Egg value);
 *    when none is affordable, the best-payback row overall with affordable = false.
 *  - keep the current pick unless a challenger's payback <= 0.9x the current pick's (same state) AND the current pick
 *    has been shown >= 2 s.
 *  - switch at once when the current pick is bought, unaffordable, capped / MAX (no longer offered), or when an
 *    affordable row appears while the pick is the unaffordable fallback.
 *  - re-evaluate on every state change; 5 s periodic re-check as the fallback. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { options, paybackOf, BUY_ORDER, type BuyKey } from '../econ/best-buy';

export const SWITCH_RATIO = 0.9, MIN_SHOWN_MS = 2000, RECHECK_MS = 5000;
export type FarmKey = 'FARM' | 'HENS' | 'VALUE';
export interface RowScore { key: FarmKey; costCents: number; payback: number; level: number }
export interface SharedPick { key: FarmKey; affordable: boolean; costCents: number; payback: number }
export type Scorer = (s: GameState, b: Balance) => RowScore[];

const LEVEL = { FARM: (s: GameState) => s.farmLevel, HENS: (s: GameState) => s.hensLevel, VALUE: (s: GameState) => s.eggValueLevel };
/** Offered (not capped / MAX) Farm-tab rows with their bundle payback. */
export const defaultScorer: Scorer = (s, b) => options(s, b)
  .filter((o): o is typeof o & { key: FarmKey } => o.key in LEVEL)
  .map(o => ({ key: o.key, costCents: Math.round(o.cost * 100), payback: paybackOf(s, b, o.key as BuyKey), level: LEVEL[o.key](s) }));

const better = (a: RowScore, z: RowScore) => {
  const tie = a.payback === z.payback || Math.abs(a.payback - z.payback) <= 1e-12;
  if (!tie) return a.payback < z.payback;
  return a.costCents !== z.costCents ? a.costCents < z.costCents : BUY_ORDER.indexOf(a.key) < BUY_ORDER.indexOf(z.key);
};
const bestOf = (r: RowScore[]) => r.reduce<RowScore | null>((m, x) => !m || better(x, m) ? x : m, null);

export class PickHysteresis {
  shown: SharedPick | null = null;
  /** Evaluations run (state changes + periodic re-checks); exposed for tests / telemetry. */
  evals = 0; changes = 0;
  private shownAt = 0; private level = -1; private lastEval = -Infinity; private lastSig = '';
  constructor(private scorer: Scorer = defaultScorer, private sig: (s: GameState) => string = stateSig) {}
  /** Call on every render / state change. Evaluates only when the state changed or the 5 s re-check is due. */
  tick(s: GameState, b: Balance, nowMs: number): SharedPick | null {
    const k = this.sig(s);
    if (k !== this.lastSig || nowMs - this.lastEval >= RECHECK_MS) this.evaluate(s, b, nowMs);
    return this.shown;
  }
  evaluate(s: GameState, b: Balance, nowMs: number): SharedPick | null {
    this.evals++; this.lastEval = nowMs; this.lastSig = this.sig(s);
    const rows = this.scorer(s, b), coins = Math.round(s.coinsCents);
    const aff = rows.filter(r => coins >= r.costCents), best = bestOf(aff.length ? aff : rows);
    if (!best) return this.set(null, nowMs);
    const cur = this.shown && rows.find(r => r.key === this.shown!.key);
    const mk = (r: RowScore): SharedPick => ({ key: r.key, affordable: aff.includes(r), costCents: r.costCents, payback: r.payback });
    const keepable = cur && this.shown!.affordable && aff.includes(cur) && cur.level === this.level;
    if (!keepable) return this.set(mk(best), nowMs, best.level);
    if (best.key !== cur.key && best.payback <= SWITCH_RATIO * cur.payback && nowMs - this.shownAt >= MIN_SHOWN_MS) return this.set(mk(best), nowMs, best.level);
    this.shown = mk(cur); return this.shown; // refresh numbers, keep shownAt
  }
  private set(p: SharedPick | null, nowMs: number, level = -1): SharedPick | null {
    if ((p?.key ?? null) !== (this.shown?.key ?? null) || p?.affordable !== this.shown?.affordable) {
      if (this.shown && p && p.key !== this.shown.key) this.changes++;
      this.shownAt = nowMs;
    }
    this.shown = p; this.level = level; return p;
  }
}
export const stateSig = (s: GameState) => `${Math.round(s.coinsCents)}|${s.farmLevel}|${s.hensLevel}|${s.eggValueLevel}|${s.collectionLevel}|${s.graderTier}|${Object.keys(s.workers).sort().join(',')}`;
export const ROW_OF_KEY = { FARM: 'farm', HENS: 'hens', VALUE: 'eggValue' } as const;
