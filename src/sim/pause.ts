/**
 * v5 F3 (HoE, manifest row 8): THE one read of Worker.paused (m5-worker-pause-spec; sizing §9.2 G3: `paused` is an orthogonal
 * flag, not a 5th mood). False whenever m4.flags.pause is 0 (or m4.enabled is 0), so a stray `paused: true` (old save, QA
 * setter) has no effect with the flag off. Every src read of `paused` goes through here (tests/v5-f3-is-paused.test.ts greps).
 * Saves' Pause sim and UI's QA setter read it through this selector too.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import type { Worker } from './workers';
export const isPaused = (w: Worker | undefined, b: Balance): boolean => !!w && w.paused === true && flagOn(b, 'pause');
/** CCR-F4 load sanitiser (pause spec E9 "non-boolean = false", rule 1/E12 "below the unlock: not paused"): drops `paused` unless it is a
 *  boolean and the farm is at or above tc_pause_unlock_farm (`open`). The same object when nothing changes. Called by save/m5-fields.ts m5Load. */
export const sanitizePausedOnLoad = (w: Worker, open: boolean): Worker => { if (!('paused' in w) || (open && typeof w.paused === 'boolean')) return w; const { paused: _p, ...rest } = w; return rest; };
