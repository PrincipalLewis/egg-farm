# Pre-merge delta re-check: PR #1 arch/m4-design 0cadbd5 → 3342918 (v0.3.12)
Commits dcbd59e, ab4ca9f, b606a4a, 078edfb, 1d88d7c, e152960, 3342918 (decisions.md +37, m4-design.md, status.md). Read-only. Claude: 0 calls (verified by hand). Golden harness unchanged; re-run in a /tmp copy of a01faea: 2/2 pass, GOLDEN1 50a87ddb… matches.

## Verdict: PASS. No blocker, no new data-loss path beyond the accepted M4-25. Four minors, fixable during SQ-1 implementation.

## At dcbd59e (noted in arch-m4-design-recheck-0cadbd5.md addendum)
F1/F2 confirmed. My one minor there was that the "same saveSeq ⇒ not diverged" exemption let an unknown-session LS copy overwrite IDB k+1 with no slot copy. ab4ca9f (F2-EQ, rev 3) closes it: equal saveSeq with different bytes is now diverged and the loser goes to a slot.

## Ranking (m4-design.md:101-104; decisions.md M4-19 rev 2-3)
- **B1:** strict `base.seq <` retained (:101).
- **N1:** the trusted unknown-base copy loses.
- **Same saveSeq:** byte-identical ⇒ nothing moves; different bytes ⇒ diverged, loser into a slot (:102-104).
- **Pre-SQ-1 rollback:** both stores written identically ⇒ byte-identical, not diverged (:191). Mirror-off rollback ⇒ F2-EQ diverged, loser kept (:192). Both-unknown ⇒ plain rank.
- All four close without losing a copy.

## Slots + tmp (:105-113, :198-209; rev 4-7)
- **Rotation:** fill `diverged`, then `diverged2`; replace targets the lower saveSeq.
- **Crash at each replace step:**
  - after the tmp write: tmp duplicates the slot ⇒ sweep deletes it after a verified duplicate;
  - after the slot write, before the tmp delete: tmp is the only copy of the evicted loser ⇒ sweep moves it to an empty slot or keeps it plus a notice, and never deletes it;
  - before the loser-store overwrite: the loser stays in its store, and is deduped against the slot on the next load.
- **Occupied tmp (rev 7, :110):** blocks a replace with no skip loss, because the loser store is untouched.
- **Quota or write failure:** nothing is overwritten (:112, :199).
- **Refusal paths:** the sweep and notice run only after the refusal check; zero writes there (:200, :208).
- **Residual eviction:** a third divergence without an Export evicts a copy. This is M4-25, accepted and listed as risk 13 (:362).

## Findings
- **MINOR: Export-confirm trusts the user.** :203, rev 7. "I saved it" for a plain download clears the slots on the user's word, and a resolved share promise only means a share target was chosen (e.g. a messaging app whose draft is later discarded). Suggest marking exported copies as `exported` and evicting them first, instead of deleting them, so the confirm frees space without destroying the only copy.
- **MINOR: identity hash relies on crypto.subtle.** rev 7, :113. SHA-256 needs a secure context. file:// and https are fine, but a LAN `vite preview` over http has no `crypto.subtle`. Specify a fallback: store the sorted `sum` list itself, a few 8-hex values.
  - **Collisions:** `sum` is FNV-1a 32-bit (a01faea save.ts:61-66). A collision only suppresses a notice re-show; dedupe compares `sum` plus the full state, so no copy is ever deleted on a hash match.
  - **Determinism:** the set is sorted, so the hash is deterministic.
  - **Lost once-flag:** the notice simply re-shows. Harmless.
- **MINOR: F2-EQ ignores a trusted unknown flag.** :104. In the equal-seq fork (IDB k+1 from a mirror-absorbed write vs one unknown-session LS save at k+1 with base k), the later savedAt (the unknown LS copy) wins and the better-informed IDB copy goes to a slot. No loss, but the slot fills and pushes toward M4-25. Prefer the copy without a trusted unknown base before falling back to savedAt.
- **NIT: superseded wording stays in decisions.md rev 2.** It still describes a one-slot `skip` path. rev 4 says it supersedes it and m4-design.md has no skip path (:112), but mark the rev 2 bullet SUPERSEDED as was done for 22:45.
- **Consistency:** m4-design and decisions agree on slots, tmp, sweep, Export clear, Reset keys (:119), §3b lists (:136-137) and telemetry (`slot`: tmp, `action`: sweep).
