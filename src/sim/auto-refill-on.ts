/** STUB of Refill's pure per-worker read (G0-API.md rev 9 / D-HOE-61).
 *  Real export lands in `src/sim/refill.ts` (#133 G2): `autoRefillOn(s, id, b): boolean` (the switch; false when rc2Refill=0).
 *  Swap: in clock-wage.ts change `from './auto-refill-on'` to `from './refill'`, then delete this file.
 *  Default is always false, so flag-off (and autoRefill=1 with no Refill sim) stays byte-identical. */
import type { Balance } from '../config/balance';
import type { GameState } from './state';
import type { WorkerId } from './workers';

type AutoRefillOn = (s: GameState, id: WorkerId, b: Balance) => boolean;
let stub: AutoRefillOn | null = null;

export function autoRefillOn(s: GameState, id: WorkerId, b: Balance): boolean {
  return stub ? stub(s, id, b) : false;
}

/** Test-only. Pass null to restore the default (always false). Drop with this file at the #133 G2 swap. */
export function stubAutoRefillOn(fn: AutoRefillOn | null): void { stub = fn; }
