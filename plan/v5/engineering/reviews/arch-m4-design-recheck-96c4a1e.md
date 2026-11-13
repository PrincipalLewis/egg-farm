# Delta re-check: PR #1 arch/m4-design cf66ce5 → 96c4a1e (m4-design v0.3.3)
Commits: ca0ae03 (v0.3.2), 96c4a1e (v0.3.3). Files: decisions.md, m4-design.md, status.md, engineering/golden/flagoff-golden.a01faea.test.ts. Read-only. Claude: 1 call (RECHECK=1), verified.

## Verdict: PASS (no new blocker). N1 is NOT fixed by saveSeq and stays an open MAJOR, pre-existing on main. Fix it in SQ-1 before S-3.

## Item status
| Item | Status | Evidence |
|---|---|---|
| N1 stale v6 vs newer IDB v6 | **NOT FIXED** | m4-design.md:97, :167, :313, :325; decisions.md M4-19 (revised). See F1 |
| N2 M4-23 scope | FIXED | decisions.md M4-23 (this session's aborted migrationId only, never main's v6BackupId, never the only pre-M4 backup, else visible "Can't save"); m4-design.md orphan exception; test row N2 |
| N3 probe leak | FIXED | deleted at boot, in RESET_KEYS, `finally` removal; §3b allowlist; test rows |
| N4 deferral loss | FIXED (accepted risk) | risk 12 (:313), M4-19 |
| N5 risk 11 | FIXED | risk 11 widened; decisions.md risk line |
| N6 mirror after non-IDB abort | FIXED | §3d "Mirror after a non-IDB abort" (resumes on next normal save; off after IDB-unknown); test row N6 |
| HoE headroom | OK | free ≥ max(2×(save+backup), save+backup+64 KiB), trial write + `finally`; deferral quota_headroom; never drops main/.bak/telemetry; boundary tests both bounds |
| HoQA pre-commit read-back | OK | §3d 1a: marker/v7 only after LS backup migrationId == pending v6BackupId, else readback_mismatch, no marker; pass/fail/throw test row |
| HoQA attempt cap | OK, with a gap (F3) | N=3, stops incrementing, stuck_on_v6, never forced, garbage→0, removed on commit |
| Golden pins | PASS | run in a /tmp copy of a01faea with the 96c4a1e harness: 2/2 tests; all 4 GOLDEN2 pins and GOLDEN1 50a87ddb… asserted with `expect` and matching |

## Findings
- **F1 MAJOR (N1 reopened): saveSeq can't order forked copies.** m4-design.md:97/:167, decisions.md M4-19.
  - Repro: an SQ-1 build saves; the LS write fails on quota, the IDB mirror succeeds, so IDB saveSeq = k+1 and LS = k. The next session's IDB open times out, so it defers with the mirror off. It plays from the stale LS copy and autosaves 5×, so LS = k+5. Reload with fast IDB: LS wins on saveSeq and the rank-conditional mirror put overwrites IDB k+1, so that progress is lost.
  - The only test row covers the unforked case (5 vs 7). Accepted risk N4 covers the deferral session's own progress, not the destruction of the newer copy.
  - Same as on main today; M4-24's permanent LS backup raises the LS quota pressure that triggers it (Claude F4, agreed).
  - Fix: carry lineage (the parent seq/hash read at boot plus an "IDB unknown at boot" flag). On reload, a copy written while IDB was unknown must not outrank an IDB copy whose seq ≥ its base seq. Or never destroy the losing copy on divergence: keep it in a recovery slot. Also define "successful write": per-state counter, written to both stores.
- **F2 MINOR: saveSeq validation and placement unspecified.** m4-design.md:97, :325.
  - Missing = 0 is the only rule. NaN, negative, fractional or huge values (1e308 wins forever; +1 does nothing past 2^53) are undefined. Overflow is not a practical issue at +1 per autosave, but a corrupt or tampered value is.
  - Also unspecified: whether it sits inside `state` (checksummed by `sum`) or at top level, and whether pre-SQ-1 or flag-off builds drop it on rewrite (they then read 0 and lose ties).
  - Fix: a safe integer ≥ 0, otherwise 0 (never reject the save); keep it inside the checksummed state; tests for each case.
- **F3 MINOR: the cap has no player-facing exit.** m4-design.md:89, decisions.md M4-24 amendment. A permanently slow or blocked IDB keeps the player on v6 forever (by design, never forced), with a deferral every load and the mirror off every session, so IDB goes ever more stale (feeds F1). Only `stuck_on_v6` telemetry is specified. Suggest a notice or export offer at the cap, and a rule that garbage→0 doesn't clear stuck state silently.
- **nit:** a v6_backup rollback restore yields an uncommitted v6 that a committed IDB main outranks. State that restore also replaces IDB main (Claude F5; a rollback-build concern, low).
