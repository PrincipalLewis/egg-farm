/** M41-7 (spec v0.3.3 FROZEN sha256 bca075fea10f7fb973f56dad941870229129738a52846fea72bf2146050bae9c), HoE: Saves' exported
 *  Recovery must match UI's local CsrRecovery (src/ui/save-recovery.ts @ 66680eb, PR #58) exactly. The declaration below is
 *  copied VERBATIM from `git show 66680eb:src/ui/save-recovery.ts` lines 47-51; after the #58 integration merge, replace it with
 *  `import type { CsrRecovery, RecoverySource as UiSource } from '../src/ui/save-recovery'`. Checked by tsc (tests are in tsconfig). */
import { describe, it, expect } from 'vitest';
import type { Recovery, RecoverySource } from '../src/save/save';

type UiRecoverySource = 'bak' | 'idb' | 'v6_backup' | 'none' | 'deferred';
type CsrRecovery = Omit<Recovery, 'case'> & {
  case: Recovery['case'] | 'D'; source?: UiRecoverySource; store?: 'ls' | 'idb';
  prevLevel?: number; restoredLevel?: number; restoredSavedAt?: number;
};
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
