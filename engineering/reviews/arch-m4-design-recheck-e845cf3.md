# Re-check: PR #1 arch/m4-design @ e845cf3 (v0.2.9), diffed against 2f46403
Read-only. Worktree /workspace/review-e845cf3 (detached). 3652004 ignored as instructed; e845cf3 includes it. Changed: decisions.md (M4-15/16 final, M4-18), m4-design.md, a new engineering/golden/flagoff-golden.a01faea.test.ts, status.md.
Claude: 1 of 5 RECHECK calls (sonnet/high). I checked each claim against the docs and src.

**Verdict: BLOCKER.** The design still allows a newer save that exists only in IndexedDB (or a committed v7) to be overwritten. This is the N1/B1 class, now one load later. The commit write path can also put a migrated v7 into IndexedDB on the failure that is supposed to keep v6.

## Items from arch-m4-design-recheck-2f46403.md
| Item | Status | Evidence |
|---|---|---|
| N1 IDB timeout ⇒ stale migration | **Partial (still open)** | M4-16 final: definitely absent = no_global/security/blocked; timeout/open/read error defers (m4-design.md:88; decisions.md:54). Deferral stops migration in *that* session only. See B1, B2. The S-3 test at :131 claims LS main/.bak stay byte-identical, which contradicts "save v6 normally" and the load-time save in code (game.ts:~59 always saves and rotates .bak). |
| N2 orphan deletion | **Mostly fixed; stale text** | Final rule (m4-design.md:87; decisions.md:55): only the unmarked-v6 migration path overwrites or deletes an orphan; never on plain, refused, corrupt-recovery, .bak-restore or fresh loads, or if the id is referenced. Tests :135-136. **But :81 still says the orphan "is deleted or overwritten on the next load", and :172 says "leftover records are deleted or overwritten".** See M3 for the remaining loss path. |
| N3 F-0 stores v6BackupId | Fixed | decisions.md:55; schema adds `v6BackupId` (:42); committed includes "marked v6 with a v6BackupId" (:55). |
| N4 runtime gate | Fixed in design | ADR M4-18 `m4Active = m4On(b) && committed` gates writeVersion, the marker, formulas and UI; readMax uses the build flag (:55-57; decisions.md:56). Missing piece: M2. |
| N5 offline/explainer timing | Fixed in design; spec note pending | Boot grant under v6 rules = the ×1.0 grant, explainer at commit, 19800/24750 re-derived (decisions.md:56; §6a). HoP note for M4A-30/M4A-33 is still "needed" (decisions.md:57). |
| N6 commit order and failure | **Partial** | Order: LS backup → read-back → IDB backup → migrate → main (via Game.save) → IDB main → remove counter → unlock; commit_write_failed keeps old main (decisions.md:56; m4-design.md:92-96). See B2 and M1. |
| N7 migrationId | Fixed | Drawn in save/ with crypto.getRandomValues (Math.random fallback), injected as opts.migrationId (:86); the IDB put is conditional on the id. |
| N8 spec | Mostly fixed | Spec v1.7 M4A-31 (f)1/(g)/(d1)/(h) aligned (attempt counter, 1500 ms, stuck_on_v6). Still pending: HoP note on the record shape, M4A-30 and M4A-33. |
| Nits | Done | backup_stores on save_migrated; §7 risk 11 (LS lazy flush, accepted); risks are renumbered. |

## Which N2 rule is it? (HoE's wording vs the doc)
- **The doc's rule is "migration path only"** (m4-design.md:87, decisions.md:55), not HoE's "deleted after a clean committed load whose id doesn't match". The doc never deletes on a plain committed load.
- HoE's version would delete the only pre-M4 copy whenever a committed v7 or marked save loads next to a record from another attempt or farm (e.g. after corrupt-v7 recovery, then a restored .bak).
- The doc's version is safer but can still lose it (M3). Lines :81 and :172 still read like the old "next load" rule, so the doc isn't consistent everywhere.

## New / remaining findings
### BLOCKER B1: after a deferral, the next load lets the stale LS copy win and then overwrites IDB (src/save/idb-mirror.ts:~55-65 pickNewest/reconcile, :~46 put guard; game.ts:~59, ~105; m4-design.md:88, :131)
- A deferred session still plays and autosaves v6 to LS main, with a fresh savedAt. If the boot open succeeded but the read timed out, the mirror is non-null and those autosaves overwrite IDB main directly.
- On the next load, `pickNewest` compares savedAt only, so the stale-content LS v6 beats the newer IDB v6, or a committed IDB v7 (M4-on build, readMax 7, so no refusal). The migration then backs up the stale bytes, commits, and the IDB main put (it only skips versions > SAVE_VERSION) overwrites the newer copy.
- Repro (design-level, the code paths exist today): LS v6 @T0, IDB main v7 @T1 > T0 with v6BackupId. Load with the IDB open/read at 1600 ms, play 30 s (autosave LS @T2 > T1). Reload with fast IDB: pickNewest → LS, migration commits v7 from T0 content, IDB v7 @T1 is lost.
- Fix:
  - Compare version (and committed `v6BackupId`) before savedAt in pickNewest.
  - In a session where IDB is "unknown", drop the mirror (as game.ts:~41 does for newer saves) and record "IDB unknown at T" so the next load doesn't trust LS on savedAt alone.
  - Make the IDB main put conditional (version/savedAt) inside the transaction.
  - Before commit, re-read IDB main and abort if it is newer than the copy that was loaded.

