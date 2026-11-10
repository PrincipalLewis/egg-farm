/**
 * Pause §12 telemetry helper (Saves #132). The pre-pause field sampler shared by worker_paused (sim/pause.ts pauseWorker, the one
 * emitter; rc2Refill = 0) and rest_toggled{on:true} (Refill, rc2Refill = 1; G0-API §2). Pure; no state change.
 */
import type { Balance } from '../config/balance';
import { abilityActive } from './abilities';
import type { GameState } from './state';
import { mood, type WorkerId, type WorkerMood } from './workers';
/** pause §12 v1.3.12/v1.3.15/v1.3.18 (HoE H-1): sampled from the state BEFORE the pause on the pause tick. golden_on_screen = a golden
 *  egg is on screen; frenzy_active = frenzyRemainingS > 0; ability_active = the worker's call is running. `id` must be hired. */
export function pauseToggleFields(s: GameState, id: WorkerId, b: Balance): { farm: number; mood: WorkerMood; unpaid: boolean; ability_active: boolean; golden_on_screen: boolean; frenzy_active: boolean } {
  const w = s.workers[id]!;
  return { farm: s.farmLevel, mood: mood(w, b)!, unpaid: w.unpaid === true, ability_active: abilityActive(s, b, id),
    golden_on_screen: s.goldenEgg !== undefined, frenzy_active: (s.frenzyRemainingS ?? 0) > 0 };
}
