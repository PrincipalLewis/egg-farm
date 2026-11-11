# PR #1 recheck: engineering/m4-design.md @ 0cadbd5 (v0.3.6) vs 26f4024
Saves QA · 2026-10-16 ~23:45 CEST · doc-only (`git diff 26f4024 0cadbd5`: engineering/{decisions,m4-design,status}.md, 1 commit). Rules: S-2 zero-writes; SD5-1 as reworded 23:22 plus the D-2 ruling (the M4-19 rank includes divergence; the loser must be byte-identical in IDB `save/diverged`, asserted by the guard). No PR comments, push, merge or tag. Verdict: HoQA.

**Recommendation: CHANGES REQUESTED.** One small Must: D-1a, a one-line §3b fix. Everything else passes. APPROVE once D-1a is fixed; no further QA re-review is needed beyond checking that line.

| Item | Status | Sev | § | Evidence |
|---|---|---|---|---|
| D-1 allowed IDB keys + refusal never touches the slot | PASS | — | §3b "May be written"; §3c slot step 1; decisions 23:30 | The IDB key list is now `main`, `v6_backup` and `diverged` ("the recovery slot, a full save string"). Order: the newer-version check runs first; a refusing load never runs the move and never writes or clears the slot, Export included ✔. The guard rule "any other IDB key is a FAIL" now agrees with the design ✔. |
| **D-1a slot in the §3b "Must stay byte-identical" list** | **FAIL (Must, trivial)** | Minor | §3b line 130 | The "Must stay byte-identical (or stay absent)" bullet still lists only IDB `main` and `v6_backup`. The next bullet says `diverged` is "in the byte-identical list for refused loads", but it isn't. That bullet is the list the S-2 guard is built from. Fix: append "and `diverged` (SQ-1)" to line 130. Also move `diverged` out of the "neither may ever contain a serialized save object" sentence (which still sweeps it in by grammar), because the slot always holds one. |
| D-1 refused-load row with a filled slot | PASS | — | Tests "[S-2/SQ-1, D-1]" | Refused newer-save load with a filled slot: slot byte-identical, no move, and Export on the refusal dialog doesn't clear it ✔. Nit: name autosave, pagehide and a 2nd tab like the other ZW rows (the guard covers them anyway). |
| D-2 loser stored byte for byte | PASS | — | §3c Recovery slot; N1 repro row; M2 row | The slot holds "the exact stored string". Order: write → read back byte-equal → only then overwrite the losing store ✔. On a slot write/read-back failure or skip, nothing is overwritten and both copies stay ✔. Interaction with the ruling: on a **skip** (slot holds a higher-saveSeq loser) the new loser isn't in the slot but stays byte-identical in its own store. HoQA, please confirm the D-2 condition reads "loser byte-identical in the slot **or** untouched in its own store on skip". The guard already implements that. |
| Nit `eggfarm.save.stuck_notice_shown` | PASS | — | §3b May be written; §3c counter; Reset | Own LS key `1`, not `eggfarm.ui` ✔. Never written on a refused load ✔. In RESET_KEYS ✔. Covered by the no-save-object rule ✔ (same grammar note as D-1a). |
| CR B1 strict `<` | PASS | — | §3c; Tests "[SQ-1, B1 strict]" | Both copies at k, LS to k+5 with base k ⇒ not diverged ⇒ LS k+5 wins by saveSeq; slot untouched, no rollback. Consistent with SD5-1: restored = highest-ranked = k+5 ✔. |
| CR M3 trusted base (`forSeq === saveSeq`) | PASS | — | §3c; Tests "[SQ-1, M3]" | An older or flag-off build that keeps `base` but bumps saveSeq ⇒ base ignored, plain rank ✔. `base`/`forSeq` live in checksummed state; no new key, no zero-writes impact ✔. |
| CR M1/M2 slot replace + failure path | PASS | — | §3c; Tests M2, slot full | Replaced only by a higher-saveSeq loser; `save_recovery_slot{replace\|skip}` uses scalars only (no save copy in telemetry ✔). On failure the winner plays in memory and the losing store isn't written; retried next load. SD5-1: the restored in-memory state = highest-ranked copy, so zero tolerance holds; the persisted loser stays intact ✔. |
| Both-unknown case removed | PASS | — | §3c | IDB main is never written in an IDB-unknown session (M4-20), so only one copy can be unknown. Consistent with N6/(d1)7 ✔. |

## QA follow-up done in the same pass
Guard `qa/m3-scripts/rc1-guard-save-qa.mjs` was updated to these 0cadbd5 rules: trusted base, strict `<`, slot-skip variant. Fixtures were regenerated with `forSeq`. SELFTEST 13/13 (see the parent report for the shas).

## Not run
No golden (no code change since 96c4a1e). No browser runs.
