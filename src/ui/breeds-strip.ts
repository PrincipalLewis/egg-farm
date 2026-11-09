/**
 * M5.1 Breeds UI PR-B — best-buy strip Hatch target (BR-BB4 L535-540; BR-AC23b / 23c L900-901). Seams: PR-B owns `breeds-strip-*`.
 *
 * A pure `Goal → Goal` transform applied to BB-5's strip pick. It returns the SAME object (so the strip output is byte-identical,
 * BR-AC23c) unless ALL hold: flag on, BB-5's fallback branch is active (no meaningful row offered, BR-BB4 (b)), the flock is
 * incomplete, the incubator idle and something can hatch. A hatch is never a BuyKey / picker input and never gets ★, the hint
 * or the highlight (BR-BB1): the substituted goal has key null, no `parts`, and a `breedsTarget: 'hatch'` marker so the tap
 * opens the Flock sheet (PR-A) instead of a Buy row.
 *
 * Dependency: the fallback predicate is BBv2's (#100, unmerged). Until it lands `bbFallbackActive` is a stub → false, so the
 * strip keeps its current target (BR-BB4 (d), the M5.0 stopgap).
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import type { Goal, GoalState } from './next-goal';
import { spokenDuration } from './next-goal';
import { fmtMoney, fmtMoneyAria, fmtTimeToAfford } from './format';
import { bbFallbackActive, breedsFlagOn, hatchPriceNowCents, hatchTargetEligible, incomeCentsPerSec } from './breeds-adapter';

export const STRIP_HATCH_PREFIX = 'Hatch · ';
/** Free-hatch word, same as the sheet's Hatch button (BR-R6, BR-AC31a). */
export const STRIP_FREE_WORD = 'Free';
/** BB-5 countdown wording for the unaffordable target ("Hatch · in Xs", BR-BB4 (c)); the time is BB-5's fmtTimeToAfford. */
export const STRIP_IN_WORD = 'in ';

export type BreedsGoal = Goal & { breedsTarget?: 'hatch'; aria?: string };

export function breedsStripGoal(goal: Goal, s: GameState, b: Balance, rateCentsPerS: number, fallback = bbFallbackActive(s, b)): Goal {
  if (!breedsFlagOn(b) || !fallback || !hatchTargetEligible(s, b)) return goal;
  const cost = hatchPriceNowCents(s, b), coins = Math.round(s.coinsCents);
  const state: GoalState = coins >= cost ? 'ready' : rateCentsPerS > 0 ? 'waiting' : 'noincome';
  const eta = state === 'waiting' ? fmtTimeToAfford((cost - coins) / rateCentsPerS) : fmtTimeToAfford(null);
  const label = state === 'ready' ? STRIP_HATCH_PREFIX + (cost === 0 ? STRIP_FREE_WORD : fmtMoney(cost)) : STRIP_HATCH_PREFIX + STRIP_IN_WORD + eta;
  const priceAria = cost === 0 ? STRIP_FREE_WORD : fmtMoneyAria(cost);
  const aria = `Next goal: Hatch, ${priceAria}. ${state === 'ready' ? 'Ready now.' : state === 'noincome' ? 'Sell eggs to earn coins.' : `Ready in about ${spokenDuration(eta)}.`}`;
  const out: BreedsGoal = { key: null, state, label, status: state === 'ready' ? 'Ready!' : '', costCents: cost, tab: goal.tab, breedsTarget: 'hatch', aria };
  return out;
}

// ---- DOM mount on the rc/v5 `#goal` strip (registry path; no app.ts edit) ----------------------------------------------------
/**
 * PR-A's extenders run right after `renderGoal()` in the same frame (app.ts render(): renderGoal → flock.syncEntry → onSync),
 * so the mount re-applies the Hatch target after BB-5 wrote its own. While inactive it never writes (flag on, no fallback =
 * the strip DOM is exactly BB-5's). On deactivation it restores the last BB-5 DOM it saw, so the strip is BB-5's again on that
 * frame (BR-AC23c). A tap on the Hatch target opens the Flock sheet (`onOpenFlock`) instead of BB-5's Buy row.
 */
