# PR #12 blocker re-check bd487ab → 182b932
Read-only, 0 Claude calls. Delta: src/save/save.ts (rankCompare, serialize legacy saveSeq), src/main.ts:96 (balance passed), tests/m4a-v3-backup.test.ts (+4 tests).

## Verdict: PASS. B1 is closed. Two minors, neither blocking.

## Claims
| Claim | Status |
|---|---|
| M4-off carries a stored saveSeq forward | ✅ save.ts legacy branch keeps `saveSeq` when the caller's value (`saveSeqOf(prev)+1`) is > 1. Probe: prev seq 5 ⇒ the legacy write has saveSeq 6. A main-origin save (no seq) stays seq-less. |
| rankCompare uses saveSeq only if both copies have one | ✅ `qa > 0 && qb > 0 && qa !== qb` (save.ts:48), else savedAt. |
| pickNewest, reconcile and the IDB refuse check share it | ✅ idb-mirror.ts:80, :100, :108, :118 and game.ts:220 all go through rankCompare. |
| main.ts:96 passes the balance | ✅ |
| 4 regression tests | ✅ Present in tests/m4a-v3-backup.test.ts (LS + IDB paths; both-seq still wins). |
| 682/683, failure = F1 trace golden | ✅ Full vitest: 680 pass, 1 skipped, 2 fail. One is `golden > sim trace` (known). The other is a **pre-existing flake**, see m2. |

## B1 repro, re-run exactly
- Setup: IDB holds an unmarked copy with saveSeq 5 and 1000 coins at T0. The M4-off build plays to T0+1h with 999,999 coins.
- Result: guard `rankCompare(idb, new)` = −1, so the put happens. `pickNewest` = 'ls'. `reconcile` = 'ls'. **LS keeps 999,999 coins.**

## New-risk probes
- **P1: clock moved back.** A seq-bearing copy that is truly newer but has an earlier savedAt, against a seq-less copy that is older but has a later savedAt: **the older seq-less copy wins**. The same holds for a future savedAt within BUG-6 skew (+60 s probe).
  - This is exactly main's behaviour (main ranks by savedAt only), so it isn't worse than main. It only arises when one copy is main-origin (no seq), i.e. right after an M4-off↔seq transition.
  - Accepted, but it should be noted in the design as a known limitation.
- **P2: M4-on, both copies with seq.** The higher seq wins despite an earlier savedAt. Equal seq with different bytes goes to the later savedAt (consistent with F2-EQ "later savedAt wins").
  - An M4-on build always writes seq ≥ 1 (`saveSeqOf(prev)+1`, non-legacy), so the fallback can never apply between two M4-on-written copies.
  - The B1-strict-< / N1 base/forSeq / slot rules from m4-design are **not implemented in code yet**, and this delta doesn't touch them, so there's nothing regressed. The re-check of those rules belongs with the S-4 implementation PR.
- **P3: transitivity. MINOR m1: not transitive.**
  - A (seq 5, T0) > B (seq 3, T0+2h) by seq. B > C (no seq, T0+1h) by savedAt. C > A by savedAt. That's a cycle.
  - No current code ranks 3 copies at once: .bak is only a corrupt-main fallback, and every rankCompare call is pairwise. So no inconsistent pick is possible today.
  - The M4-19 two-slot/divergence logic will rank more copies. Before that lands, either make the order total (e.g. seq-less copies are compared by savedAt against the seq-bearing copy's savedAt), or document that only pairwise use is allowed.

## Other
- **Storage golden (main's 4 pins, no stored seq):** ✓ (`engineering/golden/flagoff-golden.a01faea`: storage passes; sim trace fails, the known F1 case).
- **check-globals:** PASS (chromium, PORT=5232). Only eggfarmExportTelemetry.
- tsc clean.
- **MINOR m2 (pre-existing, test only): `tests/m4a-v3-backup.test.ts` "flag off: .bak rotation and the IndexedDB mirror…" is flaky.**
  - Symptom: `"undefined" is not valid JSON`, because the IDB data isn't written yet.
  - Cause: `settle()` is a 5 ms setTimeout racing the fake IDB.
  - It failed 3/10 runs on **both** bd487ab and 182b932, so it isn't caused by this delta. Await the mirror's transaction (or `m.pending===0`) instead of a timer.
