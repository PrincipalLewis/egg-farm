/**
 * #5b Rule 4: fatigue goal bubble (sales-stopped-spec cfff3817 §4.8 Rule 4, SS-26). In the #goal slot, ahead of buy goals, while the
 * sim's Rule 2 state is shown (fatigueCueView.shown; same thresholds/hysteresis, computed by the sim). The stall chip still wins (§4.7).
 * Display only: bestBuy and the goal picker are untouched. X = Σ workerAtRisk (Saves' helper).
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { fmtMoneyShort } from './format';
import { fatigueCueView, workersAtRisk } from './stall-api';
import { DOT, rc2RefillOn } from './stall-chip';

/** fatigueLoss in cents/s (never negative). */
export const fatigueLossCents = (s: GameState, b: Balance) => Math.max(0, Object.values(workersAtRisk(s, b)).reduce((a, x) => a + x, 0)) * 100;
/** Art (HoAUX): describedby for the Rule 4 bubble, both rc2Refill values. */
export const RULE4_DESC = 'Tired workers earn less. Tap to manage.';
export interface FatigueBubble { text: string; desc: string }
export function fatigueBubble(s: GameState, b: Balance): FatigueBubble | null {
  const v = fatigueCueView(s, b); if (!v.shown || v.suppressedByStall) return null;
  const x = fmtMoneyShort(fatigueLossCents(s, b), { round: 'floor' });
  // D-HOP-2026-11-10-22: rc2Refill = 1 -> `Manage workers · +$X/s`, else `Refill workers · +$X/s` (NBSP both sides of ·).
  // HoAUX: accessible name = visible text (no aria-label); describedby is the same for both rc2Refill values (cfff3817 §4.7 L193).
  const verb = rc2RefillOn(b) ? 'Manage' : 'Refill';
  return { text: `${verb} workers${DOT}+${x}/s`, desc: RULE4_DESC };
}
