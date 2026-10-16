/**
 * S2-4a: what a tap does is decided from the CURRENT game state, never from the button's (possibly stale)
 * aria-disabled. An action that is a no-op in the sim (unaffordable, maxed, cooldown, nothing to sell) is never
 * dispatched, so it cannot touch money, emit events, or trigger a save.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { apply, type Action } from '../sim/actions';
/** True when `a` would change the state (apply() returns the same object for every rejected action). */
export const wouldApply = (s: GameState, a: Action, b: Balance) => apply(s, a, b) !== s;
/** Dispatches `a` only if it would apply. Returns whether it was dispatched. */
export function tryDispatch(g: { state: GameState; dispatch(a: Action): void }, a: Action, b: Balance): boolean {
  if (!wouldApply(g.state, a, b)) return false;
  g.dispatch(a); return true;
}
