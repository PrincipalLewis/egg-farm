# Delta re-check: PR #1 arch/m4-design 96c4a1e → 26f4024 (m4-design v0.3.5)
Commits ccd60dc (v0.3.4), 26f4024 (v0.3.5); decisions.md, m4-design.md, status.md only, so there is no changed test or golden to run. Read-only. Claude: 1 call (RECHECK=1), verified.

## Verdict: BLOCKER. The new divergence rule (SQ-1, M4-19 amendment) loses progress in the common slow-IndexedDB case.

## Item status
| Item | Status | Evidence |
|---|---|---|
| N1 divergence | **FIXED for the repro, NEW BLOCKER at the boundary** | m4-design.md:101-105, test :178; decisions.md M4-19 amendment. See B1, M1-M3 |
| F2 saveSeq validation | FIXED | :100 (`Number.isSafeInteger`, ≥0, else 0, inside checksummed state); test :180 |
| F3 stuck notice | FIXED | attempt-counter para (one-time notice + Export, separate `eggfarm.save.stuck_on_v6`, survives the garbage reset, removed on commit/Reset); test :181; §3b allowlist |
| Restore nit | FIXED | :109 (restore also replaces IDB main with the highest saveSeq); test row |
| Level clamp from data | FIXED | :71, migration step 2-3, S-1/F-1 rows, clamp test with maxLevel 40 + grep guard |
| HoQA counting (v1.12) | FIXED | every failed attempt counts (cap 3); rows :157 + commit_write_failed/readback_mismatch sequences; §5 [abort]/[deferral] tags |
| idb_main_changed deferral | FIXED | §3c step 3, M4-20, rows :163 (d1)8(i)/(ii); N6 mirror rules updated consistently |

## Your repro (IDB k+1, LS k, slow session to LS k+5 with base k, fast reload)
Diverged (k ≤ k+1); only the LS copy has idbUnknownAtBoot ⇒ IDB k+1 wins, LS k+5 goes to `save/diverged`, `save_copies_diverged`, exportable. Correct, and test :178 asserts it.

## Findings
- **B1 BLOCKER: `≤` treats the common ancestor as a sibling.** :101, decisions.md M4-19 amendment.
  - Repro: LS = IDB = saveSeq k. One session with slow IDB (unknown, mirror off) plays LS to k+5 with base k. Reload with fast IDB ⇒ base k ≤ IDB k ⇒ "diverged", exactly one copy unknown ⇒ IDB k wins. The player is rolled back to k, and the legit session progress is only in the slot (Export).
  - This hits every slow-IDB session, the most common deferral, even though IDB holds nothing newer.
  - Fix: diverged only if base.seq **<** other.saveSeq (equal = ancestor ⇒ normal rank, k+5 wins). Add a boundary test (IDB k vs base k).
- **M1 MAJOR: a second loser is silently dropped.** :104, :179.
  - One slot; "keep the higher saveSeq" compares counters from different branches.
  - Repro: after B1's fix, two real divergences before an Export (e.g. slot holds k+5 from fork A; a later fork B loser at k+3 is discarded). This contradicts "never overwritten silently" (:104) and "no copy is lost" (:178).
  - Fix: a small ring (e.g. 3 slots), or never drop: emit and offer Export before replacing.
- **M2 MAJOR: slot write ordering and failure are unspecified.** :104.
  - Require slot put + read-back to complete before the winner overwrites the loser's store (LS autosave, or the rank-conditional IDB put).
  - On slot quota/error: keep the loser in place (pause writes to that store, or leave the copies unreconciled and retry next load), never overwrite.
  - Reconcile must not write the slot on a refused load. The newer-version check has to come first, since :128 requires `save/diverged` byte-identical on refusal.
- **M3 MEDIUM: older/flag-off builds preserve `base`/`saveSeq` but never update them.** :100-101.
  - A preserved `base.idbUnknownAtBoot = true` stays sticky, so the copy always loses clause 1 even after a session with full knowledge. A preserved old base.seq triggers spurious divergence that fills the slot, and with M1 that can evict a real loser. Progress made in those builds carries a stale saveSeq.
  - Fix: trust `base` only when it was written this session (e.g. tag `base.writerBuild`, or clear it at boot), and add flag-off round-trip tests through the rank.
- **minor: the "both copies unknown" clause is effectively unreachable.** IDB is never written in an unknown session (mirror off), so an IDB copy only carries the flag via the stale preservation in M3. Say so, or drop the clause.
- No other new data-loss risk found in the counting, clamp, F2/F3 or restore changes.
