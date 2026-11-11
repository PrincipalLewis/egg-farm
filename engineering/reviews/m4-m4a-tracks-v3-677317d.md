# Review: m4/m4a-tracks-v3 @ 677317d (3 commits on 3351d6c)
Read-only. Worktree /workspace/review-677317d (detached). Claude: 1 of 15 calls via the wrapper (sonnet/high). Its sandbox denied Bash, so it read the files only. I checked each of its points against the code.
Spec: product/farm/m4a-spec.md M4A-27..31. The ADR M4-10/11 and m4-design §3a.5 that the commit cites are not under engineering/ or product/, so I couldn't check them.

**Verdict: CHANGES REQUESTED.** 0 blocking, 1 major, 5 minor, 2 nit.

## Questions asked
- **Can the v6_backup write overwrite or lose data?**
  - It never overwrites. `writeV6Backup` returns 'kept' if the key exists, and 'written' only after a read-back match (src/save/save.ts:15-18).
  - The IndexedDB side does get-then-add in one transaction (src/save/idb-mirror.ts:53-59).
  - It is written in the constructor (src/game.ts:55), before the save on load. The test asserts that order (tests/m4a-v3-backup.test.ts:37-48).
  - It's never rotated, and Reset doesn't clear it (m4).
  - Data-loss paths: M1 (quota failure), m1 (guard ordering), m4 (reset).
- **Does a flag-off build round-trip tracksV7 and the track fields?**
  - Yes, by construction: `migrate` spreads the stored state and skips the m4On branch (save.ts:48-53), `serialize` writes the whole state, `.bak` is a verbatim copy, and the IndexedDB write and reconcile are verbatim.
  - The test asserts whole-state bytes for validate+serialize, and main-only for a flag-off Game save then flag-on reload (no re-migration). It doesn't cover .bak or IndexedDB (m5).
- **Release globals:** the diff adds no window globals. I couldn't run check-release-build in the /tmp copy: "no build id found" (the copy has no .git).

## Findings
### MAJOR M1: a failed backup write silently drops the whole session's progress (src/game.ts:122)
- If localStorage refuses `eggfarm.save.v6_backup` (quota), `save()` returns before main, .bak, the IndexedDB mirror, pagehide and handover. Meanwhile the player keeps playing the migrated in-memory farm.
- `storageFailed` and `onStorageFail` never fire, so no "progress won't be saved" notice appears. The only trace is one `save_migration_aborted` event.
- This doesn't match M4A-31(a) and (f)1: "the migration aborts … the v6 save stays as it is and the v6 game runs normally". Here the migrated farm runs and nothing is saved.
- Likely trigger: storage near its limit. Adding the new key needs a full extra copy of the save; overwriting main doesn't.
- Repro: in m4a-v3-backup.test.ts:64-71 (quota stub on V6_BACKUP_KEY), add a purchase via `g.dispatch(...)`, then `new Game(on, kv)`. The purchase is gone. The existing test asserts this behaviour rather than flagging it.
- Fix: on failure, run the session on the unmigrated v6 state (per spec). At minimum, raise storageFailed/onStorageFail.

### MINOR m1: backup write runs before the lease and newer-save guards (src/game.ts:122 vs 123-124)
- `tryV6Backup()` comes before `canWrite()` and `newerGuard()`. With a backup pending (after a failure), a tab that lost the lease, or that now has a newer .bak/main, still writes v6_backup. (f)6 says no writes while refused.
- With a lost lease the pending bytes can also be stale, and write-once then keeps the stale copy forever.
- Repro: quota-fail the backup at construction, put a version-7 save in `eggfarm.save.bak`, clear the stub and call `g.save()`. v6_backup gets written, then newerGuard refuses.
- Fix: move `tryV6Backup()` after line 124.

### MINOR m2: IndexedDB backup is best-effort and never retried (src/game.ts:117; idb-mirror.ts:53-59)
- (f)1 says either the localStorage or the IndexedDB write failing aborts the migration. Here an IndexedDB failure is ignored, and the marker then prevents any retry.
- The mirror write passes the current raw, not the stored localStorage backup, so after 'kept' the two stores can hold different bytes.
- The real `IdbMirror.writeV6Backup` has no test (only a stub at :49).
- If the ADR overrides (f)1, record that in the spec.

### MINOR m3: write-once loses the newer pre-migration bytes when a farm is migrated twice
- If a save loses its marker (it was played by a build that drops unknown fields, or after Reset + a flag-off new farm), the next flag-on load migrates again. writeV6Backup returns 'kept' with the old bytes, and the current v6 bytes are lost.
- The test at :59-62 asserts this keep-first rule. It follows the spec ("written only if no backup exists"), but it should be an accepted risk on record.

### MINOR m4: Reset leaves v6_backup behind (save.ts RESET_KEYS; idb-mirror.ts clear() deletes `main` only)
- An old farm's data survives a "Reset all progress", and it then blocks the backup for the next farm (m3).

### MINOR m5: test gaps (tests/m4a-v3-backup.test.ts:15-34)
- Missing: the flag-off round trip through .bak rotation and the IndexedDB mirror/reconcile; backup failure followed by an action and a reload (M1); ordering against the lease and newer-save guards (m1); a real IdbMirror.writeV6Backup failure.

### NIT
- n1: `migrate()` sets `preTracksRaw: ''`, which `validate()` then replaces (save.ts:53, :133). A direct migrate caller would back up '' permanently. Guard for a non-empty string at game.ts:55.
- n2: `debugBackdateSave` (game.ts:~173) calls the raw `save()` and skips the backup gate (dev only). Read-only storage reports a misleading `save_migration_aborted`.

Raised by Claude, not verified here (may predate this diff): hensLevel and eggValueLevel aren't range-checked in validate (M4A-27).

## Tests
Run in a /tmp git-archive copy with node_modules symlinked.
- m4a-v3-backup (7), newer-save, idb-mirror, save, save-hardening: 69/69 passed.
- Full vitest: 587 passed, 2 skipped, 2 failed. Both failures come from the copy:
  - telemetry-m3 BUILD_ID: the copy has no .git.
  - F1 farm cost: it reads ../product/economy.f1.csv, which is outside the copy. It fails the same way at base 3351d6c.
- tsc --noEmit: clean.
