# engineering decisions (repo copy; canonical log: egg-farm-studio/engineering/decisions.md)

## 2026-10-16 19:45 ADR M4-1..3 (Senior Software Architect, proposed — needs HoE ack)
- **M4-1 Save target is v6→v7.** "save v4" names the durability iteration; main has SAVE_VERSION 6. All M4 docs/tasks use v7.
- ~~**M4-2 Schema independent of flags.**~~ **SUPERSEDED by M4-4 (HoE 2026-10-16 19:29).** The v7 migration runs whenever the build has SAVE_VERSION 7; `balance.m4.enabled` gates behaviour only. Avoids two save formats per build. Consequence: the hardened newer-save refusal (task S-2) must ship before any SAVE_VERSION 7 build.
- **M4-3 Migrations live in `save/migrations/`, take `balance`, and are pure;** `econ/` is pure read-only derived economics that `sim/` never imports.

## 2026-10-16 19:29 ADR M4-4..7 (HoE decisions on m4-design v0.1 §9; recorded by Senior Software Architect)
- **M4-4 (supersedes M4-2) Write version follows the M4 flag.** Flag-off builds write v6; only M4-on builds write v7. The v6 copy (`v6_backup`, M4-11/M4-15) is kept until M4 reaches Latest. The v7 reader still accepts v6.
- **M4-5 (SUPERSEDED by M4-12/M4-14) Backup-write failure:** no new UI. The v2.2 "Can't save" dialog shows once per session, then the persistent toast. Never block play or drop in-memory state; v7 is not committed until the backup succeeds.
- **M4-6 TR-5 is report-only.** It becomes blocking after 5 consecutive green runs with no flake; HoE flips it.
- **M4-7 CI runs locally** via scripts/gate-all.sh. No hosted Actions minutes without CEO approval.
- Also: the A-0 rebase onto origin/main a01faea is owned by HoE (tonight). Features branches from the v2 SHA.

## 2026-10-16 20:28 ADR M4-8 Interim `tracksV7` marker in v6 (HoE decision; recorded by Senior Software Architect)
- m4/m4a-tracks-v2 @ 3351d6c price-matches pre-M4 saves inside the v6 format and marks them `tracksV7: 1` (SAVE_VERSION stays 6). **Kept as an interim step for playtest and M4-flagged builds only, never in a release default.**
- S-4 does the real v6→v7 bump and must accept unmarked v6 (migrate), marked v6 (idempotent: no re-migrate, no re-refund) and v7. S-6 adds marked-v6 fixtures. F-9 removes the marker path.
- Flag-off builds ignore or keep the marker fields on load and never strip them on write. S-2 (zero-writes refusal) is unaffected, because a marked save is still v6.

## 2026-10-16 20:29 ADR M4-9 Flag-off builds refuse v7 saves (HoE decision 9.7; recorded by Senior Software Architect)
- A flag-off build treats a v7 save exactly like a newer save: the existing newer-save dialog and S-2 zero-writes rules. It never writes v6 over a v7 save and never silently drops M4 progress. `v6_backup` stays as the escape hatch; export stays available. Refines M4-4 (flag-off reads v6 only).
- Test: "flag-off refuses v7: zero writes, .bak intact, export works" (S-2/S-4). Also 9.5: QA Saves 33ec1b55 owns qa/m3-scripts/rc1-guard-save-qa-m4.mjs.

