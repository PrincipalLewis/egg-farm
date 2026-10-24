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
/** Rendered pieces: star + name may shrink (JS steps 1-3; CSS only ever ellipsises .ng-name); level + suffix never cut.
 *  `aria` = the F4-14 spelled-out phrase (no `Next goal:` / status; next-goal.ts goalAria adds those) — since v1.25 F4-14a it
 *  is the strip's accessible DESCRIPTION. `name` = the accessible NAME: the visible DOM text without the aria-hidden ★
 *  and without a JS `…` (also aria-hidden in goalLabelHtml). */
export interface GoalLabelParts { star: string; name: string; level: string; suffix: string; text: string; aria: string; accName: string }

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
/** Raw integer (F4-9 / F4-16 fixtures) unless `compact`: the n3 last resort, used only when the label is still over 27
 *  with the name already collapsed to `…` (unreachable on shipped data: X ≤ 999 and Δtap ≤ 5). 1234567 → 1.2M. */
export function compactNum(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const a = Math.abs(v); if (a < 1e4) return String(v);
  if (a >= 1e15) return v.toExponential(0).replace('+', '');
  const [d, u] = a >= 1e12 ? [1e12, 'T'] : a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : [1e3, 'K'];
  const q = Math.floor((v / d) * 10) / 10; // floor, like F4-9: never overstate
  return `${q >= 100 ? Math.floor(q) : q}${u}`;
}
const suffixText = (sf: GoalSuffix, compact = false) => { const n = (v: number) => compact ? compactNum(v) : String(v);
  return sf.kind === 'milestone' ? `: ${sf.text}`
  : sf.kind === 'tap' ? `: +${n(sf.d)}/tap`
  : sf.x === null ? '' : `${NBSP}·${NBSP}+${typeof sf.x === 'number' ? n(sf.x) : sf.x}% income`; };
const suffixAria = (sf: GoalSuffix) => sf.kind === 'milestone' ? `, ${sf.text}`
  : sf.kind === 'tap' ? `, plus ${sf.d} per tap`
  : sf.x === null ? '' : sf.x === '<1' ? ', plus less than 1 percent income' : `, plus ${sf.x} percent income`;
/** Truncation (art file + §18), applied in order only while over 27 code points: 1 drop `★ `; 2 short name;
 *  3 ellipsis (U+2026, counts 1) on the track name, keeping the largest prefix that fits. Level + suffix never cut. */
export function goalLabelParts(spec: GoalLabelSpec): GoalLabelParts {
  const level = `${NBSP}L${spec.n}`;
  let suffix = suffixText(spec.suffix), tail = cps(level) + cps(suffix);
  let star = spec.star ? '★ ' : '', name = spec.track;
  const total = () => cps(star) + cps(name) + tail;
  if (total() > MAX_GOAL_LEN) star = '';
  if (total() > MAX_GOAL_LEN && SHORT_NAME[name]) name = SHORT_NAME[name];
  if (total() > MAX_GOAL_LEN) {
    // n3: k = 0 means level + suffix alone fill 26+ code points; the name is then just `…`. Level and suffix are never cut,
    // so for absurd X / Δtap (unreachable on shipped data) the number itself is shown compact (step 4) to stay ≤ 27.
    if (tail + 1 > MAX_GOAL_LEN) { suffix = suffixText(spec.suffix, true); tail = cps(level) + cps(suffix); }
    const k = Math.max(0, MAX_GOAL_LEN - tail - 1); name = [...name].slice(0, k).join('') + '…';
  }
  const aria = `${spec.star ? 'best buy, ' : ''}${spec.track} level ${spec.n}${suffixAria(spec.suffix)}`;
  const accName = (name.endsWith('…') ? name.slice(0, -1) : name) + level + suffix;
  return { star, name, level, suffix, text: star + name + level + suffix, aria, accName };
}
/** Milestone text when level n is a milestone the player gets now (config levels; Egg value grade only if its Farm gate is met). */
export function trackMilestone(t: 'hens' | 'eggValue', n: number, F: number, b: Balance): string | null {
  const M = b.m4!.milestones;
  if (t === 'hens') return M.hens.some(m => m.level === n) ? 'bigger coop' : null;
  const i = M.grades.findIndex(g => g.level === n && F >= g.minFarm);
  return i >= 0 ? GRADE_NAMES[i] : null;
}
/** Spec for the strip's HENS / VALUE / COLL target (M4 on). `star` = bestBuyMark(...) === key. */
/** `incomeNow` = the strip's rolling income/s (cents) > 0; false hides the % (F4-11: income/s now = 0, fresh save before
 *  the first sale), even though best_roi's working-model base is never 0. Default true (pure callers / tests). */
export function goalLabelSpec(key: 'HENS' | 'VALUE' | 'COLL', s: GameState, b: Balance, star: boolean, incomeNow = true): GoalLabelSpec {
  if (key === 'COLL') { const C = s.collectionLevel; return { track: 'Collection', n: C + 1, star, suffix: { kind: 'tap', d: eggsPerTap(C + 1, b) - eggsPerTap(C, b) } }; }
  const t = key === 'HENS' ? 'hens' : 'eggValue', n = (t === 'hens' ? s.hensLevel : s.eggValueLevel) + 1;
  const ms = trackMilestone(t, n, s.farmLevel, b);
  return { track: t === 'hens' ? 'Hens' : 'Egg value', n, star,
    suffix: ms ? { kind: 'milestone', text: ms } : { kind: 'pct', x: incomeNow ? bestRoiDelta(s, b, key)?.x ?? null : null } };
}
/** ONE source for "best buy" (strip ★ and UX-M4 row chip): the shared best_roi pick (ui/pick-hysteresis DualPicker
 *  hint = econ/best-buy bundle payback) when it is affordable (UX-M4: "the single best value-per-cost affordable row"). */
export const bestBuyMark = (pick: { key: BuyKey; affordable: boolean } | null | undefined): BuyKey | null =>
  pick?.affordable ? pick.key : null;
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Strip markup (art file): only .ng-name may ellipsise; .ng-star and .ng-tail (.ng-lv + .ng-sfx) are flex:none + nowrap.
 *  F4-14a: ★ and a JS `…` are aria-hidden, so the name computed from content = parts.accName. Level + suffix share ONE flex
 *  item (.ng-tail, inline children): Chromium's accname puts a space between flex items, which turned `L5: Grade A` into
 *  `L5 : Grade A` in the name; inside one inline run they stay exactly as shown. */
export const goalLabelHtml = (p: GoalLabelParts) =>
  `${p.star ? `<span class="ng-star" aria-hidden="true">${esc(p.star)}</span>` : ''}<span class="ng-name">${p.name.endsWith('…') ? `${esc(p.name.slice(0, -1))}<span aria-hidden="true">…</span>` : esc(p.name)}</span><span class="ng-tail"><span class="ng-lv">${esc(p.level)}</span>${p.suffix ? `<span class="ng-sfx">${esc(p.suffix)}</span>` : ''}</span>`;
