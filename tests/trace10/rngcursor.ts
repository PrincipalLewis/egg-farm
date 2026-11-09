// trace10 RNG cursors (design §7). Pure reads only: nothing here draws from a live stream.
// - engine (state.rng, xorshift32): draws between two observed cursors = replay of the pure nextRand (state.ts) until equal (cap).
// - variance V (PyRandom MT19937): cursor = mti + sha256(mt). mt/mti are TS-private (not #private): read at runtime, guarded.
// - runner R: counted only through the onRunnerDraw hook (§2.2 / G-1). Without the hook the count is UNMEASURED, never 0.
import { nextRand } from '../../src/sim/state';
import type { PyRandom } from '../py-random';
import type { SellerVariance } from '../seller-variance';
import { sha256 } from './encode';

export const ENGINE_REPLAY_CAP = 1_000_000;
export class RngCursorError extends Error {}
/** Exact number of nextRand steps from `prev` to `cur` (0 if equal). Not found within `cap` -> RngCursorError (INVALID). */
export function engineDraws(prev: number, cur: number, cap = ENGINE_REPLAY_CAP): number {
  let x = prev >>> 0; const target = cur >>> 0;
  for (let n = 0; n <= cap; n++) { if (x === target) return n; x = nextRand(x)[0]; }
  throw new RngCursorError(`engine cursor ${cur} not reachable from ${prev} within ${cap} nextRand steps`);
}
export interface PyCursor { mti: number; mtSha: string }
/** Fails closed if py-random.ts changes the private field layout (§7, R-2). */
export function pyCursor(r: PyRandom): PyCursor {
  const o = r as unknown as { mt?: unknown; mti?: unknown };
  if (!(o.mt instanceof Uint32Array) || o.mt.length !== 624 || typeof o.mti !== 'number' || !Number.isInteger(o.mti))
    throw new RngCursorError('PyRandom private fields mt (Uint32Array[624]) / mti (int) not found: py-random.ts changed');
  return { mti: o.mti, mtSha: sha256(new Uint8Array(o.mt.buffer, o.mt.byteOffset, o.mt.byteLength)) };
}
export const varianceCursor = (V: SellerVariance): PyCursor => pyCursor(V.r);
/** Runner R measurement status. 'measured' only when the hook was wired and reported (even 0 draws). */
export type RunnerStatus = { status: 'measured'; draws: number } | { status: 'UNMEASURED_NO_HOOK' };
