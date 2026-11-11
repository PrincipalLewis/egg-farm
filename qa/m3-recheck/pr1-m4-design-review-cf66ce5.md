# PR #1 recheck: engineering/m4-design.md @ cf66ce5 (v0.3.1, spec v1.9; supersedes the e845cf3 recheck, whose golden run never got the lock and was cancelled)
Saves QA · 2026-10-16 22:30 CEST · doc read from a `git archive cf66ce5` export under qa/scratch/pr1-cf66ce5 (no worktree, nobody else's tree touched). Diffed against e845cf3 and f1869c4. Spec cross-check: product/farm-upgrades/m4a-spec.md (or product/farm/m4a-spec.md if not moved) (v1.8 header; v1.7/v1.9 sections). No PR comments, push, merge or tag. Verdict: HoQA.

## M-6 golden: run twice under the lock — CLOSED
cf66ce5 = a01faea code + docs only (`git diff --stat a01faea cf66ce5`: engineering/* only). The harness file has the same content as at e845cf3.
Setup: `git -C game archive cf66ce5 | tar -x` → qa/scratch/pr1-cf66ce5; node_modules from my own `npm ci` (qa/scratch/pr1-e845cf3). The file was copied to `golden/flagoff-golden.test.ts`, as §4 says, because its `../src` imports don't resolve from engineering/golden/.
Command (×2, from qa/scratch/pr1-cf66ce5):
`flock /workspace/egg-farm-studio/.browser-test.lock npx vitest run golden/flagoff-golden.test.ts --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1`
- Run 1: lock 22:14:31, exit 0, 2 passed. Run 2: lock 22:27:38, exit 0, 2 passed. Logs: qa/scratch/pr1-cf66ce5/run1.log, run2.log.

| | run 1 | run 2 | §4 pin | equal |
|---|---|---|---|---|
| m1-rc2-v4-12min | b69c5783…24ee9 | b69c5783…24ee9 | b69c5783…24ee9 | ✔ |
| m2-rc1-v5-12min | 2ac7070d…f3a00 | 2ac7070d…f3a00 | 2ac7070d…f3a00 | ✔ |
| m2-rc1-v5-40min | 4fd46759…1b431 | 4fd46759…1b431 | 4fd46759…1b431 | ✔ |
| m2-rc1-v5-40min-edge | 652d1b26…9f0bb | 652d1b26…9f0bb | 652d1b26…9f0bb | ✔ |
| GOLDEN1 trace | 50a87ddb…809de0 | 50a87ddb…809de0 | 50a87ddb…809de0 | ✔ = `GOLDEN_MAIN_4AADCBF` (tests/m4a-flag-off.test.ts:12 @3351d6c and 04e2709) |

Nit M6-n: the harness only `console.log`s the hashes and has no `expect(...).toBe(pin)`, so it "passes" even on drift. A-0 should add the assertions, and also fix the file location/imports.

## Items
| Item | Status | § | Reason |
|---|---|---|---|
| M-6 | CLOSED | §4 golden 1/2 | Pins name sha256, fixtures, `now` = fixture savedAt, 600 × `step(0.1)`, real `save()`. Re-pinned at a01faea. Reproduced twice under lock (above). |
| M4-15 orphan rows | CLOSED | §3 Tests "orphan id (a)/(b)", §3c, §6a | Rows for (a) record id ≠ live `v6BackupId` and (b) live save with no `v6BackupId`: not restored, not write-once-protected, replaced only by the next unmarked-v6 migration. |
| M4-16 read-back before in-place write | CLOSED | §3c LS read-back bullet, commit order step 1, §3 Tests "LS read-back pass/fail" | Read back + `migrationId` match before the main write; mismatch, parse failure or a throwing getItem ⇒ M4-12 abort `readback_mismatch`. Pass and fail cases both tested. |
| **§3d / ADR M4-24 LS-only commit** | **OPEN (Must)** | §3d conditions 1–4, §3d test rows | §3d's only read-back condition (3) is **after** the commit (main + backup read back before the mirror resumes). §3d doesn't state that the M4-A LS-only path commits **only after the LS `v6_backup` read-back with a matching `migrationId`, else M4-12 abort `readback_mismatch`**. That rule lives in §3c, and §3d says it "supersedes the IDB-backup parts of §3c" without saying the §3c LS read-back still applies. There's also no §3d-tagged test row for the pre-commit backup read-back mismatch. Fix: add it as §3d condition 0 plus a `[S-3, §3d]` row. |
| **migration_attempts bar** | **OPEN (Must)** | §3c Attempt counter, §3b | Small integer ✔ ("integer string"). Never written on refusal ✔ (§3b, row "a refused load never writes"). **Not bounded:** no max value or cap, and nothing about what happens on overflow or a non-integer/garbage value. "No serialized save" isn't stated explicitly, so §3b's no-save-object rule isn't extended to this key. Spec v1.7 match ✔: one 1500 ms T for open and write, `idb_write_timeout`, only deferrals increment, `stuck_on_v6` at ≥ 3, Reset clears, commit removes. 1500 ms deferral tests ✔ (1499/1500 fake clock row; 4-load sequence row). |
| Zero IDB writes in a deferral session incl. mirror | CLOSED | §3c M4-20, §3 Tests "spec v1.9 (d1)7 / M4-20", "newer save only in IDB + slow open", "[S-3, §3d-2]" | Mirror disabled for the session; zero IDB puts across autosave/pagehide; IDB main/v6_backup byte-identical. |
| quota_headroom | CLOSED (Nit) | §3d-1, §3 Tests "[S-3, §3d-1]", §5 | Deferral +1, main/.bak/telemetry byte-identical, probe key absent after. Nit: `eggfarm.save.headroom_probe` isn't listed in §3b ("never on refusal" is only in §3d), so add it to §3b's must-stay-absent list. The guard will FAIL it as an unknown key anyway. |
| Read-back before mirror resumes | CLOSED | §3d-3, §3 Tests "[S-3, §3d-3]" | First IDB main put only after the LS main byte-equal + backup-id read-back. Forced mismatch ⇒ `commit_write_failed`, mirror stays paused. |
| idb_main_changed | CLOSED | §3c commit step 3, §3 Tests, §5 | Re-read before commit; newer by rank, or re-read fails ⇒ abort, mains byte-identical. In the enum. |
| v1.9 onblocked = deferral | CLOSED | §3c IndexedDB, §3 Tests (g) row + (d1)7 row, §5 | `idb_blocked`, attempt +1, never `save_backup_idb_unavailable` (the event enum now excludes `blocked`). |
| v1.9 private-mode = security → LS-only | CLOSED | §3c IndexedDB, §3 Tests (g) row | `SecurityError`, `InvalidStateError` and other private-mode errors ⇒ `security`, LS-only with read-back. |

## Nits
| Nit | Status | § |
|---|---|---|
| N-1 slice labels on tests | CLOSED | §3 Tests: all rows tagged [S-x]/[§3d-x] |
| N-4 newest valid savedAt within a version | CLOSED | §3a.3 (and M4-19 rank: version → committed → savedAt) |
| N-5 data-version = highest across copies | CLOSED | §3a.2 |
| §8 ".bak tests" wording | CLOSED | §8 S-4 row ("committed-v6_backup tests (.bak rotates, not asserted)") |
| Reset asserted after reload | CLOSED | §3 Tests Reset row (committed + orphan, both stores, reload). Under §3d the IDB half applies from S-4. |
| IDB timeout consistency | CLOSED | §3c: one T = 1500 ms (open + write), 2000 ms superseded |
| M4A-31(f)1 note | OPEN (Nit) | §3d end: "HoP note needed" for the (f)1/(h) IDB-write rows becoming S-4 rows; not yet in the spec |
| New: M4A-30 grant order and M4A-33 timing | CLOSED | §9.13 (spec v1.8 approved) |
| New: spec enum drift | OPEN (Nit) | §5 vs m4a-spec telemetry: spec lists no `commit_write_failed`, `idb_main_changed`, `quota_headroom`. Align the spec (v1.9 says aligned). |