## 2026-10-16 20:31 ADR M4-10 (failure handling SUPERSEDED by M4-12) Interim path writes a v6 backup first (HoE review m4-design-v0.2-ad10a08 #3; recorded by Senior Software Architect)
- On m4/m4a-tracks-v2 (interim tracksV7 marker, ADR M4-8), the caller of migrateTracksV7 writes the raw v6 save to `v6_backup` once (write-once, LS + IDB keys as in S-3), before the in-place price-match. Owner: Features 95daf662 (F-0).
- F-0 also adds the missing test: a flag-off build saves a marked save without stripping tracksV7/hensLevel/eggValueLevel (review #1).

## 2026-10-16 21:05 ADR M4-11 (write timing/failure SUPERSEDED by M4-12; naming + export still valid) Backup naming and newer-save export (Saves QA guard-prep; Senior Software Architect)
- One backup name: localStorage `eggfarm.save.v6_backup` + IndexedDB `eggfarm`/`save`/`v6_backup`. Holds the raw v6 bytes, write-once only once committed (M4-15), kept until M4 reaches Latest; Settings > Reset clears it in both stores (localStorage key in RESET_KEYS, IndexedDB `save/v6_backup` via clearMirror; m4-design §3c; ADR M4-14..17 entry, "Also" bullet). The IDB delete is an explicit keyed delete (clear() removes only main). Written before the interim tracksV7 change (F-0) and before the first v7 write (S-4); commit waits for the confirmed backup per M4-12/M4-16; write-once only once committed (M4-15). `eggfarm.save.bak` stays the rotation copy.
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
- **M4-15 Commit marker.** The backup record `{migrationId, raw}` carries a random id; the committed migrated save stores it in `state.v6BackupId`. A backup is committed only if its id matches the live save's; a non-matching or unreferenced record is an orphan (REVISED 22:00 below: touched only by the migration path). Only a committed backup is write-once. Cleanup on abort is best effort.
- **M4-16 IndexedDB (REVISED 22:00 below; the 2000 ms / timeout-is-unavailable rule is SUPERSEDED).** LS `v6_backup` is required. IDB unavailable (open fails, blocked/private mode, or open+tx > 2000 ms, value chosen by the Architect) ⇒ proceed on LS alone and emit `save_backup_idb_unavailable`. IDB opens but the write fails ⇒ abort. Mechanism (simpler option): boot runs v6 synchronously under flag-off rules; backup writes are confirmed async; then the live state migrates and commits in-session and M4 UI unlocks. HoP to note the (f)1 narrowing.
- **M4-17 Validate before backup.** Parse → version → checksum → ranges first; corrupt/out-of-range goes to corrupt recovery, never migrated or backed up. The backup holds the original raw validated bytes of the copy loaded. Restore: LS v6_backup, else IDB v6_backup, else none, checksum-verified.
- Also: Reset clears v6_backup in both stores; `save_migration_aborted` has exactly {store, reason, path}; the ×1.0 first-grant fact is saved only on commit; refunds are integer cents, clamped to Number.MAX_SAFE_INTEGER, egg-value search falls back to max level; the interim path never refunds and S-4 records it in migrationRefundCents.

## 2026-10-16 22:00 ADR M4-15/M4-16 revised + M4-18 (HoE approved N1/N2; spec m4a-spec v1.7 M4A-31 (f)1/(g)/(d1)/(h), HoP-approved; HoQA review f1869c4; Code Reviewer recheck 2f46403; recorded by Senior Software Architect)
- **M4-16 (final, = spec v1.7; aligned to v1.9 by M4-20: blocked defers, security = SecurityError|InvalidStateError|private-mode errors; IDB-backup parts deferred to S-4 by M4-24).** LS backup required, with a read-back whose migrationId must equal the pending state.v6BackupId (else abort, reason readback_mismatch). LS-only migration only when IDB is definitely unavailable: no `indexedDB` global, or open throws/rejects with SecurityError, private-mode InvalidStateError (both ⇒ security) (`save_backup_idb_unavailable {reason: no_global|security}`; blocked is a deferral since M4-20). One number, T = 1500 ms, for open and backup write. Open not answered by 1500 ms, any other open failure or a read failure **defers** (stay v6 under flag-off rules, `save_migration_aborted {store: idb, reason: idb_timeout|idb_read_error, attempt_count}`, retry next load); a timeout is never "unavailable". Once open, a failed write aborts (quota|error) and a write pending at 1500 ms aborts (idb_write_timeout). Why not 2000 ms: a timed-out IDB read can hide a newer IDB-only save that an LS-only migration would overwrite; using the mirror's existing 1.5 s for normal saves and the migration keeps one timeout for the same DB. **Supersedes** HoE's 21:58 2000 ms ruling and spec v1.6.
- **Attempt counter.** LS `eggfarm.save.migration_attempts` (integer): incremented by every failed attempt, abort or deferral (SUPERSEDED counting: spec v1.12 (h)6), capped at 3; removed on commit; cleared by Reset (RESET_KEYS); never written on the refusal path (allowlisted in m4-design §3b on that basis). attempt_count ≥ 3 ⇒ `stuck_on_v6: true`. The migration is never forced.
- **M4-15 (final).** An orphan (id mismatch, or live save without v6BackupId) is not restored and not write-once-protected. It is deleted or overwritten only inside the unmarked-v6 migration path when a fresh backup is written; never on a plain, refused, corrupt-recovery, .bak-restore or fresh load, and never if its id is referenced by main/.bak/IDB main. F-0 also stores v6BackupId in the marked v6 save. migrationId is drawn in save/ and injected (pure migration, deterministic tests). The IDB put is conditional on the id.
- **M4-18 Runtime gate and commit order.** `m4Active = m4On(b) && committed` (session state in Game) gates writeVersion, the interim marker, M4 formulas and UI; readMax uses the build flag. Commit order: LS backup → read-back → IDB backup confirmed → migrate live state → main (via Game.save guards) → IDB main mirror → remove migration_attempts → m4Active. A failed main write keeps the old main and reverts to v6/flag-off (reason commit_write_failed). The offline grant runs at boot under v6 rules (= the ×1.0 first grant); the M4A-33 explainer shows at commit. Telemetry: save_migrated {from:6,to:6,migration:'tracksV7_marker'} (interim) / {from:6,to:7} (S-4), plus backup_stores.
- **Spec:** M4A-30/M4A-33 done in spec v1.8 (M4A-30, M4A-33, M4A-31(i); approved 22:04). Still open: the `{migrationId, raw}` record shape; QA heads-up before S-3.

## 2026-10-16 22:15 ADR M4-19..23 (Code Reviewer BLOCKER arch-m4-design-recheck-e845cf3; Architect decisions + HoE rulings 22:08; recorded by Senior Software Architect)
- **M4-19 Save ranking.** Stored copies rank by version, then committed (tracksV7/v7 with v6BackupId beats uncommitted), then valid savedAt (tie-break only). Applies to the newer-save check, LS-vs-IDB reconcile (pickNewest compares savedAt only today) and export. The IDB main put is conditional on this rank. REVISED (HoE 22:20, N1): rank = version → committed → saveSeq (monotonic counter, +1 per successful write, missing = 0) → savedAt. Main gets the same fix in a separate small save/ PR SQ-1 (Saves 3ba38cf3); M4 depends on it. ACCEPTED RISK (N4): deferral-session progress on a stale copy is dropped.
- **M4-20 Boot input and deferral.** The migration consumes the exact boot-read bytes and parsed state. If boot did not read IDB successfully (timeout, error, blocked), the migration is deferred for the session even if a later open would succeed (HoE), and the IDB mirror is disabled (LS-only saves). LS main is re-read before the backup; a change ⇒ deferral. IDB main is re-read just before commit; newer by M4-19 or a failed read ⇒ deferral idb_main_changed (spec (d1)8). `blocked` is a deferral (idb_blocked, attempt_count +1), not unavailable; unavailable = no_global|security, where security = SecurityError, InvalidStateError and private-mode errors (spec m4a-spec v1.9 M4A-31(f)1/(g)/(d1), M4A-34; HoP decisions.md 22:09). The disabled mirror is spec v1.9 AC (d1)7 (a deferral session never writes the IDB mirror).
- **M4-21 Commit write and guards.** The commit uses a dedicated save/ write returning per-store success, not Game.save, with no quota fallback that could write v7 to IDB; any skip or failure ⇒ commit_write_failed. All newer-save guards, validate, serialize and the IDB check use the session's limits (readMax / m4Active) instead of the constant SAVE_VERSION.
- **M4-22 Fresh farm.** A fresh farm on an M4 build (incl. corrupt-v7 recovery) is committed at creation with a new migrationId, no backup, and never touches an existing v6_backup. v6_backup is touched only by the migration path (HoE).
- **M4-23 Quota (scoped 22:15, N2).** After an abort, a normal save that hits quota first removes the leftover LS backup record whose migrationId equals this session's aborted attempt (never the record main's v6BackupId points to, and never the only pre-M4 backup), then retries once; if there is still no room, the save defers or fails visibly via the existing quota path, never by dropping that backup (HoE 22:20).
- §3d "M4-A commit is localStorage-only": ACCEPTED, see M4-24.

