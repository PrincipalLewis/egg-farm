/** M4-A track copy, verbatim from art-ux/m4-tracks-copy.md v1.0 (§1 lock/MAX, §2 strip + toasts). Pure strings, unit-tested.
 *  Multipliers and thresholds come from balance.m4 (economy CSV), never from this file. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { balancedStrip, trackLock, trackCost, trackLevel } from '../sim/tracks';
import { options, bestPaybackAmong } from '../econ/best-buy';
import { gradeMult } from '../config/formulas';
const pct = (mult: number) => Math.round((mult - 1) * 100);
export const GRADE_NAMES = ['Grade A', 'Large', 'Jumbo'] as const;
/** L30-18 (HoP 23:37): never show a near-zero increase. If the next value FORMATS the same as the current one (rounding at
 *  high levels, e.g. "$1.2M -> $1.2M"), the arrow and next value are hidden and only the current value shows. */
export const fxArrow = (cur: string, next: string) => cur === next ? cur : `${cur} <span class="arrow">→</span> ${next}`;
export const trackLockText = (F: number) => `Needs Farm L${F + 1}`;
type Seg = { track: 'Hens' | 'Egg value' | 'Farm'; level: number; fill: number; weakest: boolean };
/** M4A-19: one segment per track (order Hens, Egg value, Farm), fill = min(level, N)/N, N = next Balanced threshold
 *  (full at the top tier); weakest = lowest fill, ties mark all tied. */
export function balancedSegments(s: GameState, b: Balance): Seg[] {
  const N = balancedStrip(s, b).nextLevel;
  const lv: [Seg['track'], number][] = [['Hens', s.hensLevel], ['Egg value', s.eggValueLevel], ['Farm', s.farmLevel]];
  const fills = lv.map(([, L]) => N === null ? 1 : Math.min(L, N) / N), lo = Math.min(...fills);
  return lv.map(([track, level], i) => ({ track, level, fill: fills[i], weakest: N !== null && fills[i] === lo }));
}
export function balancedStripText(s: GameState, b: Balance, aria = false): string {
  const st = balancedStrip(s, b), T = b.m4!.milestones.balanced;
  if (aria) {
    const w = balancedSegments(s, b).find(x => x.weakest) ?? balancedSegments(s, b).reduce((a, z) => z.level < a.level ? z : a);
    return `Balanced farm ${st.n} of ${st.of}. Weakest: ${w.track}, level ${w.level}${st.nextLevel !== null ? ` of ${st.nextLevel}` : ''}.`;
  }
  return st.nextLevel === null ? `Balanced farm ${st.n}/${st.of} · +${pct(T[T.length - 1].mult)}%` : `Balanced farm ${st.n}/${st.of} · next +${pct(T[st.n].mult)}% at all ≥ ${st.nextLevel}`;
}
/** Row effect line for the next Hens milestone (same words as the toast, minus the "Hens L{n}: " prefix). */
export const hensMilestoneEffect = (L: number, b: Balance) => `bigger coop · offline ×${b.m4!.milestones.hens.find(m => m.level === L)!.offlineMult}`;
export const gradeEffect = (V: number, F: number, b: Balance) => { const M = b.m4!.milestones.grades, i = M.findIndex(g => g.mult === gradeMult(V, F, b)); return `${GRADE_NAMES[i]} ×${M[i].mult}`; };
/** M4A-12 toast copy. id = hens:<L> | grade:<L> | balanced:<tier>. */
export function milestoneToast(id: string, b: Balance): string {
  const [kind, n] = id.split(':'), k = +n, M = b.m4!.milestones;
  if (kind === 'hens') return `Hens L${k}: ${hensMilestoneEffect(k, b)}`;
  if (kind === 'grade') { const i = M.grades.findIndex(g => g.level === k); return `Egg value L${k}: ${GRADE_NAMES[i]} ×${M.grades[i].mult}`; }
  return `Balanced farm ${k}/${M.balanced.length}: +${pct(M.balanced[k - 1].mult)}% income`;
}
/** M4A-22 next-goal labels (art-ux/m4-tracks-copy.md: `Hens L{n}: bigger coop`; Egg value suffix ": {grade}" at a grade threshold whose Farm gate is met). */
export function trackGoalLabel(t: 'hens' | 'eggValue', n: number, F: number, b: Balance): string {
  const M = b.m4!.milestones;
  if (t === 'hens') return M.hens.some(m => m.level === n) ? `Hens L${n}: bigger coop` : `Hens L${n}`;
  const i = M.grades.findIndex(g => g.level === n && F >= g.minFarm);
  return i >= 0 ? `Egg value L${n}: ${GRADE_NAMES[i]}` : `Egg value L${n}`;
}
export type RowKey = 'hens' | 'eggValue' | 'farm';
const ROW_KEY = { hens: 'HENS', eggValue: 'VALUE', farm: 'FARM' } as const;
const KEY_ROW = { HENS: 'hens', VALUE: 'eggValue', FARM: 'farm' } as const;
/** M4A-18 (HoP 15:29, one rule with the next-goal hint): the best-payback AFFORDABLE Farm-tab row (econ/best-buy.ts
 *  bundle payback, ties lower cost then Farm > Hens > Egg value = BUY_ORDER). If none is affordable: the best-payback row
 *  overall with affordable = false (the UI shows its ETA). null only when every row is capped / MAX. */
export function highlightPick(s: GameState, b: Balance): { row: RowKey; affordable: boolean; costCents: number } | null {
  const offered = options(s, b).filter(o => o.key in KEY_ROW);
  const aff = offered.filter(o => s.coinsCents >= Math.round(o.cost * 100)).map(o => o.key);
  const pick = bestPaybackAmong(s, b, aff.length ? aff : offered.map(o => o.key));
  return pick ? { row: KEY_ROW[pick.key as keyof typeof KEY_ROW], affordable: aff.length > 0, costCents: Math.round(pick.cost * 100) } : null;
}
export const highlightRow = (s: GameState, b: Balance): RowKey | null => { const p = highlightPick(s, b); return p?.affordable ? p.row : null; };
export { ROW_KEY };
/** The old HighlightHold (holdTicks = 2) is replaced by ui/pick-hysteresis.ts PickHysteresis (M4A-18 v1.4, M4A-41). */
/** m4-tracks-copy.md v1.1: second-line milestone hint, only when the next milestone is 1..5 levels above L; hidden at a
 *  milestone level itself (the toast covers it) and at MAX. Levels and mults from balance. */
export const MILESTONE_HINT_WINDOW = 5;
export function milestoneHint(t: 'hens' | 'eggValue', L: number, F: number, b: Balance): string | null {
  if (L >= b.maxLevel) return null;
  const M = b.m4!.milestones;
  if (t === 'hens') {
    if (M.hens.some(m => m.level === L)) return null;
    const n = M.hens.find(m => m.level > L);
    return n && n.level - L <= MILESTONE_HINT_WINDOW ? `Next at L${n.level}: bigger coop · offline ×${n.offlineMult}` : null;
  }
  if (M.grades.some(g => g.level === L && F >= g.minFarm)) return null;
  const i = M.grades.findIndex(g => g.level > L);
  return i >= 0 && M.grades[i].level - L <= MILESTONE_HINT_WINDOW ? `Next at L${M.grades[i].level}: ${GRADE_NAMES[i]} ×${M.grades[i].mult}` : null;
}
