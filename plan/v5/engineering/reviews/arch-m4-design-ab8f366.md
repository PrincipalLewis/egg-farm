# Design review: PR #1 arch/m4-design @ ab8f366 (m4-design v0.2.7 + ADRs M4-1..13)
Read-only, docs only. Worktree /workspace/review-ab8f366 (detached). Earlier targets: 96e895b, then 2e86a6e (worktrees kept, not reviewed to completion).
Claude: 1 counted call via the wrapper (sonnet/high, PASS_ID pr1-m4-design-ab8f366). Two earlier calls on the superseded heads were killed with no output and weren't counted. I checked each Claude claim against the docs, the spec and src.

**Verdict: CHANGES REQUESTED.** 0 blocking (it's a design doc), 4 major, 5 minor, 3 nit. The (f)1 question is resolved in substance. The remaining problems are in how the abort/retry is specified.

## Answer: do M4-10/11 and §3a.5 override (f)1?
- **No, not any more.** Up to v0.2.4, M4-5/9.1 ("keep playing migrated, never drop in-memory state") and M4-10/M4-11 ("IDB best effort", "v7 commit waits for the LS write") contradicted spec M4A-31(a)/(f)1. That is what 677317d implemented (review M1/m2).
- ADR M4-12 (decisions.md:32-37) supersedes them and states (f)1: a failure in either store aborts, the save stays unmarked v6 and is saved normally, and the migration retries next load. M4-13 (decisions.md:39-43) adds the partial-failure cleanup.
- m4-design §3 (m4-design.md:72-80), §3a.5 (:139-141), §9.10/9.11 and the task table (S-3, F-0) all follow (f)1. The M4-10 and M4-11 headings are marked "SUPERSEDED by M4-12".
- **Leftover literal contradictions** (nit N1):
  - The M4-5 entry (decisions.md:10) isn't marked superseded.
  - M4-11's body still says "v7 commit waits for the LS write" (decisions.md:29).
  - m4-design.md:50 and :138 say "write-once / never overwritten" without M4-13's "committed backups only" qualifier.

## What changed 96e895b → 2e86a6e → ab8f366
- **2e86a6e (v0.2.6):** ADR M4-13 (partial backup removed, write-once only once committed) and the §3b zero-writes key list. The backup-failure test plan was rewritten (no dialog while the v6 save works; no leftover backup; retry). The stale 9.1 is marked superseded. ZW-2 is now ahead of S-2/S-4. §6a adds the AC→test map plus the QA browser method. The flag-off golden is re-pinned to a01faea.
  - This fixed the issues I'd found on 96e895b: the stale "dialog → toast; play continues" test (old m4-design.md:91), the unmarked 9.1, and the partial-backup gap.
- **ab8f366 (v0.2.7):** §3b now has an exact list of keys that may be written and a definition of a "serialized save". data-version and Export use the highest newer copy (N-4). Tests are tagged with their slice. The storage-bytes golden gets a fixed clock and the M4 default fields.

## Findings
### MAJOR 1: the aborted session's game rules are undefined (m4-design.md:72-78; spec (f)1 "the v6 game runs normally")
- After an abort, an M4-on build holds an unmarked v6 state with hensLevel/eggValueLevel 0 (migrate spreads initialState, src/save/save.ts:~35). Nothing says whether M4 formulas and the tracks UI run that session.
- If they run, the economy regresses (H = 0). If the player buys Hens or Egg value, the next successful migration overwrites those paid levels (steps 1-2, :62-63), because only `tracksV7` marks a farm as migrated.
- Fix: an aborted session runs with flag-off rules and the track UI hidden. State this in §3 and test it.

### MAJOR 2: committed and aborted backups can't be told apart (M4-13: decisions.md:40; m4-design.md:79)
- "Write-once applies only to a committed backup" needs some way to tell, and none is defined. M4-13's cleanup can itself fail: localStorage removeItem can throw, and the IDB delete is async and may not finish before pagehide.
- A leftover backup then makes the retry treat a stale backup from an earlier attempt as the committed write-once copy. The player kept playing v6 after the abort, so that backup is older than what is actually migrated, and rollback would lose that progress.
- Fix: define "committed" as main being marked or v7, and "valid backup" as byte-equal to the unmarked v6 being migrated. Otherwise overwrite. Also say the cleanup removes only what this attempt wrote.

### MAJOR 3: no IndexedDB means the player never migrates (m4-design.md:78, :141)
- "Both stores must succeed" plus `IdbMirror.open` returning null when IDB is missing, blocked or times out after 1.5 s (src/save/idb-mirror.ts:~21) means private-mode and blocked-IDB players abort on every load, forever.
- Decide whether "IDB unavailable" counts as a failure, and say whether M4A-31(f)1 needs a Product amendment.
- Also specify the mechanism. The Game constructor is synchronous, and `IdbMirror.write` is fire-and-forget with no keyed success result. A confirmed two-store write therefore has to happen in `boot()` before `new Game`, which neither S-3 nor F-0 says.

### MAJOR 4: backup before validation (load order, m4-design.md:69)
- "write v6_backup → migrate → validate" can lock corrupt or out-of-range bytes into the write-once slot. In code, `validate()` runs `migrate()` before its range checks (save.ts:~112-118).
- If the copy that loaded came from `.bak` or IndexedDB (reconcile/recovery), "the raw v6 save" is ambiguous.
- Fix: parse → version → checksum → ranges → back up the exact bytes of the copy actually loaded → migrate. Split pure migration out of `validate()`.

### MINOR
- m1: test plan line m4-design.md:98 asserts "`.bak`/`v6_backup` holds the original v6 bytes after N autosaves". `.bak` rotates on save, so that half fails. Assert v6_backup only. "v6 `.bak`" is still used to mean v6_backup at :53-54 and elsewhere.
- m2: Reset vs v6_backup. The backup is deliberately kept out of RESET_KEYS (:138), so after a Reset the old farm's backup blocks the next farm's backup ("only if no backup exists", spec (a)). Combined with Major 2, rollback restores the wrong farm. Either clear it on Reset or tie it to the save being migrated.
- m3: `save_migration_aborted` fields disagree. The spec has `{reason}`, the §3 test has `{store}`, and the §5 table has `{store, reason, path}` (m4-design.md:80, :103, :161).
- m4: offline earnings. Where the "first grant ×1.0 after migration" flag lives (in memory per :66) and how it interacts with an abort-then-retry isn't specified. No test covers the pending-grant settle vs migration order (game.ts:~51-54). Float evaluation order for non-binary multipliers (e.g. 1.35) isn't pinned.
- m5: money and big numbers. No integer/non-negative rule for `migrationRefundCents`. No `Number.MAX_SAFE_INTEGER` bound on coinsCents + refund or on multiplied payouts. No fallback if no V in 0..30 reaches the v6 price. Refund rounding of the CSV cost column isn't specified. The interim refund is "returned, not stored" (:132) while the marked-v6 bump says "no second refund" (:59), so any interim refund is silently dropped (0 with current data).

### NIT
- N1: the leftover literal contradictions listed in the answer above.
- N2: release globals. Say that the QA-mode flag override (F-5, §4 `build:qa`) is build-time only, like `__IOS_FLAG__`, never a URL or storage override, and that M4 adds no window globals beyond `eggfarmExportTelemetry`. Say whether the U-0 single-file `build:html` artifact runs `check-release-build`/`check-globals`.
- N3: ab8f366's storage golden makes flag-off saves carry `hensLevel:0, eggValueLevel:0, celebratedMilestones:[]` (m4-design.md:151). That's fine for main (it spreads unknown fields), but it isn't "bit-identical to rc1" as §1 words it. Reword §1 to say "behaviour".
- Out of scope (code, already on main): `?marketSeed` is honoured in release builds (src/main.ts:83).

Determinism: the migration must stay pure in (raw, balance). Risk 5 (CSV change alters the output for players not yet migrated) is only covered by a fixture snapshot. Consider pinning the price-table hash in the build.
