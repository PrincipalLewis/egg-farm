/**
 * v1.3.3 R5g / GE-AC44: THE one pure goldenFrozen(s, b) predicate (product/collection/m5-golden-egg-spec.md v1.3.3,
 * sha1 2eb630e398686f4c81e9650684de18af21d00a3d; D-HOP-33/34, D-HOP-41). True iff m4.flags.pause is on, F >=
 * tc_pause_unlock_farm, and at least one hired worker (any role, including the Grader) is isPaused. The golden flag
 * is not required (G5-P and the pause path can call this with golden off). Every consumer — goldenTick, frenzyTick,
 * frenzyFactor, tapGolden, spawnDue, telemetry — imports this function. Worker.paused is read only through isPaused
 * (F3 QA-10).
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { tcNum } from '../config/formulas';
import type { GameState } from './state';
import { WORKERS } from './workers';
import { isPaused } from './pause';

export function goldenFrozen(s: GameState, b: Balance): boolean {
  if (!flagOn(b, 'pause') || s.farmLevel < tcNum(b, 'pause_unlock_farm')) return false;
  return WORKERS.some(id => isPaused(s.workers[id], b));
}