## 2026-10-16 22:11 ADR M4-24 M4-A commit is localStorage-only (HoE adopted m4-design §3d; recorded by Senior Software Architect)
- During M4-A (F-0, S-3) the v6 backup record and the committed save are written to localStorage only. IndexedDB is read-only for the boot read and the rank/newer-save checks. The IDB backup variant (m4-design §3c, M4-16 IDB write rules) is kept as the recorded alternative and returns in S-4.
- Conditions: (1) pre-attempt LS headroom check: free space ≥ max(2 × (new save bytes + v6_backup bytes), new + backup bytes + 64 KiB) (spec v1.10 (j) + HoE 22:20), verified by a trial write removed in a finally block; a leftover probe key is deleted at boot; in RESET_KEYS; failure ⇒ deferral save_migration_aborted{store: ls, reason: quota_headroom, attempt_count +1}, stay v6, never drop main/.bak/telemetry to make room. (2) A successful IDB boot read is still required; unknown ⇒ deferral (M4-20). (3) The IDB mirror resumes only after the commit is confirmed by read-back (main byte-equal, backup migrationId matches; spec v1.10 (k)); after a non-IDB abort (quota_headroom, readback_mismatch, commit_write_failed, idb_main_changed with a successful read) it resumes on the next normal save (HoE 22:20); after an IDB-unknown deferral it stays off. (4) Follow-up: S-4 restores the second backup copy in IDB at the real v7 bump.
- Spec: v1.10 (HoP 22:13) moved the IDB-write rows to S-4; 1500 ms covers the IDB open only.
- Risk (22:15, N5): M4-A has no IDB backup, and a same-page read-back does not prove the write reached disk. Step 3 of m4-design §3c and the two-store commit writer are S-4.

