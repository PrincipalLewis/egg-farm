/**
 * Pause §12 telemetry (Saves, HoE/v5-worker-paused): THE one worker_paused emitter. The sim emits it on the Pause transition, never
 * the UI. pauseWorker (sim/pause.ts) stays the pure transition; callers with a sink (sim/actions.ts `pause`) go through
 * pauseWorkerEmit, so exactly one event is logged per real transition and none for a no-op (flag off, below the unlock, not hired,
 * already paused). worker_resumed{cause} is emitted by sim/pause.ts resumeWorker (#119).
 * Exclusive emission (pause v1.3.11 §4/§12, D-PMW-2026-10-30-10, D-HOE-20261030-17/-18; G0-API §2/§9): with rc2Refill = 1 the
 * toggle belongs to rest_toggled{on:true} (Refill), so nothing is emitted here; the state change is the same.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { abilityActive } from './abilities';
import { pauseWorker } from './pause';
import type { Sink } from './events';
import type { GameState } from './state';
import { mood, type WorkerId, type WorkerMood } from './workers';
/** The pre-pause fields shared by worker_paused and rest_toggled{on:true} (pause §12 v1.3.12/v1.3.15/v1.3.18; HoE H-1):
 *  sampled from the state BEFORE the pause on the pause tick. golden_on_screen = a golden egg is on screen; frenzy_active =
 *  frenzyRemainingS > 0. `id` must be hired (callers check). */
export function pauseToggleFields(s: GameState, id: WorkerId, b: Balance): { farm: number; mood: WorkerMood; unpaid: boolean; ability_active: boolean; golden_on_screen: boolean; frenzy_active: boolean } {
  const w = s.workers[id]!;
  return { farm: s.farmLevel, mood: mood(w, b)!, unpaid: w.unpaid === true, ability_active: abilityActive(s, b, id),
    golden_on_screen: s.goldenEgg !== undefined, frenzy_active: (s.frenzyRemainingS ?? 0) > 0 };
}
/** Integer 0..100 (HoE field types: energy_pct is an integer percent). */
const pct = (e: number) => Math.min(100, Math.max(0, Math.round(e)));
/** Pause `id` (pauseWorker) and, on a real transition with rc2Refill = 0, push one worker_paused. A no-op returns the same state
 *  and pushes nothing, so pause = 0 is byte-identical (no event, no state change; AC-P1/E13). */
export function pauseWorkerEmit(s: GameState, id: WorkerId, b: Balance, ev?: Sink): GameState {
  const out = pauseWorker(s, id, b);
  if (out === s || flagOn(b, 'rc2Refill')) return out;
  const f = pauseToggleFields(s, id, b);
  ev?.push({ type: 'worker_paused', worker: id, farm: f.farm, energy_pct: pct(s.workers[id]!.energy), mood: f.mood, unpaid: f.unpaid,
    ability_active: f.ability_active, golden_on_screen: f.golden_on_screen, frenzy_active: f.frenzy_active });
  return out;
}
