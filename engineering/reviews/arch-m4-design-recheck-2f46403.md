# Re-check: PR #1 arch/m4-design @ 2f46403 (= f1869c4 v0.2.8 + a one-line decisions.md fix)
Read-only. Worktree /workspace/review-f1869c4 (detached at f1869c4). `git diff f1869c4 2f46403` = engineering/decisions.md only, 1 line changed: the M4-11 body now says "Settings > Reset clears it in both stores (RESET_KEYS + clearMirror)" instead of "(not in RESET_KEYS)". Nothing else changed, so the f1869c4 review below applies to 2f46403.
Claude: 1 call via the wrapper (RECHECK=1, sonnet/high) on f1869c4. None on 2f46403. I checked its claims against the docs, the spec and src.

**Verdict: CHANGES.** All four prior majors are addressed in design. But M4-15/M4-16 introduce two new high-risk save-loss paths (N1, N2) and leave the (f)1 narrowing unratified.

## Prior items (arch-m4-design-ab8f366.md)
| Item | Status | Evidence |
|---|---|---|
| Major 1: aborted-session rules | Addressed | M4-14, m4-design.md §3c (~:83), test 2a; decisions.md M4-14. The mechanism is unspecified (N4). |
| Major 2: committed vs leftover backup | Addressed, but new risk | M4-15 migrationId/v6BackupId (§3c ~:84). See N2. |
| Major 3: no IndexedDB | Addressed in design; partial vs spec | M4-16 (~:85-86): keyed IDB result, in-session commit. Spec (f)1 is not amended; HoP is "flagged, not blocking". See N1, N6. |
| Major 4: backup before validate | Addressed | Load order (~:69-70), M4-17, test "corrupt ⇒ no backup". |
| m1: `.bak` test assertion | Addressed | Test now asserts v6_backup only (~:106). |
| m2: Reset leaves v6_backup | Addressed at 2f46403 | §3c Reset (~:88), RESET_KEYS; decisions.md M4-11 fixed by the one-line diff. Needs a keyed IDB delete (IdbMirror.clear deletes `main` only, src/save/idb-mirror.ts:~52). |
| m3: telemetry fields | Addressed | One field set `{store, reason, path}` (~:80, §5). |
| m4: offline grant | Partial | Float order is pinned, but the code cite is wrong (offline.ts:7, and there's no `mult` term in this tree). The in-session commit makes "the grant computed at the committing load" meaningless (N5). |
| m5: money | Addressed | Integer per-level cost, refund ≥ 0, MAX_SAFE_INTEGER clamp, no-V fallback = max, interim refund recorded by S-4 (~:50, :59, :63-64). No bound on multiplied payouts (nit). |
| N1: stale text | Mostly addressed | M4-5 marked superseded; M4-11 fixed at 2f46403. "v6 `.bak`" is still in decisions.md M4-4 (:9) and M4-9 (:21). |
| N2: release globals / build:html | Addressed | §4: build-time-only override, no new globals, checks also run on build:html. |
| N3: "bit-identical" | Addressed | §1 says "behaviour-identical". |
| ?marketSeed risk | Addressed | §7 risk 10 (risks 9/10 are out of order, nit). |

## New findings
### HIGH N1: a newer IDB-only save is missed on IDB timeout, and M4-16 then migrates stale bytes over it (old B1 class)
- `IdbMirror.read` returns null on timeout or error (src/save/idb-mirror.ts:~31-34). Reconcile, `newerStoredVersion` and `pickNewest` then see "no IDB copy".
- M4-16 classes a timeout as "unavailable ⇒ proceed on LS alone" (m4-design.md §3c ~:85; decisions.md M4-16).
- Scenario: LS holds an older v6 (lazy-flush loss, or an LS write failure where the mirror fallback wrote IDB only). IDB main holds a newer v6, or an already-committed v7. The read times out, the game backs up and migrates the stale LS v6, then commits.
  - The IDB put only skips versions > SAVE_VERSION (idb-mirror.ts:~46), so the newer IDB save is overwritten.
  - The backup holds the stale bytes, so rollback can't recover it either.
- Fix: make the boot IDB read tri-state (absent / present / unknown). On "unknown" (timeout, error), don't migrate this session (stay v6 under flag-off rules, retry next load). Proceed on LS alone only when IDB is definitively unusable (no factory, immediate open error / private mode). Make the IDB main put conditional on savedAt/version inside the transaction.
- Also: the 2000 ms budget can never be reached through the mirror's 1.5 s open timeout. Define one budget, or a reopen rule.

### HIGH N2: "leftover ⇒ deleted on next load" can delete the only v6 copy (§3c ~:84; decisions.md M4-15)
- Any load whose live save has no matching `v6BackupId` deletes the backup. That includes a corrupt v7 main that recovers to a fresh farm, a recovery that restores a pre-commit v6 `.bak` (which has no id), and possibly refused loads (that would conflict with §3b zero writes).
- Fix: only overwrite or delete a leftover inside the unmarked-v6 migration path, at the moment the fresh backup is written. Never touch a record whose id is referenced by main, `.bak` or IDB main. Never touch it on refused, corrupt or fresh loads.

### MEDIUM N3: the interim (F-0) path can never be "committed"
- `v6BackupId` is defined on the committed v7 save. Nothing says F-0 writes it into the marked v6 state, so the interim backup is always leftover and gets deleted (N2).
- Saves already marked at 3351d6c have no backup at all, and nothing covers them.
- `v6BackupId` and `firstGrantDone` are missing from the "Schema (v7 adds)" list (§3 ~:42) and from the validator ranges.

### MEDIUM N4: "flag-off rules for the session" has no mechanism (§3 ~:55 vs §3c ~:83)
- `readMax(b)` and `writeVersion(b)` derive from the build flag only. A pre-commit or aborted M4-on session needs a session-level effective flag that also governs `writeVersion` and serialize, otherwise it writes v7 or runs M4 formulas.
- Specify where the flag lives and how it flips at commit. Test that the aborted session serializes v6.

### MEDIUM N5: the in-session commit changes M4A-30 and M4A-33 semantics
- The offline grant now runs at the v6 boot under flag-off rules, before the migration seconds later. The spec order is "migrate → grant ×1.0, then the next load ×1.25 (19800/24750)".
- "Committing load" (~:66) no longer exists. The explainer ("first load after migration") would now show in the same session.
- Re-derive the S-5 expected values, or amend the spec with HoP.

### MEDIUM N6: commit-write failure and close timing are undefined (§3c ~:86)
- The backup roughly doubles the LS footprint, so the v7 main `setItem` at commit is the likeliest quota failure. That happens after the state has migrated and the M4 UI has unlocked.
- Specify: roll back to the v6 state and flag-off rules, emit `save_migration_aborted{path}`, and leave the backup as leftover.
- State the order: backup (LS, then IDB confirmed) → main v7 → mirror. Do the commit and backup writes go through Game.save's lease/newer guards? (They should; cf. review 677317d m1.)
- With IDB unavailable, a kill after main v7 is flushed but before the LS backup is flushed leaves v7 with no backup anywhere. Document this risk.

### LOW N7: migrationId generation and determinism (§3c ~:84)
- Specify that the id is drawn in `save/` (crypto.getRandomValues, with a fallback) and injected (e.g. `opts.migrationId`), so `migrateTracksV7` stays pure and fixtures, the 961-save sweep, SHA256SUMS and the storage golden are reproducible. The tests need a deterministic id.
- A late IDB write from an older attempt should not replace a committed record: make the put conditional on the id.

### LOW N8: spec consistency, (f)1 and (a)
- Narrowed and not ratified: "either store fails ⇒ abort, retry every load" becomes "IDB unavailable ⇒ proceed". "Raw v6 bytes" becomes a `{migrationId, raw}` wrapper (QA's byte-compare must unwrap). "Written only if no backup exists" becomes "overwrite leftovers".
- These need a HoP spec note and a QA heads-up before S-3 lands, not "not blocking".
- The telemetry reason `'blocked'` can't be produced today: IdbMirror.open returns null for every failure and has no onblocked handler.

### NIT
- Record which stores a committed backup reached (e.g. `backup_stores: 'ls'|'both'` on save_migrated) so restore/support knows.
- §7 risks 9/10 are out of order.
- No MAX_SAFE_INTEGER rule for multiplied payouts (milestone × balanced × grader).
