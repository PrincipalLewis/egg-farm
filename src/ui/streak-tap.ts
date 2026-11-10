/**
 * v5 streak / tapCoins: the two collect-path rules app.ts applies (HoE ruling 2026-11-10: app.ts in scope for these hunks).
 * - R2/R3 (m5-streak-tap-coins-spec v1.3.3 §3.1): a synthetic click (`isTrusted === false`) or a click from a held key
 *   (`keydown.repeat`) is not a player tap. Only while m4.flags.streak or tapCoins is on; flags off = rc1 (never filtered).
 * - R16 / CT-AC6 (combo-tiers v0.3 §1): the credited-tap `egg.collect` plays at +k semitones after tier k (k <= tier count, MAX = +4),
 *   playbackRate = 2^(k/12); uncounted taps and streak off = base pitch (rate 1).
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { streakTier } from '../sim/streak';
import { streakUiOn, tapCoinUiOn } from './streak-flags';

/** Equal temperament: semitones per octave (playbackRate = 2^(st / 12)). Math, not a tunable. */
const ST_PER_OCTAVE = 12;

/** True when this collect click must be ignored (R2/R3). `detail === 0` = a keyboard-generated click (Enter/Space). */
export const tapIgnored = (b: Balance, e: { isTrusted: boolean; detail?: number }, keyRepeat: boolean): boolean =>
  (streakUiOn(b) || tapCoinUiOn(b)) && (!e.isTrusted || (keyRepeat && !e.detail));

/** The collect sfx playbackRate for this tap: 2^(tier/12) on a credited tap with the streak on, else 1. */
export const collectRate = (s: Pick<GameState, 'streakS'>, b: Balance, credited: boolean | undefined): number =>
  streakUiOn(b) && credited === true ? 2 ** (streakTier(Math.max(0, s.streakS ?? 0), b) / ST_PER_OCTAVE) : 1;
