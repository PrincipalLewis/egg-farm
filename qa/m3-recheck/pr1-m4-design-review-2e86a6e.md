# PR #1 recheck: engineering/m4-design.md @ 2e86a6e (v0.2.6) vs review 96e895b
Saves QA · 2026-10-16 · read via the GitHub API only (doc diff 96e895b..2e86a6e; code: src/sim/state.ts @ 3351d6c, src/build-id.ts @ a01faea). No browsers, no PR comments. Verdict: HoQA.

| Must | Status | § | Reason |
|---|---|---|---|
| M-1 ZW-2 is an S-4 prereq + in merge order | CLOSED | §8 S-4 row, §8 Ordering | S-4 depends on S-1, S-3, S-2, **ZW-2**. S-2 depends on ZW-2. The merge order starts "ZW-2, S-2, …". |
| M-2 which SHA flips ZW-2 | CLOSED | §3a.2, §9.11 | The Export ships in ZW-2, its own Saves PR before S-2. QA flips ZW-2 to PASS on the ZW-2 PR's SHA, not S-2's. Matches the HoQA ruling. |
| M-3 backup-failure test vs M4-12 | CLOSED | §3 Tests, §9.1 | The 6-step per-store test (ls, then idb): v6, no marker, one `save_migration_aborted{store}`, no dialog/toast while the v6 save works, a purchase survives page close, no leftover backup, retry commits. §9.1 is marked SUPERSEDED. |
| M-4 partial backup | CLOSED | §3 "Partial backup (ADR M4-13)", §9.11 | The aborted attempt removes its own LS/IDB backup. The retry writes a fresh one in both stores. Write-once applies only to a committed backup. Matches the ruling, and step 5 of the test is the oracle. |
| M-5 §3b = HoQA zero-writes rule | **OPEN** (wording) | §3b | Matches: save, .bak, v6_backup, corrupt.*, eggfarm.ui and IDB main/v6_backup stay byte-identical; only lease/tab/telemetry may be written; install_id is create-if-absent (an existing value stays byte-identical, so change or delete = FAIL); any other key = FAIL. Gaps vs "must match exactly": (1) "serialized save object" is not defined as **version+savedAt+state**. (2) It does not say **telemetry snapshot fields (farm_level, coinsBefore…) are OK**. As worded, "any copy of save bytes" could fail legit telemetry. (3) "Copy of a save or .bak" is weaker than "save bytes" only in wording; fine. |
| M-6 flag-off = main, testable pins | **OPEN** | §4 Per-flag golden 2, §6.1 | Trace hash CLOSED: sha256 of JSON.stringify(out), models seller15/cheapest × seeds 1..6 × 1800 s, 6000-tick 10 Hz trace seed 7, offline 5 400 000 ms, M4 fields stripped, re-pinned to a01faea (`GOLDEN_MAIN_A01FAEA`). **Storage-bytes check is not passable as written:** at 3351d6c `initialState` always adds `hensLevel:0, eggValueLevel:0, celebratedMilestones:[]` (state.ts:22-33), and `migrate()` spreads it into every loaded state. A flag-off save of an a01faea fixture therefore carries extra fields, so its sha256 cannot equal a01faea's. Either strip the M4 fields before hashing (as the trace does), or state that flag-off writes these defaults and pin the expected bytes. The "fixed clock" value is also not named (savedAt is in the bytes). |
| M-7 AC map + QA method | CLOSED | §6a | AC→test→slice/owner table (M4A-27..34, M4-9/12/13, ZW-2, M4-8, flag-off = main). The binding QA method covers 3 engines one at a time under flock, own port (never :4173), and a runtime BUILD_ID check vs the SHA (`m3-rc1-pre+<sha>`, no +dirty). The format matches `BUILD_ID_RE` in src/build-id.ts @ a01faea. |

## Nits
- N-1 slice labels: partly (§3 backup test labelled S-3/F-0; §6a gives slices). Other §3 test bullets are still unlabelled. Open, Nit.
- **N-2: CLOSED** (§3 Load order: the backup is written only for an unmarked v6; a marked v6 or v7 writes none).
- **N-3: CLOSED** (§5: `save_migration_aborted {store, reason, path}` is pinned, once per load; `backup_ok` dropped).
- N-4 (which copy Export returns when the newer save is only in .bak/IDB): open. §6a says "raw bytes equal stored eggfarm.save".
- N-5 (`data-version` = highest across copies): open.
- N-6 version label: fixed (v0.2.6).
- N-7 (guard default selectors, QA side): still to do in rc1-guard-save-qa-m4.mjs.

## New / regression check (96e895b..2e86a6e)
- No regressions found. All changes are additive or targeted to the findings.
- New Nit R-1 (§3b vs guard): §3b allows only the key `eggfarm.telemetry` and lists no IDB telemetry store. The guard allows `eggfarm.telemetry*` + IDB `*telemetry*`. Align them, either by narrowing the guard or by listing the exact key/store in §3b.
- New Nit R-2 (§3b): sessionStorage `eggfarm.playHere` is exempt. That's fine, but the guard does not snapshot sessionStorage, so this is consistent.
- New Nit R-3 (§6a M4A-27): "SAVE_VERSION 7" should read "readMax/writeVersion 7 with M4 on" to stay consistent with §3 (flag-off stays 6).
