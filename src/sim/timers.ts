/**
 * v5 F1b: one stepTimers() sub-call per M5 system (engineering/m5.0-sizing.md §4 hotspot 4). Runs at the END of step(),
 * after the rc1 tick order (AC3), and ONLY when an M5 flag is on: with every m4.flags.* off, step() is byte-identical.
 * Each feature PR (golden #1, streak #2, income-ref #3, abilities #4, Broody #5) appends one TimerSystem to TIMER_SYSTEMS.
 */
import type { Balance } from '../config/balance';
import { M5_FLAGS, flagOn, evRngFlagOn } from '../config/flags';
import type { Sink } from './events';
import type { GameState } from './state';
import { tickFocusS, type StepClock } from './clock';
import { ensureEvRng } from './rng';
import { streakTick } from './streak';
import { ensureBreeds } from './breeds';
/** dt = sim seconds of this tick; focusS = focus seconds of this tick (dt or 0). */
export type TimerSystem = (s: GameState, dt: number, focusS: number, b: Balance, clock: StepClock | undefined, ev?: Sink) => GameState;
/** Seeds evRngState once on the first tick golden or broody is on (D-C2, Q4 ruling). Never touches state.rng.
 *  Q-F1b-1, ruled D-HOP-2026-10-29-06: seeded at the END of the first flag-on tick (stepTimers runs last in step()), i.e. AFTER
 *  that tick's customer draws on state.rng; for initialState that equals GE-AC33's mixSeed(mixSeed(seed) ^ salt). This is the
 *  only seeding path (save/m5-fields.ts re-exports ensureEvRng from sim/rng.ts). */
const seedEvRng: TimerSystem = (s, _dt, _f, b) => (evRngFlagOn(b) ? ensureEvRng(s) : s);
/** #2 streak (R6/R7/R12): hold, then decay on focus seconds; K18 cap clamp. Identity unless m4.flags.streak. */
const streak: TimerSystem = (s, dt, f, b, _c, ev) => streakTick(s, dt, f, b, ev);
/** M5.1 breeds (tick-semantics note point 1): Q2 creates `breeds` at the end of the first flag-on tick. PR B adds the
 *  settle/incubator countdown to this same system. Identity unless m4.flags.breeds. */
const breeds: TimerSystem = (s, _dt, _f, b) => ensureBreeds(s, b);
export const TIMER_SYSTEMS: readonly TimerSystem[] = [seedEvRng, streak, breeds];
export const anyM5FlagOn = (b: Balance) => M5_FLAGS.some(f => flagOn(b, f));
export function stepTimers(s: GameState, dt: number, b: Balance, clock?: StepClock, ev?: Sink, systems: readonly TimerSystem[] = TIMER_SYSTEMS): GameState {
  const f = tickFocusS(dt, clock);
  for (const sys of systems) s = sys(s, dt, f, b, clock, ev);
  return s;
}