## 2026-10-16 22:35 ADR M4-24 amendment (HoQA review pr1-m4-design-review-cf66ce5 MUST 1–2; recorded by Senior Software Architect)
- Pre-commit read-back: the LS-only commit (marker/v7 write) happens only after the LS v6_backup is read back and its migrationId equals state.v6BackupId; otherwise M4-12 abort (stay v6, no marker, reason readback_mismatch). Separate from the post-commit read-back (condition 3).
- eggfarm.save.migration_attempts is a plain non-negative integer capped at N = 3 (stops incrementing, stuck_on_v6 set, never forced); never a serialized save; a parse failure or non-integer resets it to 0. eggfarm.save.headroom_probe falls under the same no-save-object rule (m4-design §3b).

## 2026-10-16 22:45 ADR M4-19 amendment: divergent copies (Code Reviewer 96c4a1e N1; HoE + Saves rule; recorded by Senior Software Architect)
- (SUPERSEDED 23:30, see revision below) Each copy records base = {saveSeq read at boot, idbUnknownAtBoot}. Copies have diverged if one was written with idbUnknownAtBoot and its base ≤ the other's saveSeq. Not diverged ⇒ normal rank (version → committed → saveSeq → savedAt). Diverged ⇒ if exactly one copy has idbUnknownAtBoot, the other wins regardless of saveSeq; otherwise higher saveSeq, then savedAt.
- (SUPERSEDED 23:30) The loser is never overwritten silently: kept in IDB eggfarm/save/diverged (one slot; if full keep the higher saveSeq, then later savedAt), save_copies_diverged emitted, offered via Export; Export of it or Reset clears the slot. Part of SQ-1 (Saves 3ba38cf3).
- F2: saveSeq is a safe integer 0..2^53-1 (else 0) in checksummed state, preserved by older/flag-off builds. F3: at the counter cap a one-time non-blocking notice offers Export save; stuck_on_v6 is a separate LS key not reset by the garbage-to-0 rule. Accepted: IDB main goes stale while the mirror is off. Restoring v6_backup also replaces IDB main (highest saveSeq).
- Spec m4a-spec v1.12: every failed attempt ([abort] or [deferral]) increments attempt_count, AC (h)6.

