# Re-check: m3 save durability @ 2959ba0 (fixes for review 8669522)
Read-only. Worktree /workspace/review-2959ba0 (detached at 2959ba0, not changed). Claude: 1 of 5 allowed calls, through ops/claude/claude-code-review.sh (sonnet/high, RECHECK=1). I verified its claims against the code myself.

**Verdict: PASS.** No blocker found.

## Item status
| Item | Status | Evidence |
|---|---|---|
| B1 | Fixed | `newerStoredVersion` (src/save/save.ts:27-31) checks localStorage main, .bak and IndexedDB. `boot` runs it first (src/main.ts:62-65). `loadSafe` (save.ts:135) and `reconcile` (idb-mirror.ts:61) re-check it. A refused Game has `mirror = null` (game.ts:38) and skips the save on load (game.ts:55). |
| M1 | Fixed | The refusal (main.ts:64-65) runs before TabLease/requestFlush/claim (main.ts:70-72). |
| m1 | Fixed | `Number.isInteger` (save.ts:23). |
| m2 | Fixed | `.bak` is part of the newer scan, and the refusal runs before `preserveCorrupt` (save.ts:135 vs 140). |
| m3 | Fixed | The exact M4A-31(b) sentence is in save-recovery.ts:111. |
| m4 | Fixed | The heuristic is labelled in check-release-build.mjs:25. The runtime gate `npm run check-globals` runs in CI (.github/workflows/ci.yml:14-32, one run per engine) and now covers the refused boot (release-globals-browser.mjs). |
| n1 | Fixed | Comment at main.ts:52. |
| BUG-6 | Fixed | A missing or non-finite savedAt becomes NaN (save.ts:105-106). The game then grants 0 offline earnings and tracks `save_savedat_invalid` (game.ts:51-52). The save on load stamps the current time, so the grant can't repeat. |

## New findings (none blocking)
- **minor N1: NaN savedAt in pickNewest** (src/save/idb-mirror.ts:55). `NaN > x` is false, so a localStorage save with a missing savedAt always beats a valid IndexedDB copy. Repro: put a valid save with savedAt T in IDB main, and a valid localStorage save without savedAt that is older in content, then load. The localStorage save wins and the newer IDB progress is replaced on the next save. Rare (it needs a hand-edited or legacy save). Fix: treat a NaN savedAt as -Infinity.
- **minor N2: hand-over race on the refusal path** (main.ts:79-80). If a newer build saves between the pre-check and `new Game`, this tab has already sent flush+claim. It then releases and stops the lease, and still writes nothing. The live tab can briefly flip to the tab-guard modal. The window is very narrow.
- **nit N3: IdbMirror.open uses DB version 1** (idb-mirror.ts:24). If a future build bumps the IDB version, the open fails with a VersionError, the mirror is null, and an IDB-only newer save goes undetected. No data loss today, because with a null mirror nothing writes to IDB. Keep the IDB version at 1 in M4, or handle the VersionError as "newer".

## Tests
Run in a /tmp copy made with `git archive` (node_modules symlinked from game-rc1-save; nothing installed or written in the worktree).
- Targeted run (newer-save, bug6-savedat, idb-mirror, save, save-hardening, tab-guard-tg, offline): 81/81 passed.
- Full vitest run: 415/416 passed. The only failure is telemetry-m3 BUILD_ID (`m3-rc1-pre+unknown`), because the /tmp copy has no .git. It comes from the test setup, not the code.
- I did not run the browser tests (rc0-browser, check-globals).
