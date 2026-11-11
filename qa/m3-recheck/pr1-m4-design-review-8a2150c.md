# PR #1 merge recheck: engineering/m4-design.md @ 8a2150c (v0.3.13, ADR M4-19 rev 8) vs 3342918
Saves QA · 2026-10-17 ~00:25 CEST · doc-only, fresh recheck (the 3342918 APPROVE does not carry over). No browser or test runs. No PR comments, push, merge or tag. Final verdict is HoQA's.
Line refs are to `git show 8a2150c:engineering/m4-design.md`.

**Recommendation: CHANGES REQUESTED.** There is one Must (M-6): the F2-EQ refinement (c) contradicts the main M4-19 divergence rule and D-2, and lets an unslotted loser be overwritten. Everything else PASSes, with Minor Shoulds.

## Diff 3342918..8a2150c (1 commit)
- **m4-design.md** +14/−12:
  - l.104–105: F2-EQ split.
  - l.110: slot record and exported-first eviction.
  - l.111: S-7 once per load.
  - l.113: Export marks and never deletes.
  - l.114: FNV-1a flag, S-8, S-9.
  - Rows: l.198, l.204–208.
  - l.252: clipboard.
  - l.366: §7 #13.
- **decisions.md:** the rev-2 skip bullet is marked SUPERSEDED (l.96), and ADR M4-19 rev 8 (00:20) is added.
- **status.md:** +1 line.
- **Not touched:** §3b l.137/l.138 (see S-10).

## Architect's claims
| Claim | Status | Evidence |
|---|---|---|
| (d) rev-2 skip bullet superseded | PASS | decisions.md l.96: "**SUPERSEDED** (by rev 4 …): when the slot already holds a higher- (or equal-) saveSeq loser …". |
| (a) Export marks `exportedAt`, never deletes; exported evicted first | PASS | l.110: "if both are full, the slot holding an **exported** copy (`exportedAt` set; lower `saveSeq` first if both are exported), else the slot whose copy has the **lower `saveSeq`**"; "each slot/tmp value is `{bytes, exportedAt}`". l.113: "**marks** the exported copies (`exportedAt`, write + read-back of the slot record, `bytes` unchanged) and **never deletes** a copy". Row l.204: "the exported slot is replaced even if its `saveSeq` is higher; a non-exported copy is never deleted by an export". |
| (b) fnv1a over non-exported sums, no crypto.subtle | PASS | l.114: "`fnv1a:<8 hex>`, the 32-bit **FNV-1a** of the sorted `sum` values of the **non-exported** copies … joined with `,` (UTF-8) … works without `crypto.subtle`". Row l.206. |
| (c) F2-EQ respects a trusted unknown flag on equal seq | **FAIL → M-6** | l.104: "**different bytes**, and **exactly one** copy carries a trusted `idbUnknownAtBoot` … ⇒ **not diverged**: the other (known) copy wins by normal ranking, no slot write". See HoQA (3). |
| S-7 at most once per load | PASS | l.111: "`write_failed` is emitted and the notice shown **at most once per load**". Row l.207: "several autosaves and a second divergence check in the same load ⇒ `write_failed` emitted once, notice shown once". |
| S-8 prompt only if the download start didn't throw | PASS | l.114: "only if starting the download did **not throw** (S-8; a throw ⇒ error toast, no prompt, nothing marked)". Row l.204. |
| S-9 clipboard marks only on "I saved it" | PASS | l.114: "The **clipboard fallback** … copies are marked only on **I saved it**". l.252; row l.204. |

## HoQA questions
**(1) Can exported-first eviction remove an unexported unique copy? Can storage grow without bound?** PASS.
- Exported-first only ever *prefers* an exported copy. When both slots are unexported, l.110 falls back to "lower `saveSeq`". That is exactly the ADR M4-25 accepted eviction (with the l.111 tmp staging and the M-4 guard), not a new loss path.
- When one slot is exported, the exported one is evicted and the unexported copy survives. That's strictly better than before.
- No path evicts an unexported copy while an exported one exists.
- Growth is bounded: there are exactly three IDB keys (`diverged`, `diverged2`, `diverged_tmp`), each holding one record. Export never adds a key, the "Any other IDB … key appearing is a FAIL" rule (l.138) still applies, and Reset deletes all three (l.120). Storage is capped at 3 full save strings plus marks. The cost is that it's only reclaimed by eviction or Reset (Nit: acceptable, given saves are KB-sized).
- Nit: the exported-tmp case. The sweep "may delete an exported `diverged_tmp`" (l.113), but the M-4 guard (l.111) only runs the verified-*duplicate* delete. An exported, unique tmp therefore still blocks a replace. That's safe but conservative; consider letting the guard also drop an exported tmp.

**(2) fnv1a collision risk.** PASS: acceptable.
- The flag gates only whether the notice is shown (l.114).
- Eviction (l.110) is driven by `exportedAt` and `saveSeq`, not by the flag.
- The sweep delete (l.113) is driven by a read-back `sum` + state duplicate.
- The every-load "both slots full" rule is driven by actual slot state ("regardless of the flag").
- So a 32-bit collision (about 2⁻³² per change) can at worst suppress one notice while a slot is still free. No delete or eviction depends on it.