## 2026-10-16 22:50 Note: M4A-27 level clamp is data-driven (Senior Software Architect)
- The load/validate clamp and the egg-value search bound use balance.maxLevel (economy.csv → balance.json), never a hard-coded 30; L30+ content is coming. Test: raising the data max raises the clamp. Owners: S-1/S-4 (Saves), F-1 (Features).

## 2026-10-16 23:25 Note (HoQA 96c4a1e A-1..A-3; Senior Software Architect)
- Counting per spec v1.12: every failed attempt increments migration_attempts (cap 3, stuck_on_v6). idb_main_changed is a deferral everywhere. save_migration_aborted reasons are tagged [abort]/[deferral] in m4-design §5.

## 2026-10-16 23:30 ADR M4-19 revision (Code Reviewer BLOCKER 26f4024; HoE rulings 23:25; HoQA D-1/D-2; recorded by Senior Software Architect). Supersedes the 22:45 divergence/slot details
- base = {seq, idbUnknownAtBoot, forSeq}; trusted only if forSeq === saveSeq (older/flag-off builds that keep the field but bump saveSeq ⇒ ignored, plain ranking). Diverged only if the trusted unknown-at-boot copy has base.seq < the other's saveSeq (strict); then the other copy wins. Both-unknown cannot occur (IDB main is never written in an IDB-unknown session).
- One recovery slot IDB eggfarm/save/diverged holding the loser byte-for-byte. Order: newer-version check first (a refusing load never moves or writes/clears the slot, Export included) → slot write + read-back → only then overwrite the losing store. Slot replaced only by a higher-saveSeq loser; every replace/skip emits save_recovery_slot{action, seqs}. Slot write/read-back failure or skip ⇒ overwrite nothing, keep both copies, play the winner in memory, retry next load.
- The stuck notice's show-once flag is its own LS key eggfarm.save.stuck_notice_shown, never written on a refused load, in RESET_KEYS.

## 2026-10-16 23:35 ADR M4-19 revision 2 (HoQA 0cadbd5 D-1a; Code Reviewer 0cadbd5 F1/F2; recorded by Senior Software Architect)
- Not diverged if both copies carry a trusted idbUnknownAtBoot: plain ranking, slot untouched. (Equal-saveSeq clause REVISED 23:40, see F2-EQ below.) Pre-SQ-1 (a01faea-era) builds preserve saveSeq and base unchanged, so these rules keep rollback copies out of divergence. Replaces the "both unknown cannot occur" note.
- **SUPERSEDED** (by rev 4, 2026-10-16 23:55, two slots, no skip path): when the slot already holds a higher- (or equal-) saveSeq loser, the new loser is not moved and its store is not touched during divergence handling (save_recovery_slot{skip}).
- Guarantee wording: a loser is never overwritten except by a session continuing from it, or after it is durably in the slot. IDB save/diverged is in the m4-design §3b byte-identical list (exempt from the no-serialized-save rule as a save copy by design).

## 2026-10-16 23:40 ADR M4-19 revision 3: equal saveSeq (HoQA dcbd59e MUST F2-EQ, option (a); recorded by Senior Software Architect)
- Same saveSeq, byte-identical ⇒ not diverged, nothing moves. Same saveSeq, different bytes ⇒ diverged (checked before the both-unknown rule): the later valid savedAt wins; equal savedAt ⇒ the LS copy wins (primary store). The loser goes byte for byte into the slot with read-back before any overwrite; existing slot rules apply (replace only for higher saveSeq, else skip and leave the loser store untouched).

