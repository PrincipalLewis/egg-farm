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
import { bbFallbackActive, breedsFlagOn, hatchPriceNowCents, hatchTargetEligible } from './breeds-adapter';

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
