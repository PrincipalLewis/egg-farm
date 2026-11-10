/**
 * #5b Rule 4: fatigue goal bubble (sales-stopped-spec cfff3817 §4.8 Rule 4, SS-26). In the #goal slot, ahead of buy goals, while the
 * sim's Rule 2 state is shown (fatigueCueView.shown; same thresholds/hysteresis, computed by the sim). The stall chip still wins (§4.7).
 * Display only: bestBuy and the goal picker are untouched. X = Σ workerAtRisk (Saves' helper; the local stub until it lands).
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { fmtMoneyShort } from './format';
import { fatigueCueView, workersAtRisk } from './stall-api';
import { DOT } from './stall-chip';

/** fatigueLoss in cents/s (never negative). */
export const fatigueLossCents = (s: GameState, b: Balance) => Math.max(0, Object.values(workersAtRisk(s, b)).reduce((a, x) => a + x, 0)) * 100;
export interface FatigueBubble { text: string; desc: string }
export function fatigueBubble(s: GameState, b: Balance): FatigueBubble | null {
  const v = fatigueCueView(s, b); if (!v.shown || v.suppressedByStall) return null;
  const x = fmtMoneyShort(fatigueLossCents(s, b), { round: 'floor' });
  // Visible copy is Art-approved (`Refill workers · +$X/s`); the description sentence is lane U's draft, pending Art sign-off.
  return { text: `Refill workers${DOT}+${x}/s`, desc: `Next goal: refill workers, plus ${x} per second.` };
}
