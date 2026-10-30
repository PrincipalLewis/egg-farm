/** M4-A track copy, verbatim from art-ux/m4-tracks-copy.md v1.0 (§1 lock/MAX, §2 strip + toasts). Pure strings, unit-tested.
 *  Multipliers and thresholds come from balance.m4 (economy CSV), never from this file. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { balancedStrip, trackLock, trackCost, trackLevel } from '../sim/tracks';
import { options, bestPaybackAmong, rankable } from '../econ/best-buy';
import { gradeMult } from '../config/formulas';
const pct = (mult: number) => Math.round((mult - 1) * 100);
export const GRADE_NAMES = ['Grade A', 'Large', 'Jumbo'] as const;
/** Lock line for a capped track row; `need` = the Farm level that unlocks the next buy (trackUnlockFarm). */
export const trackLockText = (need: number) => `Needs Farm L${need}`;
/** D-HOP-40 (m4a-spec v1.24 §19, B1-9): a capped row that no Farm level <= farm max can unlock. Not a lock (no glyph),
 *  muted like MAX, no button / cost / affordability. Copy: Head of Art & UX GO 2026-10-19 10:34. */
export const TRACK_FARM_MAX_TEXT = 'Max for this farm';
/** §19 aria for that state, same words as the visible text (B1-8): `{Track}, level {L}. Max for this farm.` */
export const trackFarmMaxAria = (track: string, level: number) => `${track}, level ${level}. ${TRACK_FARM_MAX_TEXT}.`;
/** Highest Farm level the player can buy, read from balance: `farmMaxLevel` (L30+, CSV farm_max_level) when present, else
 *  maxLevel (pre-L30+ data, where farm max == track max == 30). Clamped to maxLevel, same rule as L30+'s formulas.farmMaxLevel. */
export const unlockFarmMax = (b: Balance) => Math.min(b.maxLevel, (b as { farmMaxLevel?: number }).farmMaxLevel ?? b.maxLevel);
/** M41-11 (M4B-1, D-HOP-28/32/40; m4a-spec v1.24 §19): the Farm level at which a capped track can be bought again = the
 *  first Farm level F' with F < F' <= farm max (unlockFarmMax, NOT the track maxLevel) at which the game's own lock rule
 *  (sim/tracks.ts trackLock, i.e. trackCap from balance data) lets the buy happen. No offset or F+1 arithmetic here: N is
 *  whatever the game enforces. null = no F' <= farm max allows it: the row shows `Max for this farm` (TRACK_FARM_MAX_TEXT),
 *  never a "Needs Farm" label, never F+1 and never a farmMax fallback (B1-6/B1-7). */
export function trackUnlockFarm(s: GameState, t: 'hens' | 'eggValue', b: Balance): number | null {
  const farmMax = unlockFarmMax(b);
  for (let f = s.farmLevel + 1; f <= farmMax; f++) if (trackLock({ ...s, farmLevel: f }, t, b) === null) return f;
  return null;
}
/** True when a track row is in the D-HOP-40 `Max for this farm` state (capped and no Farm level <= farm max unlocks it). */
export const trackFarmMaxed = (s: GameState, t: 'hens' | 'eggValue', b: Balance) => trackLock(s, t, b) === 'cap' && trackUnlockFarm(s, t, b) === null;
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
    // m4-tracks-copy.md v1.1 (01:23): top tier has no Weakest clause; y from balance (top balanced_mult).
    if (st.nextLevel === null) return `Balanced farm ${st.n} of ${st.of}. Top tier, +${pct(T[T.length - 1].mult)}% income.`;
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
  const rk = rankable(s, b, ['FARM', 'HENS', 'VALUE'] as const), offered = options(s, b).filter(o => o.key in KEY_ROW && rk.includes(o.key as never)); // BBv2-1
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
