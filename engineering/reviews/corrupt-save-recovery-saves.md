
## Saves & Persistence review: corrupt-save-recovery-spec.md v0.1 (D-HOP-2026-10-19-18), 2026-10-19
Reviewer: Senior Engineer, Saves & Persistence. Read-only, nothing committed.
**Verdict: GO-WITH-CHANGES** (B1–B4 must be resolved in v0.2 before build).

Baseline note: /tmp/qa-rc/ffc3dfd is checked out at c11e3a0, not ffc3dfd. `git diff ffc3dfd c11e3a0 -- src` is empty, and so is `c11e3a0..51351f0` for src/save, game.ts and main.ts. wt-t3-capped is now at 51351f0. The line numbers below therefore hold for all three. CCR #47 m1 (7ab3d3d) is an ancestor of ffc3dfd: sanitizeLevels → invalid_state (save.ts:208, :218, :223).

### OQ answers
- **OQ-2 (mirror tier).** Treat the IDB tier as `unavailable` unless `openForBoot` returned status `ok` and the post-flush re-read didn't fail (main.ts:72-74, :87; idb-mirror.ts:41-56). Private mode / no global → `absent` (idb-mirror.ts:42, :51). A paused mirror (game.ts:60-65; N6, game.ts:177-179) is still a valid *read* source: it is just older (pre-session v6 bytes). Restore it and accept the lag. Don't pull IDB v6_backup forward. The localStorage v6_backup tier covers the pending-migration case.
- **OQ-3 (IDB blocked/timeout).** Don't add waiting. Keep the existing bounds: 1500 ms open + 1500 ms read (idb-mirror.ts:16-17, :49, :54), the 300 ms flush (main.ts:82) and the 1500 ms re-read (main.ts:87), so ≤ ~4.8 s in the worst case. The lease heartbeat is 2 s and the stale timeout is 6 s (tab-lease.ts:3-5), so a longer wait risks a takeover mid-boot. On `unknown`:
  - (i) If .bak is valid, restore it. It is an LS-only write, and the mirror stays off for the session as in N6.
  - (ii) If .bak is invalid or absent, **defer**: no v6_backup/fresh commit, no save, show a "Couldn't load your farm, Try again" notice. Reason: a fresh M4 farm is committed at creation (game.ts:75) with a new savedAt, so on the next boot `pickNewest`/`rankCompare` (idb-mirror.ts:95-104) could rank it above the real IDB farm and overwrite it.
- **OQ-4 (cap 3).** Don't preserve v6_backup into corrupt.* at all. It stays in its own key (CSR-5), which leaves ≤ 3 per boot (main, .bak, IDB). Dedupe by bytes: IDB identical to LS main is preserved once. Keep oldest-first eviction (save.ts:247). Don't pin the first-ever copy: older boots' copies are less useful than this boot's, and pinning would leave only 2 slots. CORRUPT_KEEP stays 3 (quota).
- **OQ-6 (v6_backup re-runs migration).** Yes, and that's correct. The record's raw is pre-migration and has no tracksV7/v6BackupId, so validate() marks it tracksMigrated → pending + mirror paused (game.ts:60-65) → startTracksMigration (main.ts:134) writes a *new* record with a new migrationId and the same raw (game.ts:203-206). It is still the normal path. Two follow-ons:
  - CSR-5 should say "replaced only by a committed migration; byte-identical on defer/abort".
  - Run-once: the marker is absent, so the M4A-33 explainer shows again. That's acceptable; confirm with Art & UX.
  
  Level tolerance: the raw goes through sanitizeLevels (save.ts:218, :223), so "12" is accepted, and a bad level gives invalid_state → next tier/fresh. That is never a silent 0.
- **OQ-7 (ownership).** Yes. One pure `loadSafe(kv, b, now, idb: {status, raw, reason})` should own order, preservation and a returned `{source, tried[], recovery}`. Game only emits telemetry from it (game.ts:66-70). Shrink `reconcile()` to the non-corrupt stale-LS case (`save_restore`). Today reconcile writes LS main *before* loadSafe (main.ts:93; idb-mirror.ts:108-116), so the split is what causes B1/B2.