export interface BbStripMount { sync(s: GameState): void; dispose(): void; readonly active: boolean; }
interface Snap { lbl: string; html: string | undefined; ng: boolean; st: string; chip: boolean; state: string | undefined; desc: string }

export function mountBbStrip(o: { doc: Document; b: Balance; fallback?: (s: GameState, b: Balance) => boolean;
  rate?: (s: GameState, b: Balance) => number; onOpenFlock?: () => void }): BbStripMount | null {
  if (!breedsFlagOn(o.b)) return null;
  const doc = o.doc, fallback = o.fallback ?? bbFallbackActive, rate = o.rate ?? incomeCentsPerSec;
  let snap: Snap | null = null, wrote: Snap | null = null, btn: HTMLElement | null = null;
  const els = () => {
    const goal = doc.getElementById('goal'); if (!goal) return null;
    const lbl = goal.querySelector<HTMLElement>('.goal-label'), st = goal.querySelector<HTMLElement>('.goal-status'), desc = doc.getElementById('goalDesc');
    return lbl && st && desc ? { goal, lbl, st, desc } : null;
  };
  const read = (e: NonNullable<ReturnType<typeof els>>): Snap => ({ lbl: e.lbl.innerHTML, html: e.lbl.dataset.html, ng: e.lbl.classList.contains('ng'),
    st: e.st.textContent ?? '', chip: e.st.classList.contains('chip'), state: e.goal.dataset.state, desc: e.desc.textContent ?? '' });
  const same = (a: Snap, c: Snap) => JSON.stringify(a) === JSON.stringify(c);
  const write = (e: NonNullable<ReturnType<typeof els>>, x: Snap) => {
    if (e.lbl.innerHTML !== x.lbl) e.lbl.innerHTML = x.lbl;
    if (x.html === undefined) delete e.lbl.dataset.html; else e.lbl.dataset.html = x.html;
    e.lbl.classList.toggle('ng', x.ng); if (e.st.textContent !== x.st) e.st.textContent = x.st; e.st.classList.toggle('chip', x.chip);
    if (x.state === undefined) delete e.goal.dataset.state; else e.goal.dataset.state = x.state;
    if (e.desc.textContent !== x.desc) e.desc.textContent = x.desc;
  };
  const onClick = (ev: Event) => { if (!snap) return; ev.stopImmediatePropagation(); ev.preventDefault(); o.onOpenFlock?.(); };
  const deactivate = (e: ReturnType<typeof els>) => {
    if (e && snap) { write(e, snap); delete e.goal.dataset.breedsTarget; }
    snap = wrote = null;
  };
  return {
    sync(s) {
      const e = els(); if (!e) return;
      if (!btn) { btn = e.goal; btn.addEventListener('click', onClick, true); }
      const g = breedsStripGoal(PLACEHOLDER_GOAL, s, o.b, rate(s, o.b), fallback(s, o.b)) as BreedsGoal;
      if (g === PLACEHOLDER_GOAL) { deactivate(e); return; }
      const cur = read(e);
      if (!snap || !wrote || !same(cur, wrote)) snap = cur; // BB-5 (re)wrote the strip this frame: that's what we restore later
      const x: Snap = { lbl: escapeHtml(g.label), html: undefined, ng: false, st: g.status, chip: g.state === 'ready', state: g.state, desc: g.aria ?? '' };
      write(e, x); e.goal.dataset.breedsTarget = 'hatch'; wrote = read(e);
    },
    dispose() { deactivate(els()); btn?.removeEventListener('click', onClick, true); btn = null; },
    get active() { return !!snap; },
  };
}
const PLACEHOLDER_GOAL: Goal = { key: null, state: 'done', label: '', status: '', costCents: 0, tab: 'workers' };
const escapeHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
