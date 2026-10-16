# engineering decisions (repo copy; canonical log: egg-farm-studio/engineering/decisions.md)

## 2026-10-16 19:45 ADR M4-1..3 (Senior Software Architect, proposed — needs HoE ack)
- **M4-1 Save target is v6→v7.** "save v4" names the durability iteration; main has SAVE_VERSION 6. All M4 docs/tasks use v7.
- ~~**M4-2 Schema independent of flags.**~~ **SUPERSEDED by M4-4 (HoE 2026-10-16 19:29).** The v7 migration runs whenever the build has SAVE_VERSION 7; `balance.m4.enabled` gates behaviour only. Avoids two save formats per build. Consequence: the hardened newer-save refusal (task S-2) must ship before any SAVE_VERSION 7 build.
- **M4-3 Migrations live in `save/migrations/`, take `balance`, and are pure;** `econ/` is pure read-only derived economics that `sim/` never imports.

## 2026-10-16 19:29 ADR M4-4..7 (HoE decisions on m4-design v0.1 §9; recorded by Senior Software Architect)
- **M4-4 (supersedes M4-2) Write version follows the M4 flag.** Flag-off builds write v6; only M4-on builds write v7. The v6 .bak is kept until M4 reaches Latest. The v7 reader still accepts v6.
- **M4-5 (SUPERSEDED by M4-12/M4-14) Backup-write failure:** no new UI. The v2.2 "Can't save" dialog shows once per session, then the persistent toast. Never block play or drop in-memory state; v7 is not committed until the backup succeeds.
- **M4-6 TR-5 is report-only.** It becomes blocking after 5 consecutive green runs with no flake; HoE flips it.
- **M4-7 CI runs locally** via scripts/gate-all.sh. No hosted Actions minutes without CEO approval.
- Also: the A-0 rebase onto origin/main a01faea is owned by HoE (tonight). Features branches from the v2 SHA.

## 2026-10-16 20:28 ADR M4-8 Interim `tracksV7` marker in v6 (HoE decision; recorded by Senior Software Architect)
- m4/m4a-tracks-v2 @ 3351d6c price-matches pre-M4 saves inside the v6 format and marks them `tracksV7: 1` (SAVE_VERSION stays 6). **Kept as an interim step for playtest and M4-flagged builds only, never in a release default.**
- S-4 does the real v6→v7 bump and must accept unmarked v6 (migrate), marked v6 (idempotent: no re-migrate, no re-refund) and v7. S-6 adds marked-v6 fixtures. F-9 removes the marker path.
- Flag-off builds ignore or keep the marker fields on load and never strip them on write. S-2 (zero-writes refusal) is unaffected, because a marked save is still v6.

## 2026-10-16 20:29 ADR M4-9 Flag-off builds refuse v7 saves (HoE decision 9.7; recorded by Senior Software Architect)
- A flag-off build treats a v7 save exactly like a newer save: the existing newer-save dialog and S-2 zero-writes rules. It never writes v6 over a v7 save and never silently drops M4 progress. The v6 .bak stays as the escape hatch; export stays available. Refines M4-4 (flag-off reads v6 only).
- Test: "flag-off refuses v7: zero writes, .bak intact, export works" (S-2/S-4). Also 9.5: QA Saves 33ec1b55 owns qa/m3-scripts/rc1-guard-save-qa-m4.mjs.

