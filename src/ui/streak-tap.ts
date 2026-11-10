/**
 * v5 streak / tapCoins: the two collect-path rules app.ts applies (HoE ruling 2026-11-10: app.ts in scope for these hunks).
 * - R2/R3 (m5-streak-tap-coins-spec v1.3.3 §3.1): a synthetic click (`isTrusted === false`) or a click from a held key
 *   (`keydown.repeat`) is not a player tap. Only while m4.flags.streak or tapCoins is on; flags off = rc1 (never filtered).
 * - R16 / CT-AC6 (combo-tiers v0.3 §1): the credited-tap `egg.collect` plays at +k semitones after tier k (k <= tier count, MAX = +4);
 *   uncounted taps and streak off = base pitch (semi 0). The pitch goes through F6 v1.0 `Audio.playFile(file, minGapMs, semi, hook)`
 *   (playbackRate 2^(semi/12), logged in eggfarmQa.audio.log). Until F6 merges, Audio has no playFile: the collect plays unpitched.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { streakTier } from '../sim/streak';
import { streakUiOn, tapCoinUiOn } from './streak-flags';
import { SFX, type Audio } from './audio';

/** True when this collect click must be ignored (R2/R3). `detail === 0` = a keyboard-generated click (Enter/Space). */
export const tapIgnored = (b: Balance, e: { isTrusted: boolean; detail?: number }, keyRepeat: boolean): boolean =>
  (streakUiOn(b) || tapCoinUiOn(b)) && (!e.isTrusted || (keyRepeat && !e.detail));

/** The collect pitch in semitones for this tap: the tier after a credited tap with the streak on (MAX = tier count), else 0. */
export const collectSemi = (s: Pick<GameState, 'streakS'>, b: Balance, credited: boolean | undefined): number =>
  streakUiOn(b) && credited === true ? streakTier(Math.max(0, s.streakS ?? 0), b) : 0;

/** F6 v1.0 Audio surface used for the pitched collect (absent on rc/v5 before F6 merges). */
type PitchAudio = Pick<Audio, 'play'> & { playFile?(f: string, minGapMs?: number, semi?: number, hook?: string): boolean };
/** Plays the Collect sound: semi 0 or no playFile = exactly `audio.play('collect')` (rc1 path); else the F6 pitched source. */
export function playCollect(audio: PitchAudio, semi: number): void {
  if (semi && audio.playFile) audio.playFile(SFX.collect, undefined, semi, 'collect'); else audio.play('collect');
}
