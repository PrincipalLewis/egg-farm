/** M4A-18 v1.4 / M4A-41 / clarity UC6 (PM Farm, HoP 16:08): ONE shared picker for the Farm-tab highlight and the
 *  next-goal hint (M4 on). Replaces the old holdTicks = 2 hold.
 *  - pick = best-payback AFFORDABLE row (econ/best-buy.ts 3-buy look-ahead; ties lower cost, then Farm > Hens > Egg value);
 *    when none is affordable, the best-payback row overall with affordable = false.
 *  - keep the current pick unless a challenger's payback <= 0.9x the current pick's (same state) AND the current pick
 *    has been shown >= 2 s.
 *  - switch at once when the current pick is bought, unaffordable, capped / MAX (no longer offered), or when an
 *    affordable row appears while the pick is the unaffordable fallback (first affordable row, at once).
 *  - HoP 16:15: a row that has just become affordable skips the 2 s hold but still needs the 0.9x bar.
 *  - re-evaluate on every state change; 5 s periodic re-check as the fallback. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { options, paybackOf, BUY_ORDER, type BuyKey } from '../econ/best-buy';

export const SWITCH_RATIO = 0.9, MIN_SHOWN_MS = 2000, RECHECK_MS = 5000;
export type FarmKey = 'FARM' | 'HENS' | 'VALUE';
export const FARM_ROWS: readonly BuyKey[] = ['FARM', 'HENS', 'VALUE'];
export interface RowScore { key: BuyKey; costCents: number; payback: number; level: number }
export interface SharedPick { key: BuyKey; affordable: boolean; costCents: number; payback: number }
export type Scorer = (s: GameState, b: Balance) => RowScore[];

const LEVEL: Record<BuyKey, (s: GameState) => number> = {
  FARM: s => s.farmLevel, HENS: s => s.hensLevel, VALUE: s => s.eggValueLevel, COLL: s => s.collectionLevel,
  W1: s => +!!s.workers.market_hand, W2: s => +!!s.workers.coop_hand, W3: s => +!!s.workers.hawker, W4: s => s.workers.grader ? s.graderTier : 0 };
/** Offered (not capped / MAX / locked) options in `keys` with their bundle payback. */
export const scorerFor = (keys: readonly BuyKey[]): Scorer => (s, b) => options(s, b)
  .filter(o => keys.includes(o.key))
  .map(o => ({ key: o.key, costCents: Math.round(o.cost * 100), payback: paybackOf(s, b, o.key), level: LEVEL[o.key](s) }));
/** Highlight instance: Farm-tab rows only (M4A-18). */
export const defaultScorer: Scorer = scorerFor(FARM_ROWS);
/** Hint instance: every option incl. Collection and workers (clarity UC7). */
export const allScorer: Scorer = scorerFor(['FARM', 'HENS', 'VALUE', 'COLL', 'W1', 'W2', 'W3', 'W4']);

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
  private shownAt = 0; private level = -1; private lastEval = -Infinity; private lastSig = ''; private prevAff = new Set<BuyKey>();
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
    const prevAff = this.prevAff; this.prevAff = new Set(aff.map(r => r.key));
    const keepable = cur && this.shown!.affordable && aff.includes(cur) && cur.level === this.level;
    if (!keepable) return this.set(mk(best), nowMs, best.level); // no current pick / bought / unaffordable / cap: at once
    // HoP 16:15: a row that just became affordable skips the 2 s hold but must still clear the 0.9x bar.
    // Every newly affordable row is checked; the best of those clearing 0.9x wins at once.
    const freshWin = bestOf(aff.filter(r => !prevAff.has(r.key) && r.key !== cur.key && r.payback <= SWITCH_RATIO * cur.payback));
    if (freshWin) return this.set(mk(freshWin), nowMs, freshWin.level);
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
/** Two instances, same rules: highlight ranks Farm-tab rows, hint ranks every option. When the hint's pick is a
 *  Farm-tab row it shows the highlight's pick (M4A-41); off-tab it points there and the highlight keeps its row. */
export class DualPicker {
  readonly highlight: PickHysteresis; readonly hint: PickHysteresis;
  constructor(hl: Scorer = defaultScorer, all: Scorer = allScorer, sig: (s: GameState) => string = stateSig) {
    this.highlight = new PickHysteresis(hl, sig); this.hint = new PickHysteresis(all, sig);
  }
  tick(s: GameState, b: Balance, nowMs: number): { highlight: SharedPick | null; hint: SharedPick | null } {
    const h = this.highlight.tick(s, b, nowMs), a = this.hint.tick(s, b, nowMs);
    return { highlight: h, hint: a && FARM_ROWS.includes(a.key) && h ? h : a };
  }
}
export const ROW_OF_KEY: Partial<Record<BuyKey, 'farm' | 'hens' | 'eggValue'>> = { FARM: 'farm', HENS: 'hens', VALUE: 'eggValue' };