## 2026-10-16 23:55 ADR M4-19 revision 4: two recovery slots (HoQA ab4ca9f MUST SK-1; Saves design adopted per HoE; HoQA conditions; recorded by Senior Software Architect)
- Supersedes the one-slot/skip rule of rev 2–3. Slots: IDB `eggfarm/save/diverged` and `eggfarm/save/diverged2`; pre-SQ-1 builds never touch either.
- Loser goes to an empty slot, else replaces the lower-`saveSeq` slot (equal ⇒ `diverged`); equal by `sum` + state ⇒ dedupe, no write. Every slot write is read back; the loser store is overwritten only after a successful read-back; if both slot writes fail, nothing is overwritten.
- No skip path, so a rollback build can never destroy the only copy of a loser. Residual: a third divergence without Export evicts the lower-seq slot copy (not rollback-related); notice offers Export when both slots are full.
- `save_recovery_slot` gains `slot`. `diverged2` is on the §3b zero-writes list. Compatible with M4-24 (commit path untouched), F2-EQ, and check → slot write + read-back → overwrite.

## 2026-10-16 23:58 ADR M4-25: accepted risk: third-divergence slot eviction (accepted by HoE 2026-10-16; recorded by Senior Software Architect)
- Risk: with both recovery slots (`diverged`, `diverged2`) full, a third divergence evicts the lower-`saveSeq` slot copy, which may be the only remaining copy of that loser (m4-design §3c, ADR M4-19 rev 4).
- Decision: **accepted for rc1**, not designed out. Mitigation: the diverged notice offers Export whenever both slots are full.
- Rationale: it needs three divergences before any Export, and it is independent of rollback (SK-1 stays closed).
- Follow-up post-rc1: raise `save_recovery_slot` telemetry when both slots are full; candidate refinement from Saves (see status.md).

## 2026-10-17 00:05 ADR M4-19 revision 5 (HoQA 078edfb M-1..M-3, S-2; recorded by Senior Software Architect)
- Replace staging: a replace first copies the evicted slot copy to IDB `eggfarm/save/diverged_tmp` (read back), then writes the loser into the slot (read back), then deletes tmp; a failed slot read-back restores from tmp. Boot sweeps a stale tmp: delete only if it matches a slot or store copy by `sum` + state, else move it to an empty slot or keep it and show the notice. Pre-SQ-1 builds never touch it; it is on the §3b zero-writes list.
- Reset deletes `diverged`, `diverged2`, `diverged_tmp` and clears `eggfarm.save.diverged_notice_shown`.
- Diverged notice specified (trigger, copy, once-flag `eggfarm.save.diverged_notice_shown`, every-load Export offer when both slots are full); Export downloads all slot copies then clears them.
- All one-slot/skip wording removed doc-wide; M4-25 listed as §7 risk 13.

## 2026-10-17 00:10 ADR M4-19 revision 6 (recorded by Senior Software Architect)
- Boot sweep of `diverged_tmp` and the diverged notice run only after the refusal check; a refused load never sweeps, writes `eggfarm.save.diverged_notice_shown`, or touches any slot/tmp key.
- The sweep never runs while a slot read-back is unverified; tmp is deleted only after a read-back confirms a `sum` + state duplicate in a slot or store. With both slots full the sweep keeps tmp and shows the notice; it never evicts.
- §3b lists IDB `eggfarm/save/diverged_tmp` and allowlists `eggfarm.save.diverged_notice_shown` as a plain flag, never save data.