### Blockers / required changes
- **B1 (CSR-3, likely the OQ-1 silent path).** Corrupt LS + valid IDB: reconcile preserves the corrupt copy and writes IDB into main (idb-mirror.ts:113-114). loadSafe then sees a valid main → `recovery: null` (save.ts:284-285) → no dialog and no save_corrupt (game.ts:66). That is a silent restore today. Fixed by OQ-7.
- **B2 (CSR-2 order conflict).** In code, the effective order is IDB before .bak (reconcile runs first). The spec says .bak → IDB, while D-HOP-18 said "newest first: IDB". Recommendation: rank .bak vs IDB with the existing `rankCompare`/savedAt (idb-mirror.ts:103-104), tie → .bak, then v6_backup, then fresh. Fix the CSR-2 matrix to match.
- **B3 (OQ-3).** Needs a decision plus new "Try again" notice copy (no-write deferral). CSR-13 is untestable until then.
- **B4 (copy).** CSR-8/9 are placeholders. Copy is needed for: Restored-from-v6_backup ("some progress may be missing"), Fresh, Try-again (B3), and Restored + Can't-save combined. The spec must also say whether this reuses the AC14b dialog (save-recovery.ts:30-38) or replaces it.
- **Multi-tab lease.** All recovery writes (preserveCorrupt, LS main write) must happen only after `lease.claim` and the `owns()` check. Today reconcile writes at main.ts:93, before the re-check at :94. Move it after :94 (or into loadSafe within Game, after :94). A tab that loses the claim must not preserve or write.
- **Read-only/newer.** OK as specced: `newerStoredVersion` runs first (save.ts:272, main.ts:75-76, :88-89). It checks main/.bak/IDB only (save.ts:95). The spec should state that a v6_backup raw with version > 6 counts as `invalid (version)`, not newer.
- **storageBlocked / SD6-1 / CSR-14.** main.ts:102 only sets outcome 'storage' when `recoveryOutcome === null`, so a restore plus a refused lease write shows Restored with no Can't-save dialog. The spec must define the combined case. The notice-hold ordering conflicts between decisions.md:52 (deferred while the dialog is open) and SD6-1 (never held, status.md:368, :448), so the spec should cite which one wins. NO_STORAGE_TEXT is at main.ts:50.
- **Wording.** CSR-7 lists the v6_backup record as preserved, which contradicts the OQ-4 recommendation; drop it. CSR-11 says "all four invalid" but "tried lists 3". Make it 3 sources plus main. CSR-10 `tried[].result='unavailable'` needs `reason` from the idb_* classes.
- Testable as written: CSR-1, 4–6, 9, 10, 12, 14–16. Use KV stubs plus fake IDB and a fake clock; the CSR-15 property test can use validate() mutations.

## v0.2 re-check (2026-10-19, Saves)
**Verdict: GO-pending-HoP.** Every v0.1 Saves item is resolved. CSR-13, the M4 "Try again" copy and CSR-6's `unavailable` clause wait on HoP (OQ-3). The v6_backup auto-restore (CSR-4, and M2 copy wording) waits on OQ-5. Neither counts as a Saves blocker.

