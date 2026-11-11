# Final re-check: PR #1 arch/m4-design 26f4024 → 0cadbd5 (m4-design v0.3.6)
One commit; decisions.md, m4-design.md, status.md only. Read-only. Claude: 0 calls (small delta, verified by hand). No changed tests to run.

## Verdict: PASS. The 26f4024 blocker is fixed. One follow-up for SQ-1 (F2 medium) plus a wording note (F1); neither blocks the design.

## Item status
| Item | Status | Evidence |
|---|---|---|
| B1 strict `<` | FIXED | m4-design.md:101; decisions.md M4-19 revision 23:30; test :182 (both at k ⇒ not diverged, LS k+5 wins, slot untouched) |
| M1 second loser | RESOLVED as a design choice | :107, :185. A lower-seq loser is not dropped: it is skipped and left in its own store, with `save_recovery_slot{skip}`. The guarantee is restated precisely (:107) and no longer claims "no copy is lost" in general. See F1 note |
| M2 ordering/failure | FIXED | :103-107: newer check → slot write + byte-equal read-back → overwrite; on failure or skip nothing is overwritten, winner played in memory, retry next load; refusal never touches the slot (:131, test :186); tests :183 |
| M3 stale base | FIXED for post-SQ-1 builds | :101 `forSeq === saveSeq` else ignored; test :184. Pre-SQ-1 builds: F2 |
| "both unknown" minor | FIXED for normal operation | :102. Not true after a pre-SQ-1 rollback: F2 |

## Findings
- **F1 NOTE (no data loss): after a skip, a later IDB-unknown session writes over the skipped LS loser.** :107, :102.
  - That session plays from the loser itself, so the loser's progress carries into the new LS copy and nothing is lost.
  - On the next fast load that copy becomes the loser again. It can replace the slot only by a higher saveSeq, which drops the old slot copy: the documented, telemetered `replace`.
  - Wording only: :107's guarantee should read "never overwritten except by a session continuing from it". Optional test: skip, then a slow-IDB reload, then a fast reload.
- **F2 MEDIUM: the `forSeq` check can match by coincidence after a pre-SQ-1 (a01faea-era/rc1) rollback.** :101, :102, test :184.
  - Builds older than SQ-1 don't know `saveSeq`. They preserve both `saveSeq` and `base` unchanged (spread), so `forSeq === saveSeq` still holds and a stale base stays trusted.
  - Test :184 assumes an a01faea-era build "bumps saveSeq", which it cannot do. Post-SQ-1 flag-off builds do bump it, so the rule works for them.
  - After such a rollback session wrote both stores, both copies can carry a trusted `idbUnknownAtBoot = true` with base.seq < saveSeq. That makes the "cannot occur" both-unknown case reachable, with no rule (:102).
  - Data impact is small, because that build mirrored the same state to both stores. The rule is still undefined, and it can fill or replace the slot spuriously, which feeds F1.
  - Fix: if both copies are trusted unknown, or have the same saveSeq, treat them as not diverged and rank normally. Correct test :184 to cover a pre-SQ-1 build that preserves saveSeq.
- No other new data-loss risk in the delta (stuck_notice_shown key, Reset list and refusal allowlist are consistent).

## Addendum: dcbd59e vs 0cadbd5 (quick glance, no Claude)
- F2: CONFIRMED. Both trusted-unknown or same saveSeq ⇒ not diverged (m4-design §3a divergence "Not diverged (F2)"; decisions.md M4-19 revision 2 23:35). Pre-SQ-1 rollback paragraph + row added. Test :184 split: post-SQ-1 flag-off bumps saveSeq, and a new a01faea-era row preserves it ⇒ not diverged. Both-unknown different-seq row added.
- F1: CONFIRMED. Guarantee reads "never overwritten except by a session continuing from it, or after it is durably in the slot"; skip-then-slow-then-fast test added. `diverged` added to the §3b byte-identical list.
- **New, MINOR: same-saveSeq exemption reopens a narrow N1 fork.** LS write fails at k+1 while IDB absorbs k+1 (LS = k). A slow-IDB session writes exactly one LS save ⇒ LS k+1, base k (trusted unknown). Fast reload: equal saveSeq ⇒ "not diverged" ⇒ plain rank by savedAt ⇒ LS wins, and IDB k+1 is overwritten with no slot copy. Needs exactly one save in the unknown session (e.g. a short visit closed by pagehide). Fix: apply the same-saveSeq exemption only when neither copy carries a trusted unknown base (the pre-SQ-1 case it targets has untrusted or both-unknown bases anyway); add the boundary row.
