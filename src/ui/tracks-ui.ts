/** M4-A track copy, verbatim from art-ux/m4-tracks-copy.md v1.0 (§1 lock/MAX, §2 strip + toasts). Pure strings, unit-tested.
 *  Multipliers and thresholds come from balance.m4 (economy CSV), never from this file. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { balancedStrip, trackLock, trackCost, trackLevel } from '../sim/tracks';
import { farmCost } from '../sim/state';
import { gradeMult } from '../config/formulas';
const pct = (mult: number) => Math.round((mult - 1) * 100);
export const GRADE_NAMES = ['Grade A', 'Large', 'Jumbo'] as const;
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
/** M4A-18: the cheapest affordable Farm-tab row; ties Hens > Egg value > Farm; null if none affordable. */
export function highlightRow(s: GameState, b: Balance): RowKey | null {
  const rows: [RowKey, number | null][] = [
    ['hens', trackLock(s, 'hens', b) ? null : trackCost(trackLevel(s, 'hens'), 'hens', b) * 100],
    ['eggValue', trackLock(s, 'eggValue', b) ? null : trackCost(trackLevel(s, 'eggValue'), 'eggValue', b) * 100],
    ['farm', s.farmLevel >= b.maxLevel ? null : farmCost(s.farmLevel, b) * 100]];
  let best: [RowKey, number] | null = null;
  for (const [k, c] of rows) if (c !== null && s.coinsCents >= c && (!best || c < best[1])) best = [k, c];
  return best?.[0] ?? null;
}
/** M4A-18 anti-flicker: a coins-only change is shown once it held for holdTicks consecutive 1 Hz ticks (next-goal.ts
 *  holdTicks = 2); a purchase / hire / level change (immediate) applies the same tick. */
export class HighlightHold {
  shown: RowKey | null | undefined = undefined; private pending: RowKey | null | undefined = undefined; private n = 0;
  constructor(private holdTicks = 2) {}
  tick(next: RowKey | null, immediate = false): RowKey | null {
    if (this.shown === undefined || immediate || next === this.shown) { this.shown = next; this.pending = undefined; this.n = 0; return next; }
    if (next === this.pending) this.n++; else { this.pending = next; this.n = 1; }
    if (this.n >= this.holdTicks) { this.shown = next; this.pending = undefined; this.n = 0; }
    return this.shown;
  }
}