**(3) Does the trusted-unknown F2-EQ change keep D-2 and the M4-19 ranking consistent?** **FAIL (M-6).**
- **Contradiction with the main rule (l.101):** "Two copies have **diverged** only if one has a trusted base with `idbUnknownAtBoot = true` **and `base.seq <` the other copy's `saveSeq`**". A trusted base has `forSeq === saveSeq`, and every write increments `saveSeq` relative to `base.seq`, so `base.seq < saveSeq = k` on the unknown copy. At equal seq k, the main rule therefore says *diverged*: the known copy wins and the loser goes to a slot (D-2). The new l.104 is "checked first" (l.102), and it overrides that with "not diverged … no slot write". The same configuration now gets two opposite outcomes, and the earlier one wins.
- **D-2 violation and data loss:** with "not diverged", the losing (unknown) copy is never slotted. Reconcile then writes the winner back over it and the mirror rewrites IDB, so the loser exists nowhere. This is the very loss class SK-1 closed. It is plausible after a rollback where a pre-SQ-1 build rewrote one store while preserving a trusted-unknown base (l.105–106 F2 discussion), in which case the "unknown" copy may hold the newer player progress.
- **Internal ambiguity:** "the other (known) copy wins by normal ranking". At equal `saveSeq`, normal ranking (l.99) falls to `savedAt`, which can pick the *unknown* copy. So "known wins" and "by normal ranking" disagree.
- **No cycle:** the rule set is still a total order (F2-EQ first, then the main rule, then ranking). The problem is a contradiction, not a cycle.
- **Fix (pick one):**
  - (i) Revert (c): equal seq + different bytes ⇒ diverged regardless of the flags (rev 7 behaviour).
  - (ii) Keep (c)'s winner choice but treat it as **diverged**: the known copy wins (state "regardless of `savedAt`", matching D-2's l.101 wording), and the loser goes byte-for-byte into a slot with read-back before any overwrite, emitting `save_copies_diverged`.
  - Either way, fix row l.205 to match.

**(4) Exact flag format and its §3b placement.**
- **Format** (l.114): the literal prefix `fnv1a:` followed by 8 hex digits. It is the 32-bit FNV-1a of the UTF-8 string formed by joining the sorted `sum` values of the non-exported copies in `diverged`/`diverged2`/`diverged_tmp` with `,`. It is compared as a plain string.
- **Legacy values:** a value without the prefix is "different" once, then overwritten.
- **Guard regex as specified:** `^fnv1a:[0-9a-fA-F]{8}$`. The doc doesn't fix the hex case or zero-padding, the sort order (lexicographic or numeric) of `sum`s, the `sum` text form, or the value for an empty set. → S-12.
- **§3b placement:** l.138, "May be written … **Allowlisted from S-3**" block: "**`eggfarm.save.diverged_notice_shown`** (allowlisted LS key: a plain hash string of slot/tmp checksums, the diverged notice once-flag, **never save data**) likewise; so during a refused load they must stay byte-identical or absent". It is allowlisted as a known key, but must stay byte-identical or absent on a refused load.

## Regression check
| Item | Status | Evidence |
|---|---|---|
| M-1 no one-slot/skip | PASS | "skip" only at l.95–96 (unrelated), l.105 ("no skip path"), l.113, l.138, l.378. The decisions.md rev-2 skip bullet is now SUPERSEDED. |
| M-2 Reset | PASS | l.120 unchanged (all three IDB keys + flag). l.113: "Reset deletes both slots and `diverged_tmp`". |
| M-3 replace order | PASS | l.111 is unchanged apart from the S-7 clause. |
| M-4 occupied-tmp guard | PASS | l.111 "A replace never overwrites an existing `diverged_tmp`"; row l.202; §7 l.366. |
| M-5 confirm before marking | PASS | It now *marks* instead of clearing, which is stronger (nothing is deleted at all). l.114; row l.204. |
| Earlier rows | PASS (except l.205 per M-6) | l.187, 194, 198 (updated to "marks … deletes none"), 199–203, 207–208, 211 (S-2 updated). |

## Musts
- **M-6 (Major): the F2-EQ "exactly one trusted unknown ⇒ not diverged, no slot write" (l.104, row l.205, decisions rev 8) contradicts the main divergence rule (l.101) and D-2, and can overwrite an unslotted loser.** Make it diverged with the known copy winning regardless of `savedAt` and the loser slotted (or revert to the rev 7 rule). Fix the "by normal ranking" wording and row l.205.

## Shoulds (Minor)
- **S-10:** §3b l.137/l.138 still say each slot key "holds a full save string", while l.110 now makes the value a record `{bytes, exportedAt}`. Update §3b, and say whether the serialized-save detector looks at `bytes`. Also say how an M4/SQ-1 build reads a legacy plain-string slot value, if any pre-rev-8 SQ-1 build ever wrote one.
- **S-11:** the Export mark overwrites the slot record in place (l.113, "write + read-back"). State that on a mark write or read-back failure the record is rewritten from the in-memory original bytes (or left unmarked), so the mark can never damage `bytes`.
- **S-12 (needed for the guard):** pin the flag exactly: lowercase, zero-padded 8 hex digits; lexicographic sort of the `sum`s and their text form; the value for an empty non-exported set (e.g. absent, or `fnv1a:811c9dc5`, the hash of the empty string).
- **Nit:** the l.113 "Residual" sentence still reads "evicts the lower-`saveSeq` slot copy". Add "(exported copies first)", as §7 #13 does.

## Not run
No browser, unit or guard runs (doc-only). The guard update waits until M-6 and S-12 are resolved: record-valued slots (compare `.bytes`), a fnv1a flag regex, and D-2 accepting any slot/tmp.