## 2026-10-16 20:31 ADR M4-10 (failure handling SUPERSEDED by M4-12) Interim path writes a v6 backup first (HoE review m4-design-v0.2-ad10a08 #3; recorded by Senior Software Architect)
- On m4/m4a-tracks-v2 (interim tracksV7 marker, ADR M4-8), the caller of migrateTracksV7 writes the raw v6 save to `v6_backup` once (write-once, LS + IDB keys as in S-3), before the in-place price-match. Owner: Features 95daf662 (F-0).
- F-0 also adds the missing test: a flag-off build saves a marked save without stripping tracksV7/hensLevel/eggValueLevel (review #1).

## 2026-10-16 21:05 ADR M4-11 (write timing/failure SUPERSEDED by M4-12; naming + export still valid) Backup naming and newer-save export (Saves QA guard-prep; Senior Software Architect)
- One backup name: localStorage `eggfarm.save.v6_backup` + IndexedDB `eggfarm`/`save`/`v6_backup`. Holds the raw v6 bytes, write-once, kept until M4 reaches Latest (not in RESET_KEYS). Written before the interim tracksV7 change (F-0) and before the first v7 write (S-4); commit waits for the confirmed backup per M4-12/M4-16; write-once only once committed (M4-15). `eggfarm.save.bak` stays the rotation copy.
- (HoE 21:18) The `.newer-save` dialog gets an `Export save` button `[data-testid=newer-save-export]`. It exports the raw stored save string exactly as stored: no wrapper, no migration, zero storage writes. `Try again` stays. Owner: S-2 (Saves 3ba38cf3). Facts in m4-design §3a.

## 2026-10-16 21:24 ADR M4-12 Backup-write failure aborts the migration (HoE; spec M4A-31(a)/(f)1; review m4-m4a-tracks-v3-677317d M1). Supersedes the failure handling in M4-5 (9.1), M4-10 and M4-11
- If the v6 backup write fails in localStorage or IndexedDB: discard the migrated state, keep the original v6 in memory, save v6 normally with no tracksV7 marker, and retry the migration on the next load.
- Show the "Can't save" notice (once per session) only if that normal v6 save also fails.
- Applies to the interim marker path (F-0) and the S-4 v7 path: the backup must succeed in both stores before the migration commits.
- Tests: an injected quota failure in each store → the save stays v6 and nothing is lost across a page close.
- Plan: the Export button is ZW-2, a separate Saves PR before S-2; S-2 ETA Sat 22:00.

## 2026-10-16 21:55 ADR M4-13 Partial backup failure + QA testability rules (HoQA review pr1-m4-design-review-96e895b; Senior Software Architect)
- If the `v6_backup` write succeeds in one store and fails in the other (LS ok + IDB fails, or the reverse), the aborted attempt removes the backup it wrote, so no `v6_backup` from that attempt remains. The retry on the next load writes a fresh backup in both stores from the unmarked v6 save. Write-once applies only to a backup whose migration committed. Refines M4-11/M4-12.
- Zero-writes rule (QA ZW-3..6) adopted: save keys (`eggfarm.save`, `.bak`, `.v6_backup`, `.corrupt.*`), `eggfarm.ui` and IDB `save/main|v6_backup` stay byte-identical; only `eggfarm.lease`, `eggfarm.tab`, `eggfarm.telemetry` may be written, none holding a serialized save; `eggfarm.install_id` create-if-absent only (m4-design §3b).
- ZW-2 (Export save) is its own Saves PR before S-2 and a prerequisite of S-2 and S-4; QA flips ZW-2 to PASS on that PR's SHA.
- Flag-off = main means the sim trace hash (sha256 of the JSON trace, m4a-flag-off harness) plus a storage-bytes golden over tests/fixtures/saves, both pinned to a01faea (m4-design §4). Backup-failure tests assert no dialog while the v6 save succeeds and `save_migration_aborted{store}`.

## 2026-10-16 22:05 ADR M4-14..17 Abort/retry protocol (Senior Software Architect; Code Reviewer arch-m4-design-ab8f366 Majors 1–4)
- **M4-14 Flag-off rules until commit.** A session after an aborted migration (and before commit) runs flag-off rules for the rest of the session: M4 UI and track purchases hidden/disabled, the save stays plain v6. No track purchase can be overwritten by the next migration.
- **M4-15 Commit marker.** The backup record `{migrationId, raw}` carries a random id; the committed migrated save stores it in `state.v6BackupId`. A backup is committed only if its id matches the live save's; a non-matching or unreferenced record is leftover and is deleted on the next load or overwritten by the fresh write. Only a committed backup is write-once. Cleanup on abort is best effort.
- **M4-16 IndexedDB.** LS `v6_backup` is required. IDB unavailable (open fails, blocked/private mode, or open+tx > 2000 ms, value chosen by the Architect) ⇒ proceed on LS alone and emit `save_backup_idb_unavailable`. IDB opens but the write fails ⇒ abort. Mechanism (simpler option): boot runs v6 synchronously under flag-off rules; backup writes are confirmed async; then the live state migrates and commits in-session and M4 UI unlocks. HoP to note the (f)1 narrowing.
- **M4-17 Validate before backup.** Parse → version → checksum → ranges first; corrupt/out-of-range goes to corrupt recovery, never migrated or backed up. The backup holds the original raw validated bytes of the copy loaded. Restore: LS v6_backup, else IDB v6_backup, else none, checksum-verified.
- Also: Reset clears v6_backup in both stores; `save_migration_aborted` has exactly {store, reason, path}; the ×1.0 first-grant fact is saved only on commit; refunds are integer cents, clamped to Number.MAX_SAFE_INTEGER, egg-value search falls back to max level; the interim path never refunds and S-4 records it in migrationRefundCents.
