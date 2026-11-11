# Re-check: PR #1 arch/m4-design @ cf66ce5 (m4-design v0.3.1)
Scope: e845cf3 findings + new data-loss risk; diff e845cf3..cf66ce5 (3d04b9b, 77c42f7, cf66ce5; decisions.md, m4-design.md, status.md). Docs-only, read-only. Claude via wrapper: 1 call (RECHECK=1), claims verified against the doc.

## Verdict: PASS (no blocker) — 3 MAJOR doc fixes required before S-3 implementation starts; HoP note for (f)1 still required.

## Item status
| Item | Status | Evidence |
|---|---|---|
| B1 stale LS beats newer IDB | FIXED for v7/committed | M4-19 rank version→committed→savedAt (decisions.md M4-19; m4-design.md:97); mirror off in deferral (M4-20, :98, test :148); IDB re-read before commit ⇒ idb_main_changed |
| B2 migration input | FIXED | M4-20 boot bytes carried; unknown boot read ⇒ deferral even if later open succeeds (:98, :110) |
| M1 commit via Game.save | FIXED | M4-21 dedicated per-store writer, no quota fallback, skip ⇒ commit_write_failed |
| M2 SAVE_VERSION constant | FIXED | M4-21 guards use readMax/m4Active |
| M3 fresh farm | FIXED | M4-22 committed at creation, new migrationId, never touches v6_backup |
| Quota (M4-23) | PARTIAL | see N2 |
| blocked | FIXED | deferral idb_blocked, attempt_count+1 (M4-16/M4-20, :148, :157, :236) |
| Stale text :81 / :172 | FIXED (no "deleted on next load" text left); new staleness: §3c step 3 (:94) and {ls,idb} commitWrite read as M4-A, mark as S-4 |
| (f)1 | OPEN (process) | §3d moves IDB-write rows to S-4; HoP note still pending (:113) |

## B1 repro (LS v6@T0, IDB v7@T1, slow IDB, play to T2, reload fast)
Slow session: boot read times out → deferral, mirror disabled → LS-only v6 saves @T2; IDB v7 untouched. Reload: version ranks first → IDB v7 wins, nothing overwritten. Session T1→T2 progress (played on the stale base) is discarded silently — acceptable but must be stated (N4).

## M4-24 (§3d LS-only commit)
- Does not reopen the B1 class for v7: IDB is never written during the attempt, unknown boot read defers, IDB main re-read before commit aborts on newer.
- IDB main afterwards: unchanged pre-attempt copy (older v6) until the first resumed mirror put; rank-conditional put cannot overwrite a newer/committed copy; v7 LS outranks it on reload. Safe.
- Weaker than spec (f)1: one backup copy (LS only) in M4-A; lazy-flush main-before-backup now leaves no backup even with IDB present (N5).
- Page close: probe written (N3); after LS backup/read-back → orphan record, main v6, retried next load (safe); after LS main v7 before mirror resume → IDB stale v6, v7 wins on rank (safe); after resume → fine.

## New findings
- **N1 MAJOR — v6-vs-v6 stale-LS overwrite (B1 class, pre-existing on main).** m4-design.md:97, M4-19. Repro: LS write fails while mirror succeeds → IDB v6@T1 > LS v6@T0; next session IDB slow → deferral plays stale LS, savedAt T2; reload fast → savedAt tie-break picks LS, mirror put replaces IDB@T1. Fix: monotone save counter or "IDB-unknown" marker in the rank, or IDB main_prev slot; or record as accepted risk. Also state that a late IDB read after timeout is ignored.
- **N2 MAJOR — M4-23 cleanup unscoped.** decisions.md M4-23 vs M4-22/m4-design.md:87. "Removes the leftover LS backup record" doesn't restrict to this session's aborted migrationId; under M4-24 LS holds the only backup, so a broad reading deletes the sole pre-M4 copy. Fix: only the record whose migrationId = this session's aborted attempt and never one referenced by main's v6BackupId; list it as the exception at :87.
- **N3 MINOR — headroom probe leak.** :109. Close between probe write/remove leaves ≥64 KiB key. Delete unconditionally at boot (migration path) and add to RESET_KEYS.
- **N4 MINOR — deferral progress loss unstated.** :97-98. Document it as accepted.
- **N5 MINOR — risk 11 / M4-24 risk list.** :296, :107. Widen to "no IDB backup in M4-A"; read-back doesn't prove disk flush.
- **N6 MAJOR — no mirror-resume rule after a non-IDB abort.** :105, :111, M4-24(3). After quota_headroom/readback_mismatch/commit_write_failed the mirror stays paused for the session while LS is likely near full ⇒ rc0-level durability. Fix: resume the mirror on any abort except IDB-unknown deferral (rank-conditional put keeps it safe).
- nit: migrationId still Math.random-based (fine, not sim state).