## 2026-10-17 00:15 ADR M4-19 revision 7 (HoQA e152960 M-4, M-5, S-5, S-6; recorded by Senior Software Architect)
- A replace never overwrites an occupied `diverged_tmp`: run the verified-duplicate delete first; if tmp remains, skip the replace (`{slot:'tmp', action:'write_failed'}`), loser store untouched, notice shown, winner keeps saving.
- Export clears slots/tmp only after a confirmed save or share (share promise resolved, or explicit "I saved it" for plain downloads); cancel/failure/unconfirmed clears nothing.
- Once-flag `eggfarm.save.diverged_notice_shown` = SHA-256 of the sorted `sum` set of present slot/tmp copies; re-shows when the set changes; plain value, never save data.
- Telemetry: `save_recovery_slot.slot` adds `'tmp'`, `action` adds `'sweep'`.

## 2026-10-17 00:20 ADR M4-19 revision 8 (Code Reviewer 3342918 a–d; HoQA 3342918 S-7..S-9; recorded by Senior Software Architect)
- Slot/tmp record = `{bytes, exportedAt}`; comparisons on `bytes`. Export marks `exportedAt` after a confirmed share or "I saved it" and never deletes; exported copies are evicted first; non-exported copies are never deleted by Export.
- Once-flag = `fnv1a:<hex>` FNV-1a over sorted `sum`s of non-exported copies (no crypto.subtle dependency); string compare; a legacy non-prefixed value re-shows once, then stable.
- F2-EQ refined: equal saveSeq + different bytes with exactly one trusted `idbUnknownAtBoot` ⇒ not diverged, known copy wins; neither/both ⇒ diverged.
- `write_failed` and the notice at most once per load; "Did you save?" only if starting the download didn't throw; clipboard fallback marks only on "I saved it".
- Rev 2 one-slot skip bullet marked SUPERSEDED.

## 2026-10-17 00:25 ADR M4-19 revision 9 (HoQA 8a2150c M-6, S-10, S-11; data-loss fixes only; recorded by Senior Software Architect)
- Supersedes rev 8's F2-EQ refinement: equal saveSeq + different bytes is always diverged. Exactly one trusted `idbUnknownAtBoot` ⇒ the known copy wins (flag decides, never savedAt), and the unknown loser takes the full slot path with `save_copies_diverged`. One ordering; F2-EQ never preempts slotting.
- Plain-string slot/tmp values read as `{bytes: value, exportedAt: null}`, never dropped.
- Export-mark write changes only `exportedAt`, is read back; on failure the record stays byte-identical.

## 2026-10-17 04:05 ADR M3-ECON-1: product/economy.csv is the single canonical shipping file (decided by Senior Software Architect, agreed by Head of Engineering)
- Context: #17 (F1) ships `data/economy.csv` = `product/economy.f1-m4cols.csv` (sha256 86f0e80e), so the release gate `npm run check-economy-copy -- --product --strict` fails with "data/economy.csv differs" against `product/economy.csv`. Options were repointing the check per release (filename or manifest-recorded source) or keeping one canonical file. A manifest-recorded source (proposed 04:03) was withdrawn by Head of Engineering.
- Decision: `product/economy.csv` is the one canonical shipping copy. `--strict` always compares `data/economy.csv` against `product/economy.csv`; there is no per-release repointing, no alternate filename and no source manifest for the CSV.
- Consequence: Economy promotes `product/economy.f1-m4cols.csv` (86f0e80e) byte-for-byte into `product/economy.csv` within ~15 min of #17 merging, and before the next rc tag. Until then the release gate fails on F1 by design; it is a pre-release gate only and does not block merging #17/#18.
- Variant files (`product/economy.*.csv`) stay working/staging copies and are never a release source.
- 2026-10-17 04:11: `product/economy.csv` was b294762e, a CRLF-only copy of main's `data/economy.csv` (same values). Economy rewrote it byte-for-byte from `product/economy.p1q.csv`; it is now 57d964d5 = `data/economy.csv`, with no number changes. `--product --strict` exits 0 on main.
- `product/economy.csv` must be LF-only and byte-identical to `data/economy.csv`. Enforced (CCR #26 m1): `--strict` compares raw sha256 of the two files (no BOM/line-ending normalising), so a CRLF or BOM copy fails the release gate; only the non-strict warn mode normalises. `.gitattributes` sets `*.csv text eol=lf` (renormalise was a no-op).