### HIGH B2: the boot read's tri-state isn't carried into the migration (main.ts:~65-79; idb-mirror.ts:~21-33)
- Boot's `open()` and `read()` return null for absent, timeout and error alike. If boot times out and loads LS with `idbRaw = null`, and the migration's own open then answers in 100 ms, the migration counts IDB as available and commits without ever reconciling IDB main.
- Fix: carry the boot read's result into the migration decision (unknown ⇒ defer), or re-run reconcile before the commit. Add a test for "open ok, read times out or errors".

### MAJOR M1: the commit goes through Game.save, which can't report failure and has a mirror fallback (game.ts:~101-110; m4-design.md:92-96)
- On a quota throw, Game.save's catch writes `serialize(this.state)` to IDB main. At that moment the state is the migrated v7. That contradicts commit_write_failed ("old main kept"), and it also sets storageFailed (a "Can't save" notice while v6 is fine).
- `save()` returns void and silently skips on held, inactive, !canWrite or the newer guard. The commit can't tell skipped from written, so m4Active could flip with v7 only in memory.
- Fix: a dedicated commit write that returns an outcome, has no mirror fallback, and aborts on any skip. Recheck resetting/lease/newer before each step.

### MAJOR M2: the newer-save helpers still use the SAVE_VERSION constant (src/save/save.ts:~21, ~29, ~79, ~110; idb-mirror.ts:~39)
- `newerSaveVersion`, `newerStoredVersion`, `validate`, the last-line guard in `save()` and the IDB in-transaction check all take no balance. The design threads `readMax(b)` only through the chain.
- With SAVE_VERSION 6, an M4-on build refuses its own v7 (NewerSaveError). With 7, a flag-off build stops refusing v7.
- Fix: list every call site in S-1/S-4 and pass readMax(b), each with a test.

### MAJOR M3: a fresh farm can be unmarked, so its migration overwrites the old farm's backup (m4-design.md:55, :57, :87)
- "Committed" doesn't cover a fresh M4 farm, and the marker is written only when m4Active. After corrupt-v7 recovery to a fresh farm (or a new install with an old record), the fresh farm is unmarked v6. The next load takes the migration path and overwrites the old farm's only v6_backup (now an orphan).
- The same happens if recovery loaded an older .bak/IDB copy: the new backup replaces a newer raw.
- Fix: new M4 farms are committed and marked at creation (with no backup), and the migration path never overwrites a record whose raw belongs to another farm or a newer savedAt. Or keep one prior record (two slots).

### MINOR m1: 'blocked' can't occur with DB version 1, and if it ever does it is not "definitely unavailable" (m4-design.md:88, :127; idb-mirror.ts:~24, ~28)
- `onblocked` fires only for a version-change request, and `open(name, 1)` on a v1 or new DB never makes one. It would occur after a future version bump while an old tab holds the DB (IdbMirror sets no onversionchange/close). Then IDB exists and may hold a newer save, so proceeding LS-only is the B1 class again.
- Treat `blocked` as a deferral. Also, `open()` currently turns every failure into null; distinguishing SecurityError/InvalidStateError needs a refactor the design doesn't name.

### MINOR m2: a leftover LS record on deferral or late abort
- The LS backup is written first (step 1), so every idb_write_timeout/commit_write_failed abort (and a deferral detected after step 1) leaves an LS orphan. That roughly doubles the footprint and can make the player's normal v6 save hit quota.
- Remove your own record on every abort, or probe IDB before the LS write.

### NIT
- A kill between the IDB main mirror and the counter removal leaves a stale `migration_attempts`. Clear it before the mirror write.
- A timed-out step-2 IDB put can land later. Make it compare-and-set by migrationId.
- Golden harness: engineering/golden/flagoff-golden.a01faea.test.ts imports `../src` and `../tests/bot`, so it only runs when copied into a01faea, as documented. Fine.

## Page close mid-sequence
- Close after step 1 or 2: main is v6, the LS record is an orphan, safe.
- Close after step 3 (IDB backup): safe; the orphans are replaced by the next attempt.
- Close after main v7 but before IDB main: next load, LS v7 vs IDB v6. pickNewest by savedAt picks LS, OK. But by B1 the reverse case is unsafe.
- Close before the LS flush, with IDB absent: accepted risk 11.