| v0.1 item | v0.2 | Status |
|---|---|---|
| B1 silent IDB restore | CSR-3 (spec:33) + Ownership (spec:28) | Resolved |
| B2 order | §1 tier A rankCompare, tie → .bak (spec:26), CSR-2 matrix (spec:32). Matches save.ts:47-51 (version, committed, seq, savedAt) | Resolved |
| B3 IDB unknown | CSR-13 (spec:48) | Proposal correct, pending HoP |
| B4 copy | CSR-9 M1–M5 reusing AC14b (spec:39-44) | Resolved structurally; strings with Art & UX |
| OQ-2 / 4 / 6 / 7 | spec:27, :37, :34-35, :28 | Resolved as recommended |
| CSR-5 / 7 / 10 / 11 | spec:35, :37, :45, :46 | Resolved (3 vs 4 sources wording fixed; idb_* reasons added) |
| owns()-gated writes | CSR-8 (spec:38) | Resolved |
| v6_backup > v6 = invalid(version) | CSR-1 (spec:31) | Resolved (save.ts:95 doesn't check v6_backup) |
| storageBlocked + restored | CSR-14 M5 (spec:49) | Resolved. decisions.md:52 (10-17 08:13) is later than status.md:448 and matches code: main.ts:99 holds notices when storageBlocked |
| HoE 07:14 order | spec:28, :45 | Resolved |
| CSR-1 invalid_state | spec:31 (save.ts:208/:218/:223) through the full order | Resolved |

New, non-blocking implementation notes for the build (no spec change needed, or a one-line one):
1. **Mirror stays live after an `unknown` boot.** `openForBoot` returns a non-null mirror with status `unknown` when the read fails (idb-mirror.ts:55), and the re-read failure at main.ts:87 keeps `mirror` too. In a normal session, the first save writes IDB (game.ts:250). For CSR-13's ".bak restore, mirror off for the session", Game must set `mirror = null` (and not just rely on N6 `mirrorResumeOnSave`, which applies only to migration deferrals, game.ts:175-179). Add a CSR-13 test: no IDB put after a .bak restore with IDB unknown.
2. **"Pure" loadSafe (spec:28).** loadSafe writes (preserveCorrupt, LS main restore), so it isn't pure. Suggest "single owner". It runs inside `new Game` (main.ts:95), after the owns() check at :94, which satisfies CSR-8 once reconcile at main.ts:93 is folded in. Game already receives `idbBoot`/`idbAbsentReason` (main.ts:95; game.ts:20), so the `idb: {status, raw, reason}` input needs no new plumbing.
3. **Dedupe (CSR-7) is new code.** preserveCorrupt has no byte check (save.ts:241-250). Do the dedupe inside loadSafe per boot, not in preserveCorrupt, so the existing tests for the existing index stay unchanged.

## CSR-17 pre-assessment (2026-10-19 ~10:00, Saves): spec v0.3 §6 vs main dd223f5
Read-only. I used `git archive dd223f5` into /tmp/csr17-dd223f, so no worktree was created in the game repo. Nothing committed.
**Recommendation: GO-with-conditions** for buildability (C1–C6 below). Schedule: about 10 h on top of M41-7. Cut to M4.2 if M41-7 isn't green by ~15:00 or if C1–C6 aren't accepted at the 12:00 gate.

**Drift ffc3dfd → dd223f5.** `git diff --stat ffc3dfd dd223f5 -- src` shows 3 files, +11/−6. src/save/*, src/sim/*, game.ts and formulas.ts are unchanged, so every save.ts, game.ts, sim and formulas line in §6 holds. main.ts changed only on the mountApp line (it now passes `storageBlocked: () => lease.storageBlocked || g.storageFailed`), which helps C5. Nits: `rankOf` is at save.ts:41-45, not 40-44. The celebratedTier dispatch is at app.ts:517-520.

**Fixture check.** OQ1-farmLevel-abc-nobak.json: I recomputed the FNV-1a sum, and `c9ece8d1` matches `sum`. tracksV7 is 1 and v6BackupId is set, so it is marked and no migration runs. That makes CSR-17-1 (F → 15) consistent.

### (1) Fit in validate / loadSafe
- The level failure is separable. `sanitizeLevels` (save.ts:208) is the only level check, run at :218 (pre-migrate) and :223 (post-migrate). The other `invalid_state` sources are distinct: NUM_FIELDS at :222 and customers/workers at :224. Implementation: a per-field `badLevels(st)` returning keys, then repair at :218 with bounds from the *original* `d.state` (only valid fields), then the unchanged :219-:229 path.
- Checksum (:217) runs before the level step. Every current save carries `sum` (serialize at save.ts:143), so CSR-17 only ever repairs app-written bad values or pre-rc0 saves without a sum. Bit-rot fails `checksum` and takes the chain. That is correct and should be stated in 17.1.
- **Repair must be opt-in** (`validate(raw, b, now, {repair: true})`) and used only by loadSafe for main. validate() is also used by pickNewest/reconcile (idb-mirror.ts:96-99), save rotation (save.ts:176) and the v6_backup tier, and they must keep seeing `invalid_state`.

### (2) LEVEL_FIELDS (save.ts:204)
- `farmLevel`, `collectionLevel`, `hensLevel`, `eggValueLevel` are the complete list of *level* fields (state.ts:8, :20). Workers have no levels (energy/cdS, workers.ts:9).
- Related tier fields are not validated today and are not in the list: `graderTier` (save.ts:81), `celebratedTier` (:79) and `celebratedMilestones`. They should stay out of the repair list, but every bound read from them must be guarded: graderTier an integer in 1..tiers.length, celebratedTier in 0..3, worker entries known ids with object values, milestones per 17.2's regex. Otherwise they imply nothing.
- Above-max tolerance is unchanged (save.ts:199-206): levels > maxLevel, floats (floored) and "12" are valid and never repaired. "2.5", "", null, negatives, NaN/Infinity, bools, arrays and objects get repaired. With 4 fields, "> 3 bad" means all four.

### (3) Bounds (§6 17.2)
- **F ≥ H − 3 is sound in release (Q-S1).**
  - Hens is bought only below the cap: `buyTrack` refuses at `trackLock` (actions.ts:34-35), cap = min(maxLevel, F + capOverFarm) (formulas.ts:115, capOverFarm 3 at balance.json:199).
  - Migration sets H = F (migrate-v7.ts:27-28). Stored F > max migrates at Fe = min(F, max), so H ≤ F (migrate-v7.ts:43-46).
  - Refunds only add coins (migrate-v7.ts:33). clampL never raises (formulas.ts:49). There is no save import path.
  - F only rises: actions.ts:31.
  - Exceptions:
    - The debug panel `f-` lowers F (panel.ts:30). It is dev/QA only, loaded under IOS_FLAG_ENABLED (main.ts:120-124) and dead-code-eliminated in release. QA saves made with it can violate the bound, so they must not be used as CSR-17-5 property fixtures.
    - capOverFarm is a CSV parameter. If a future build raises it, its saves loaded in this build could repair F slightly too high. Condition C6.
- **Excluding F ≥ V − 3 is correct.** Migration price-matches V with no cap (migrate-v7.ts:5-6, :27), so V can exceed F + 3.
- Other F bounds are sound and data-driven with no circularity, because they read stored records, not recomputed levels: celebratedTier → 5/10/20 (state.ts:52); workers unlock_farm 3/7/8 and grader tiers[0].farm 18 (workers.ts:30, actions.ts:63); graderTier n → tiers[n−1].farm (actions.ts:70); grade:20 → minFarm 15 and balanced:t → balanced[t−1].level (tracks.ts:33-34, formulas.ts:126).
- celebratedMilestones is monotonic: seeded at migration (migrate-v7.ts:35) and only appended (actions.ts:61). It is absent in flag-off unmarked saves (flagOffShape, save.ts:158-162), where it implies nothing, which is safe.
- H/V bounds from hens:/grade:/balanced: are sound.
- C has no bound, so it repairs to 0. That is unambiguous but always a visible loss, so the notice must list it.
- Using "no chaining" with only fields that were valid on load gives a single pass with no fixpoint (CSR-17-2's F = 10 is correct).

### (4) Interactions
- **Order (PM decision): any valid .bak/IDB beats repair; repair runs before v6_backup/fresh.** That's simpler than 17.6. Delete the rank comparison. **CSR-17-8(b) contradicts it** (".bak one save behind → repair wins") and must be rewritten. Also, (c) IDB bytes identical to the corrupt main are invalid per CSR-3, so repair runs.
- **IDB unknown (CSR-13, pending HoP).** "Valid IDB beats repair" can't be evaluated then. A repaired write gets saveSeq + 1 (save.ts:155), so on the next boot it would outrank a possibly valid IDB copy (rankCompare, save.ts:47-51). Condition C3: under IDB unknown, repair follows CSR-13's decision.
- **Unmarked v6 save with a bad F (C2).** validate sets `preTracksRaw = raw` (save.ts:220). Game makes that the v6_backup raw (game.ts:61; written at :206), so the backup would hold the *invalid* original bytes. Set preTracksRaw to the serialized repaired v6 file. The original bytes go only to corrupt.*. A marked save keeps tracksV7/v6BackupId untouched.
- **Checksum/saveSeq.** The repaired state is written by Game's load save (game.ts:87) through serialize, which gives a new sum and saveSeq + 1. Fine once tier A has already lost.
- **owns(), read-only, newer.** The newer check precedes everything (save.ts:272), so a newer save never repairs. Writes happen in Game after owns() (CSR-8 / CSR-17-9). Fine.
- **storageBlocked (C5).** Repair applies in memory, and the notice plus no-storage notice show. preserveCorrupt fails, so this is case-Q semantics: Export takes the original bytes from memory. main.ts:102 only sets 'storage' when `recoveryOutcome === null`, so repair needs its own outcome (e.g. 'repaired') and must still get the no-storage notice (dd223f5 main.ts mountApp `storageBlocked`).
- **corrupt.\* cap/dedupe.** One copy (main), plus any invalid .bak/IDB already preserved by CSR-7. That stays within cap 3.
- **Never a silent 0.** A repaired 0, which is always the case for C, is only acceptable because the notice lists every reset field. CSR-15 must add the CSR-17 notice to its allowed messages (today M1–M5 only).

### Q-S answers
- **Q-S1:** Yes, safe in release (evidence above). Exclude debug-panel saves from fixtures (panel.ts:30), and add C6 for capOverFarm.
- **Q-S2:** Yes. The opt-in repair inside validate at save.ts:218, called only by M41-7's single-owner loadSafe for main between tier A and v6_backup, fits. migrate (:219) then price-matches from the repaired F. Plus C2 (preTracksRaw).
- **Q-S3: Fire both.**
  - `save_corrupt {reason:'invalid_state', recovered_from:'repair', tried, restored_from_backup:false, had_backup}` keeps the CSR-10/CSR-15 contract (every invalid main produces exactly one save_corrupt) and the corruption-rate dashboards.
  - `save_repaired {fields, count, version}` carries the detail.
  - Dashboards that sum restores must add 'repair' to recovered_from.
- **Q-S4: Confirmed moot, and refuted as a safeguard.**
  - Under the PM order, when repair runs .bak is absent or invalid.
  - On the first post-repair save (game.ts:87), main is still the corrupt bytes, so save.ts:176 doesn't rotate (it requires `validate(cur).ok`).
  - From the second save on, rotation copies the *repaired* main over an invalid .bak. Those bytes were already preserved by CSR-7 before any write.
  - Holding rotation (game.ts:70 sets bakAllowed false whenever !restored_from_backup) protects nothing. It only leaves the repaired farm with no .bak for 60 s / one purchase. Recommend bakAllowed = true after repair.
  - Exception: if preserving the invalid .bak failed (copy_failed), keep bakAllowed false, so the only copy of those bytes isn't overwritten.

### (5) Tests and effort
- **Unit (Saves):**
  - eligibility matrix: each of the 4 fields × each bad kind (null, −1, NaN, "2.5", "", true, [], {}), 1/2/3/4 bad;
  - non-level failure plus a bad level → chain (NUM_FIELDS, customers, workers, checksum);
  - table-driven bounds, each alone and combined, including malformed graderTier/celebratedTier/milestones/worker entries implying nothing;
  - the F0/V12 migrated fixture → F 0;
  - CSR-17-1/-2 fixtures;
  - above-max/"12"/float not repaired;
  - an unmarked v6 save with a bad F → migration from the repaired F, with v6_backup raw = repaired v6 (C2);
  - order: valid .bak, valid IDB, IDB-identical, both invalid, IDB unknown (per HoP), then v6_backup/fresh only when not eligible;
  - preserve once (dedupe/cap); quota → in-memory repair + notice;
  - lease lost / second tab / newer → no writes;
  - telemetry exactly once each, no values;
  - bakAllowed per Q-S4;
  - property test "repaired ≤ original" over random valid release-reachable saves, generated by action sequences, not the debug panel.
- **UI:** a toast with the item list and Export link; storageBlocked combined case.
- **rc0 browser:** OQ1 fixture on 3 engines (notice, coins kept, no dialog).
- **Effort beyond M41-7:**

  | Work | Hours |
  |---|---|
  | validate split + bounds module | 3 |
  | loadSafe step + preTracksRaw + telemetry + bakAllowed | 2 |
  | unit + property tests | 3 |
  | review fixes | 1 |
  | UI toast/Export | ~1.5 |
  | rc0 fixture | ~1 |
  | **Total** | **~11.5 (Saves ~9)** |

### Conditions for v0.3 (gate 12:00)
- C1: rewrite 17.6/CSR-17-8 to the PM order (any valid .bak/IDB wins, no rank comparison); 17-8(b) is wrong as written.
- C2: preTracksRaw = repaired serialized v6 for unmarked saves; the v6_backup never stores the invalid bytes.
- C3: IDB unknown follows CSR-13's HoP outcome (no repair write that could outrank an unread IDB copy).
- C4: repair is opt-in to validate, used only by loadSafe for main; CSR-15 lists the CSR-17 notice; save_corrupt{recovered_from:'repair'} plus save_repaired.
- C5: a 'repaired' outcome, plus the storageBlocked combined case (in-memory repair, no-storage notice, Export original bytes).
- C6: bounds read this build's capOverFarm and malformed tier/milestone/worker fields imply nothing. Any future capOverFarm increase must note CSR-17 bound (a) in its ADR.
- Q-S4: bakAllowed = true after repair unless copy_failed.

## M41-7 buildability (2026-10-19 ~10:15, Saves): spec v0.2.3 (= v0.3 minus §6) + art-ux/copy/csr9-recovery-copy.md vs main dd223f5
**Verdict: buildable on dd223f5, GO-with-clarifications.** No code blockers. The save/sim/game code is identical to ffc3dfd (`git diff --stat ffc3dfd dd223f5 -- src`: only main.ts mountApp gains `storageBlocked`, plus UI files), so the spec line refs hold. The gaps G1–G10 below need one-line answers. None of them stops starting with tests. The ones I can default, I default as stated unless told otherwise.
**Estimate about 14 h total, which does not fit the 20:00 cap for one engineer starting ~10:30.** Proposal: Saves does the core (S1–S5, about 10 h) and the UI engineer takes the dialog/copy layer (U1, about 3 h) in parallel against a `RecoveryCopy` contract I publish first. Alternatively, CSR-9b/9a copy rendering slips.

### Plan / hours
| # | Work | h |
|---|---|---|
| S1 | Tests first: loadSafe matrix CSR-2/3/6/11/13/13a/13b, dedupe CSR-7, prevLevel CSR-9a-1..4, telemetry CSR-10, lease CSR-8, property CSR-15 (fake KV + fake IDB + fake clock) | 3.5 |
| S2 | loadSafe single owner: `loadSafe(kv, b, now, idb:{status,raw,reason})` → `{file, source, tried[], recovery, outcome}`. Tiers A (.bak vs IDB by rankCompare, tie → .bak) → B (decodeBackup → validate) → C fresh / defer. Per-boot dedupe. prevLevel. reconcile reduced to the stale-LS case (save_restore). `validate(raw, b, now, opts?)` with a no-op `opts.repair` hook (CSR-17 later, off by default) | 3 |
| S3 | Game/main wiring: reconcile call moves out of main.ts:93 into loadSafe within `new Game` (after owns() :94). Defer = read-only Game (no load save at game.ts:87, sim frozen, like refuseNewer). IDB-unknown + .bak restore → `mirror = null`. save_corrupt fields. bakAllowed after idb/v6_backup restore (CSR-16). M5 at main.ts:102 | 2 |
| S4 | Existing-test updates: unit tests + scripts/ac14-browser.mjs, recovery-v11-browser.mjs, rc0-browser.mjs assert the current AC14b strings ("Welcome back!", "Keep farming", "We couldn't open your farm…", src/ui/save-recovery.ts:33-41). These are test edits, not fixture/golden edits | 1 |
| S5 | Gates: tsc, unit (forks 1/2), build, check-globals, flag-off golden, test:slow, rc0 on 3 engines + review fixes | 2 |
| U1 | recoveryCopy M1–M5, M2 variants (CSR-9a), {age} formatter (CSR-9b), notice telemetry shown/dismissed, Try-again reload, layout reuse | 2.5 |
| | **Total** | **~14** |

### Gaps / contradictions (need an answer; my default in brackets)
- **G1 M5 vs CSR-14 Export.** The copy shows M5 with no link ("—"), but CSR-14 requires "Restored outcome with the Can't-save line/**Export of the current farm**", and the AC14b v2.2 cantsave variant has Export (save-recovery.ts:33-34). [Default: keep the Export secondary on M5, since it's the only way to keep progress while saving is paused. Art & UX to confirm.]
- **G2 Outcomes not covered by M1–M5.** Today's case Q (fresh + corrupt copy failed, save-recovery.ts:38-39), fresh + storageBlocked, the v2.2 cantsave with no recovery (main.ts:102), and restored + copy_failed (current body "Export the old save now to keep it", :35-36). [Default: Q and fresh+storageBlocked keep the existing v2.1 'storage' / v2.2 'cantsave' copy unchanged. Restored + copy_failed uses M1/M2 + an Export secondary link. Needs Art & UX confirmation.]
- **G3 "Link only when a corrupt copy exists".** It's ambiguous: preserved in corrupt.*, or raw bytes in memory? M1/M2 show no link even though a corrupt copy always exists there. [Default: M3/M4 show the link when raw bytes are in memory (as today, `canExport = !!(r.raw || r.live)`, save-recovery.ts:54). M1/M2 show it only on copy_failed (G2).]
- **G4 CSR-13 defer has no exit rule.** "Try again" reloads. If IDB stays unknown (blocked by another open connection, a stuck engine), the player loops on M4 forever and the M4 Export is the only escape. [Default: no auto-escalation in M41-7, only telemetry `recovered_from:'deferred'` per boot so we can see loops. Flag for HoP if a counter is wanted (it would need a new key, which CSR-9a's reasoning rejects).]
- **G5 CSR-13b "no other key changed" is too broad.** It conflicts with writes that happen before or regardless of recovery: the lease record (tab-lease.ts:39, claim at main.ts:90), `eggfarm.telemetry` (telemetry.ts:68), install_id (game.ts:49) and the headroom-probe cleanup (game.ts:86). The refused-newer path has the same exemptions (main.ts:60-61). [Default: "no **save** key changed" means main, .bak, v6_backup, IDB, unload and RESET_KEYS (save.ts:112), with corrupt.* the only allowed write. The probe cleanup is skipped on defer, as it is on read-only.]
- **G6 Two different dedupe rules.** CSR-7 is per boot (identical bytes preserved once). CSR-13 (HoP 07:19) is cross-boot ("skipped if identical to the newest corrupt.* entry"). On a defer, main and an invalid .bak are both preserved, so the newest entry is the .bak copy. Every Try-again would re-copy main and churn the cap-3 index (save.ts:247), eventually evicting the earlier copies. [Default: dedupe against **all** indexed entries (≤ 3 reads) plus per boot, for every recovery, not only defers. preserveCorrupt stays unchanged and the check lives in loadSafe.]
- **G7 Main missing + IDB valid.** CSR-1 triggers recovery for a missing main only when .bak is invalid. So a missing main + no .bak + valid IDB (for example Safari evicting localStorage) stays the silent stale-LS reconcile (`save_restore`), while missing main + invalid .bak + valid IDB shows M1. [Default: as written, per CSR-1/CSR-10 "save_restore for non-corrupt". Please confirm that's intended.]
- **G8 Telemetry enums undefined.**
  - `save_recovery_notice_shown/_dismissed {outcome, source}`: is `outcome` M1..M5 or restored/fresh/storage/deferred? [Default: `notice: 'M1'..'M5'|'storage'|'cantsave'` plus `source`.]
  - `restored_from_backup` / `had_backup` semantics for the idb/v6_backup restores. [Default: restored_from_backup = true for bak|idb|v6_backup. had_backup = .bak present (unchanged meaning, so dashboards don't shift).]
  - `tried[].reason` for a failed IDB *re-read* can only be `idb_read_error`: readStrict returns undefined for both timeout and error (idb-mirror.ts:59-60, main.ts:87). `idb_timeout` is reachable only on open. [Accept, document.]
  - `restored_version`: the stored version before migrate. `migrated`: CSR-4 path (f.tracksMigrated).
- **G9 CSR-9b {age} clock.** The age uses the v6_backup raw's savedAt. loadSafe's validate runs with now = 0 today (no pre-2020/future checks, save.ts:225-229), and Game re-checks at game.ts:52. [Default: age only when `validSavedAt(savedAt, now)`, else fallback. A future savedAt within the skew window → "a few minutes".]
- **G10 CSR-9c explainer after M2** is marked "post-freeze M4, NOT part of B". [Default: out of M41-7 scope. The existing queue-behind-dialog rule (tracks-explainer.ts modalOpen retry) already covers it, with no new code. Confirm.]

### Checked, consistent (no action)
- **CSR-9a prevLevel chain.** It is buildable: strict integer ≥ 0 from the main bytes, then from the .bak bytes, then unset. It is reachable only when tier A failed, so the .bak bytes are by definition invalid elsewhere. {level} = the restored copy's farmLevel, which the migration doesn't change; F > maxLevel is shown as stored. CSR-9a-1..4 are unit-testable.
- **Copy keys.** M1–M5 map 1:1 to spec CSR-9 (spec:48-55), M2 variants to CSR-9a, {age} to CSR-9b, and the "about"-in-{age} rule matches.
- **corrupt.\***: ≤ 3 per boot (main/.bak/IDB). v6_backup is never copied. Cap 3, oldest-first. RESET_KEYS doesn't list corrupt.*.
- **CSR-13 mirror null.** The live mirror on unknown (idb-mirror.ts:55; main.ts:87) is handled in S3. CSR-13a is testable with a fake IDB put counter.
- **SAVE_VERSION stays 6.** No economy, golden or fixture changes are needed. The flag-off golden must stay byte-identical, which S5 checks.
