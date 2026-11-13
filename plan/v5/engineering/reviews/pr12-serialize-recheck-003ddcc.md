# PR #12 light re-check 182b932 → 003ddcc
Read-only, 0 Claude calls. Detached worktree /workspace/wt-pr12-003ddcc. Delta: 5 files, +34/−16 (src/save/save.ts, src/game.ts, src/main.ts, tests/m4a-v3-backup.test.ts, tests/save-recovery-v21.test.ts).

## Verdict: PASS. OK to merge (after #17 for the F1 golden). No blocking or major findings.

## Claims
| Claim | Status |
|---|---|
| Explicit hadSeq | ✅ `serialize(..., hadSeq=false)` (save.ts:146); legacy branch drops seq iff `!hadSeq` (save.ts:153). All 4 seq-bearing callers pass `saveSeqOf(prev) > 0` (save.ts:64, :163, game.ts:212, :259). For each caller this is exactly equivalent to the old `saveSeq > 1` test (saveSeq = prev+1), so **B1 behaviour is unchanged**, and the inference no longer depends on the caller's arithmetic. |
| Fixes the non-transitive ranking minor (m1) | ⚠ Partly. hadSeq doesn't change ranking; rankCompare is untouched. m1 is closed by the **documentation** option I offered: pairwise-only comment at save.ts:48-50, with 3-way ordering left to Saves' unload rework. Acceptable today (all calls are still pairwise). |
| recoveryExport(state, balance) + test | ✅ save.ts:247, used at main.ts:96; test asserts M4-off = main format/no seq, M4-on keeps track fields. Source-match test updated (save-recovery-v21.test.ts:96). |
| Imports moved to the top | ✅ |
| Flaky .bak/IDB test awaits the write | ✅ Wraps `m.write` and awaits its promises (m4a-v3-backup.test.ts:55-57). **10/10 passes** on this box (was 3/10 failing). |
| B1 repro tests still present/passing | ✅ All 4 B1 regression tests + 2 new ones pass (999,999-coin LS/IDB copies survive a seq-5 1000-coin stale copy). Did not re-verify they fail on bd487ab (already shown in the bd487ab report). |
| Suite 684/685, only F1 golden fails | ✅ Full vitest: 684 passed, 1 failed = `flagoff-golden.a01faea > sim trace` (known, waits on #17). Storage pins pass. |
| B1 strict < / N1 | Not implemented in code yet (as at 182b932); untouched by this delta, nothing regressed. |

## Other checks
- tsc --noEmit clean. vite build OK.
- check-globals: PASS (chromium, PORT=5233). Only `eggfarmExportTelemetry`; refused-newer-save boot: []. No new window/globalThis writes in the diff.

## Findings
- **nit n1** save.ts:48-50: the CCR `//` comment sits between rankCompare's JSDoc and the function, so the JSDoc no longer attaches in IDE hovers. Move it inside the JSDoc.
- **nit n2** save.ts:244-247: the recoveryExport JSDoc was inserted after storageBlockedRecovery's JSDoc, so storageBlockedRecovery's doc now attaches to recoveryExport. Swap the order. Repro: hover either symbol in an editor.
- **minor m1 (carried, documented)** rankCompare is still non-transitive with mixed seq/no-seq copies (A seq5@T0 > B seq3@T0+2h > C noseq@T0+1h > A). Safe while every call is pairwise; it must be made total before any 3-copy ranking (M4-19 slots / Saves' unload rework).
