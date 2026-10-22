/** M41-8 F4 next-goal strip label (art-ux/f4-next-goal-label.md, LOCKED 10:10 + D-HOP-32; m4a-spec v1.24 §18 F4-1..19).
 *  Pure: templates, X from best_roi's own gain, truncation to 27 code points, untruncated aria. The D-HOP-42
 *  `Farm L{n}: unlocks {Track} L{m}` variant (F4-20..25) depends on L30+ and is NOT built (M4.2).
 *  M41-8 F3 = UX-M4 ★ Best buy chip (art-ux/m4.1-ui-minors.md): `bestBuyMark` is the ONE source for the strip ★ and the
 *  row chip (D-PMFU-2026-10-19-05, F4-13). */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { eggsPerTap } from '../sim/state';
import { optionGain, type BuyKey } from '../econ/best-buy';
import { incomePerSec } from '../econ/income';
import { GRADE_NAMES } from './tracks-ui';

export const NBSP = '\u00A0';
export const MAX_GOAL_LEN = 27;
/** Short track names (truncation step 2; D-HOP-32 3: `Value` stands, the rc1 §4 short name is superseded). Hens / Farm have none. */
export const SHORT_NAME: Record<string, string> = { 'Egg value': 'Value', Collection: 'Coll.' };
export type Pct = number | '<1' | null;
export type GoalSuffix = { kind: 'milestone'; text: string } | { kind: 'pct'; x: Pct } | { kind: 'tap'; d: number };
export interface GoalLabelSpec { track: string; n: number; star: boolean; suffix: GoalSuffix }
/** Rendered pieces: star + name may shrink (JS steps 1-3; CSS only ever ellipsises .ng-name); level + suffix never cut. */
export interface GoalLabelParts { star: string; name: string; level: string; suffix: string; text: string; aria: string }

const cps = (s: string) => [...s].length;
/** F4-9 / F4-9b / F4-10 / F4-11: X = floor(100 × gain / base + 1e-9); 0 < delta < 1 → '<1' (never `+0%`);
 *  delta ≤ 0 (D-PMFU-04) or income/s now = 0 → null (part hidden). */
export function pctOf(gain: number, base: number): Pct {
  if (!(base > 0) || !(gain > 0)) return null;
  const x = Math.floor((100 * gain) / base + 1e-9);
  return x < 1 ? '<1' : x;
}
/** F4-12: the % for one track buy, from best_roi's own numbers (optionGain(...).gain over incomePerSec(working)) —
 *  the same two calls bestBuy/paybackOf use; no second income model. null when the option is not offered. */
export function bestRoiDelta(s: GameState, b: Balance, key: BuyKey): { gain: number; base: number; x: Pct } | null {
  const o = optionGain(s, b, key); if (!o) return null;
  const base = incomePerSec(s, b, { assumeWorking: true });
  return { gain: o.gain, base, x: pctOf(o.gain, base) };
}
const suffixText = (sf: GoalSuffix) => sf.kind === 'milestone' ? `: ${sf.text}`
  : sf.kind === 'tap' ? `: +${sf.d}/tap`
  : sf.x === null ? '' : `${NBSP}·${NBSP}+${sf.x}% income`;
const suffixAria = (sf: GoalSuffix) => sf.kind === 'milestone' ? `, ${sf.text}`
  : sf.kind === 'tap' ? `, plus ${sf.d} per tap`
  : sf.x === null ? '' : sf.x === '<1' ? ', plus less than 1 percent income' : `, plus ${sf.x} percent income`;
/** Truncation (art file + §18), applied in order only while over 27 code points: 1 drop `★ `; 2 short name;
 *  3 ellipsis (U+2026, counts 1) on the track name, keeping the largest prefix that fits. Level + suffix never cut. */
export function goalLabelParts(spec: GoalLabelSpec): GoalLabelParts {
  const level = `${NBSP}L${spec.n}`, suffix = suffixText(spec.suffix), tail = cps(level) + cps(suffix);
  let star = spec.star ? '★ ' : '', name = spec.track;
  const total = () => cps(star) + cps(name) + tail;
  if (total() > MAX_GOAL_LEN) star = '';
  if (total() > MAX_GOAL_LEN && SHORT_NAME[name]) name = SHORT_NAME[name];
  if (total() > MAX_GOAL_LEN) { const k = Math.max(0, MAX_GOAL_LEN - tail - 1); name = [...name].slice(0, k).join('') + '…'; }
  const aria = `${spec.star ? 'best buy, ' : ''}${spec.track} level ${spec.n}${suffixAria(spec.suffix)}`;
  return { star, name, level, suffix, text: star + name + level + suffix, aria };
}
/** Milestone text when level n is a milestone the player gets now (config levels; Egg value grade only if its Farm gate is met). */
export function trackMilestone(t: 'hens' | 'eggValue', n: number, F: number, b: Balance): string | null {
  const M = b.m4!.milestones;
  if (t === 'hens') return M.hens.some(m => m.level === n) ? 'bigger coop' : null;
  const i = M.grades.findIndex(g => g.level === n && F >= g.minFarm);
  return i >= 0 ? GRADE_NAMES[i] : null;
}
/** Spec for the strip's HENS / VALUE / COLL target (M4 on). `star` = bestBuyMark(...) === key. */
export function goalLabelSpec(key: 'HENS' | 'VALUE' | 'COLL', s: GameState, b: Balance, star: boolean): GoalLabelSpec {
  if (key === 'COLL') { const C = s.collectionLevel; return { track: 'Collection', n: C + 1, star, suffix: { kind: 'tap', d: eggsPerTap(C + 1, b) - eggsPerTap(C, b) } }; }
  const t = key === 'HENS' ? 'hens' : 'eggValue', n = (t === 'hens' ? s.hensLevel : s.eggValueLevel) + 1;
  const ms = trackMilestone(t, n, s.farmLevel, b);
  return { track: t === 'hens' ? 'Hens' : 'Egg value', n, star,
    suffix: ms ? { kind: 'milestone', text: ms } : { kind: 'pct', x: bestRoiDelta(s, b, key)?.x ?? null } };
}
/** ONE source for "best buy" (strip ★ and UX-M4 row chip): the shared best_roi pick (ui/pick-hysteresis DualPicker
 *  hint = econ/best-buy bundle payback) when it is affordable (UX-M4: "the single best value-per-cost affordable row"). */
export const bestBuyMark = (pick: { key: BuyKey; affordable: boolean } | null | undefined): BuyKey | null =>
  pick?.affordable ? pick.key : null;
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Strip markup (art file): only .ng-name may ellipsise; .ng-star / .ng-lv / .ng-sfx are flex:none + nowrap. */
export const goalLabelHtml = (p: GoalLabelParts) =>
  `${p.star ? `<span class="ng-star" aria-hidden="true">${esc(p.star)}</span>` : ''}<span class="ng-name">${esc(p.name)}</span><span class="ng-lv">${esc(p.level)}</span>${p.suffix ? `<span class="ng-sfx">${esc(p.suffix)}</span>` : ''}`;
