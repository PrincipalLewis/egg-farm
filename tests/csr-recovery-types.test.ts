/** M41-7 (spec v0.3.3 FROZEN sha256 bca075fea10f7fb973f56dad941870229129738a52846fea72bf2146050bae9c), HoE: Saves' exported
 *  Recovery must match UI's local CsrRecovery (src/ui/save-recovery.ts @ 66680eb, PR #58) exactly. Its declaration is
 *  imported from UI's file after the #58 integration merge (f35cda5); checked by tsc (tests are in tsconfig).
 *  Spec of record: corrupt-save-recovery-spec.m41-final.md sha256 6131c290bf0a6878026ad6c53a9ed71754f00fdf9b2e9c09ee8afc242433334d. */
import { describe, it, expect } from 'vitest';
import type { Recovery, RecoverySource } from '../src/save/save';

import type { CsrRecovery, RecoverySource as UiRecoverySource } from '../src/ui/save-recovery';
/** Exact type equality (fails on any extra/missing/widened field, optionality or readonly difference). */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const assert = <T extends true>(v: T) => v;
// Field-by-field equality on the keys UI declares (the alias test proper).
type Ui = Pick<CsrRecovery, 'case' | 'source' | 'store' | 'prevLevel' | 'restoredLevel' | 'restoredSavedAt'>;
type Sv = Pick<Recovery, 'case' | 'source' | 'store' | 'prevLevel' | 'restoredLevel' | 'restoredSavedAt'>;
export const typeChecks = [
  assert<Equals<RecoverySource, UiRecoverySource>>(true),
  assert<Equals<Ui, Sv>>(true),
  assert<Equals<Recovery['case'], 'R' | 'F' | 'Q' | 'D'>>(true),
  // Mutual assignability of the whole record: UI can alias CsrRecovery = Recovery with no cast either way.
  assert<Equals<Recovery extends CsrRecovery ? true : false, true>>(true),
  assert<Equals<CsrRecovery extends Recovery ? true : false, true>>(true),
  assert<Equals<keyof CsrRecovery, keyof Recovery>>(true),
] as const;

describe('M41-7 Recovery <-> UI CsrRecovery (66680eb) type compatibility', () => {
  it('compiles (tsc --noEmit is the gate); every check is true', () => { expect(typeChecks.every(Boolean)).toBe(true); });
  it('a loader Recovery is usable as a CsrRecovery and back', () => {
    const r: Recovery = { case: 'D', reason: 'parse', had_backup: false, restored_from_backup: false, copy_failed: false, raw: 'x', source: 'deferred', store: 'ls' };
    const c: CsrRecovery = r; const back: Recovery = c; expect(back).toBe(r);
  });
});
