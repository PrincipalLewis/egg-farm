# PR #1 recheck: engineering/m4-design.md @ 2c14b4f (v0.3.14, ADR M4-19 rev 9) vs 8a2150c
Saves QA · 2026-10-17 ~00:30 CEST · doc-only, judged on the data-loss bar only (per HoQA). No browser or test runs. No PR comments, push, merge or tag. Final verdict is HoQA's.
Line refs are to `git show 2c14b4f:engineering/m4-design.md`.

**Recommendation: APPROVE.** No data-loss issue remains. Non-data-loss items are logged below as a post-rc1 list.

## Diff 8a2150c..2c14b4f (1 commit)
- **m4-design.md:** +8/−4 (header, l.102, l.105, l.111, rows l.206–209).
- **decisions.md:** +5 (ADR M4-19 rev 9, 00:25, which supersedes rev 8's F2-EQ refinement).
- **status.md:** +1 (lists post-rc1 follow-ups).
- Nothing else changed.

## Architect's claims
| Claim | Status | Evidence |
|---|---|---|
| M-6: equal seq + different bytes is always diverged; known wins by flag; unknown slotted with read-back first; l.205 fixed; rollback row | **PASS** | l.102: "**One ordering (M-6):** F2-EQ only chooses the winner for equal `saveSeq`; it never preempts slotting. Every case below that has different bytes is **diverged**, and its loser always takes the full slot path (newer-version check → slot write + read-back → overwrite) with `save_copies_diverged`; a loser is never overwritten unslotted (D-2)." l.105: "**exactly one** copy carries a trusted `idbUnknownAtBoot` … ⇒ **diverged**; winner = the **known** copy (decided by the unknown flag alone, never by `savedAt`)". Row l.206 (was l.205): "⇒ diverged, the known copy wins (even if the unknown copy has the later `savedAt`), the unknown copy is written to a slot and read back before its store is overwritten". Rollback row l.207: "the unknown copy is byte-identical in a slot (`bytes`) before its store is overwritten". |
| S-10: legacy plain strings read as `{bytes, exportedAt:null}`, never dropped | **PASS** | l.111: "a slot or tmp value stored as a plain string is read as `{bytes: value, exportedAt: null}`; it is never dropped or treated as empty". Row l.208: "counted as full, exportable, never dropped; eviction/sweep rules apply as for records". |
| S-11: mark rewrites only `exportedAt`, with read-back; record untouched on failure | **PASS** | l.111: "rewrites only `exportedAt` (`bytes` byte-identical) and is read back; on write or read-back failure the original record stays byte-identical". Row l.209: "injected write or read-back failure ⇒ record byte-identical, copy stays non-exported". |

## Consistency
- **D-2:** l.101 says "Diverged ⇒ the copy **without** `idbUnknownAtBoot` wins regardless of `saveSeq`", and l.105 uses the same flag-decides rule at equal seq. The loser is byte-identical in a slot (`bytes`). Consistent.
- **M4-19 ranking (l.99):** applies only when copies are not diverged. At equal seq it reaches only the byte-identical case (l.104: nothing moves). The neither/both case (l.106) uses the F2-EQ `savedAt`→LS tie-break, but still slots the loser.
- **No contradiction or cycle:** one ordering (l.102). The "checked first" override that caused M-6 is gone.

## Every path slots or keeps the loser before any overwrite
| Path | Status | Evidence |
|---|---|---|
| Fill, replace, dedupe | ✔ | l.111–112 (dedupe means the loser is already in a slot). |
| Replace via tmp, with restore | ✔ | l.112, M-3. |
| Occupied tmp | ✔ | l.112, M-4: the replace is not attempted and the loser's store is untouched. |
| Both slot writes fail | ✔ | l.114: nothing overwritten. |
| Sweep | ✔ | l.114: verified-duplicate delete only; never evicts. |
| Export | ✔ | It marks and never deletes (l.114), and the mark is safe on failure (l.111). |
| Legacy string slots | ✔ | Count as full and are never treated as empty (l.111). |
| Refused load | ✔ | Touches nothing (l.114). |
| Rollback | ✔ | l.194, l.207. |

The only deliberate loss is ADR M4-25 (third divergence with both slots unexported, accepted by HoE). It is unchanged, with exported copies evicted first.

## Regression check
| Item | Status | Evidence |
|---|---|---|
| M-1 | PASS | "skip" appears only at l.95–96 (unrelated) and in "no skip" statements (l.106, l.114, l.139, l.382). |
| M-2 | PASS | l.121 unchanged. |
| M-3 | PASS | l.112 unchanged. |
| M-4 | PASS | l.112 unchanged. |
| M-5 | PASS | l.115 unchanged. |
| Earlier rows | PASS | Nothing removed. Old row (c) was replaced by l.206. |

## Data-loss Musts
None.

## Post-rc1 list (non-data-loss; tracked, not blocking)
1. **S-7:** `write_failed`/notice are at most once per load ✔. Consider a telemetry dedupe across loads (emit on a set-hash change, plus a count).
2. **S-8:** done in rev 8. Optional: an explicit row for an object-URL creation failure.
3. **S-9:** done in rev 8. Optional: a row covering a clipboard `writeText` rejection, where nothing is marked.
4. **S-12:** pin the once-flag exactly. status.md already lists it as post-rc1: `fnv1a:` + 8 lowercase zero-padded hex digits, the 32-bit offset/prime, UTF-8, `,` join, the sort order of the `sum`s and their text form, and the value for an empty non-exported set. The guard regex until then: `^fnv1a:[0-9a-fA-F]{8}$`.
5. **S-10 follow-on:** §3b l.138/l.139 still say each slot key "holds a full save string". Update that to `{bytes, exportedAt}` (legacy string accepted), and state that the serialized-save detector exempts these IDB keys by key, not by shape.
6. **S-11 wording:** "on … read-back failure the original record stays byte-identical". After a put that succeeded, the record has already changed. Say instead "rewrite the original record from memory (read back) or leave it unmarked". There is no data loss either way, since `bytes` is unchanged by design.
7. **Nit:** the M-4 guard doesn't drop an exported, unique tmp (only the sweep does), so the tmp blocks the replace. That's safe but conservative.
8. **Nit:** the l.114 "Residual" sentence should say "(exported copies first)", as §7 #13 does.
9. **M4-25 follow-up (status.md):** `save_recovery_slot` telemetry when both slots are full.

## Not run
No browser, unit or guard runs (doc-only). The guard update for record-valued slots, the fnv1a flag, and D-2 accepting any slot/tmp follows once HoQA rules.
