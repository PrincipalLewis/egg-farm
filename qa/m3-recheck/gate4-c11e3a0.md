# Gate 4 (saves), capped: FINAL c11e3a0a2ffd42707e1d6c976082d84baa5c5b4d
Status at 07:02 CEST: PARTIAL, no failures so far. FF rc0/html/hidden/clock/v6load, then CR, then WK are still running (runner log: gate4-c11e3a0-evidence/summary.txt).

## Lineage
- `merge-base --is-ancestor ffc3dfd c11e3a0`: YES. Diff: only scripts/rc0-browser.mjs (+6 -8, commit "rc0 g5 section asserts only the non-modal rules"). No product, save or game change. Pushed on origin/rc/m4-t3-capped. Chain 0ee8831 -> ffc3dfd (UI explainer only) -> c11e3a0 (test script only).
- Own worktree /tmp/qa-g4s/c11e3a0. package-lock identical to ffc3dfd, so node_modules was copied from my ffc3dfd worktree (a copy, not a symlink).

## c11e3a0 results
| Step | Result |
|---|---|
| build; static build-id dist/dist-qa/dist-html | PASS m3-rc1-pre+c11e3a0, no +dirty |
| marker/migrate-once/interrupted/explainer persistence/rollback/flag-off/sanitize | PASS 30; 2 = F50/H55 N/A BY RULING D-CEO-09 |
| check-release-build | PASS |
| FF runtime build-id | PASS ["m3-rc1-pre+c11e3a0"] |
| FF check-globals | PASS (only eggfarmExportTelemetry) |
| **bug9 solo FF x3** | **PASS 3/3 (12/12 each)**, 06:47, 06:56, 06:57 |
| FF rc0 full, html, hidden, clock, v6load; CR full set; WK | RUNNING |

## bug9 finding
The 0ee8831 FF rc0 failure (bug9 waiting for `.sheet:not([hidden]) .close`) did not reproduce: 2 of 2 completed solo runs on ffc3dfd passed (run 3 was interrupted), and 3 of 3 on c11e3a0 passed. No screenshot at timeout because it never timed out. Classified as a non-reproducible flake in the full-suite run, most likely contention: another lane's rc0 was running on the shared box at the same time. There was no evidence the explainer card overlays the sheet. Not a blocker.
Note: my first 3 bug9 runs on c11e3a0 were invalid (harness error: dist-qa not built yet, so stuck at "Tap to start"). They are moved to bug9/INVALID-no-dist-qa/.

## Carried from 0ee8831 (product code identical to c11e3a0)
Unit 974/974; slow 16+1 skipped; saves R1-R5+M1+F1-F5 16/16; sanitize 16/16 (missing .bak gives a fresh farm, corrupt bytes kept in eggfarm.save.corrupt.<ts>, flagged for product). FF: hidden 33/33, clock 17/17, v6load 154/154, html PASS, globals PASS, rc0 276/277 (bug9 flake above). HoE's changed-file list left out src/game.ts.
ffc3dfd: build-id m3-rc1-pre+ffc3dfd; globals CR/FF/WK PASS; release-build PASS.

## Process
Stopped my 0ee8831 runner (at WK buildid) and my leftover ffc3dfd jobs with exact-PID kill only. No pkill. Earlier pkill -P slip and the foreign /tmp/qa-rc/ffc3dfd worktree write are disclosed in gate4-0ee8831.md. chain4 547983 untouched. Nothing pushed, merged or tagged.

## Update 07:13 CEST
- FF full set on c11e3a0: rc0 **297/297** (pt1 complete, no hang, all PT1 rows PASS), dist-html PASS, hidden 33/33, clock 17/17, v6load 154/154.
- CR, per HoQ: runtime build-id PASS ["m3-rc1-pre+c11e3a0"], check-globals PASS. CR rc0 is NOT my run (HoE's 297/297). CR hidden/clock/v6load carry over from 0ee8831 (product code unchanged since then). My runner started CR rc0 before I stopped it (exact PIDs). Its partial log is not evidence.
- WK (browser steps only, started 07:11): runtime build-id PASS ["m3-rc1-pre+c11e3a0"], check-globals PASS. rc0/html/hidden/clock/v6load running; hard cutoff 08:15.
- bug9: closed as a non-reproducible flake (HoQ).

## MAJOR (HoE-reported, QA-confirmed): explainer shows while storage is blocked
New case EXP-SB in qa/m3-scripts/gate4-explainer.qa.test.ts (mirrors main.ts: TabLease claim with every kv write throwing QuotaExceededError, g.canWrite = () => lease.owns()). Results on c11e3a0:
- reload-committed-unseen (EXP1 fixture, storage blocked at load): **FAIL**. Card shown while blocked (1, expected 0). Root cause: lease.owns() returns true when storageBlocked, so canPersist is true.
- commit-in-session (pre-v7 save, blocked): PASS. No card, flag not set (apparently the commit does not reach onTracksCommitted while writes fail; not yet verified).
- The other 5 explainer cases still PASS.
Repro: blocked localStorage (quota/private mode) + a save that is committed but unseen, then load. The card appears and seenTracksExplainer=true is set in memory but cannot persist.

## WK final (07:11-07:19 CEST, browser steps)
build-id PASS, globals PASS, rc0 **297/297**, dist-html PASS, hidden 33/33, clock 17/17, v6load 154/154. ALL_DONE, nothing carried over.

## VERDICT c11e3a0 (Gate 4 saves, capped): PASS for saves, with the Major explainer-under-storage-blocked (EXP-SB reload case FAIL) open
FF, CR (globals + build-id; rc0 is HoE's; the rest carries over from 0ee8831) and WK are all clean. The fix chain c9d7523 (diff verified: main.ts/app.ts/tracks-explainer.ts/tests/rc0 only, no save/game/sim/CSV) is ON HOLD per HoQ until the storageFailed fast-forward lands. EXP-SB-QE prepared, not run.
