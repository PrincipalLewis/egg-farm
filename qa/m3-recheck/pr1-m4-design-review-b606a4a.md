# PR #1 SK-1 recheck: engineering/m4-design.md @ b606a4a (v0.3.9) vs ab4ca9f
Saves QA · 2026-10-17 ~00:05 CEST · doc-only (diff: m4-design.md +12/−8, decisions.md ADR M4-19 rev 4, status.md). No browser or test runs. No PR comments, push, merge or tag. Final verdict is HoQA's.
Line refs are to `git show b606a4a:engineering/m4-design.md`.

**Recommendation: CHANGES REQUESTED.** The SK-1 design is sound: the core §3c rule (l.107–112) closes it. But the rev 4 edit only touched §3c and added rows. Five other places still describe the one-slot/skip model or leave out `diverged2`. Two of them would make a correct implementation FAIL the guard or lose data (M-1, M-2).

## Architect's claims
| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Two slots, no skip path | **PASS in §3c / FAIL doc-wide** | l.107: "Two IDB slots, `eggfarm/save/diverged` (slot 1) and `eggfarm/save/diverged2` (slot 2)". l.112: "There is **no skip path**". **Skip text is still present at:** l.104 (F2-EQ: "under the existing slot rules (replace only for a higher `saveSeq`, otherwise skip and leave the loser's store untouched)"); l.136 §3b ("when the slot already holds a loser with a higher or equal `saveSeq`, the new loser is not moved … (`save_recovery_slot{skip}`)"); l.196 F1 row ("skip, then a slow-IDB reload…"); l.197 ("a lower one is skipped (`{skip}`)"); l.199 [SQ-1,(2)] ("new loser not moved … `save_recovery_slot{skip}`"); l.286 §5 telemetry (`{action: 'replace'\|'skip', slot_seq, loser_seq}`: no `slot`, no `fill`/`dedupe`/`write_failed`, which contradicts l.112); l.363 SQ-1 task ("the one IDB slot `save/diverged` … replace only by higher `saveSeq`"). → M-1, S-1 |
| 2 | diverged2 on the §3b zero-writes list | **PASS (list) / FAIL (key inventory)** | l.135: "keys `main`, `v6_backup`, **`diverged`** and **`diverged2`**". But in the same section, l.136 still says: "the only IndexedDB database … keys `main` (and `v6_backup` from S-3), and `diverged` … **Any other IDB database, store or key appearing is a FAIL**". Read literally, the `diverged2` key itself is a FAIL. The serialized-save exemption ("the IDB slot `diverged` is exempt") also leaves out `diverged2`. → M-1 |
| 3 | Pre-SQ-1 ignores-and-keeps row | PASS | l.193: "a pre-SQ-1 (`a01faea`) build ignores `diverged2`: seed `diverged2` (and `diverged`), run boot, autosave, `pagehide`, Export and Reset-free play ⇒ both keys byte-identical and not deleted". l.107: "Pre-SQ-1 and other non-SQ-1 builds never read, write or delete either key". (Nit: a01faea's Reset `clearMirror` deletes only `main` (l.118), so a rollback Reset leaves the slots. Worth a row saying the slots survive an old-build Reset and get cleared on the next M4 Reset.) |
| 4 | Rollback rows: slot → a01faea → M4 load | PASS | l.192: "M4 load with `diverged` holding a higher-`saveSeq` loser L1 and a new loser L2 ⇒ L2 goes to `diverged2` (read back) and only then is its store overwritten; then an `a01faea`-build load … ⇒ LS/IDB overwritten, `diverged` and `diverged2` byte-identical; then an M4 load ⇒ L1 and L2 both still present in the slots and exportable". Also covers the case where both writes fail. This is exactly the row that ab4ca9f SK-1 asked for. |
| 5 | Dedupe by checksum + state | PASS | l.109: "If the loser equals a slot copy by **`sum` + state** (HoQA nit: `savedAt` ignored), it is already preserved: no write, go to 4". Row l.194: "`action:'dedupe'`, no slot write". The ab4ca9f nit is closed. |

## Required items
| # | Check | Status | Evidence |
|---|---|---|---|
| a | Residual risk from a 3rd divergence, with an Export offer | **PASS (Should)** | l.112: "**Residual (recorded, ADR M4-19 rev 4):** with both slots full, a third divergence evicts the lower-`saveSeq` slot copy; that requires three divergences without an Export and is independent of rollback. The diverged notice offers Export whenever both slots are full." decisions.md rev 4 says the same. **But** "the diverged notice" is not defined anywhere else in the doc: there is no selector, no show rule, no AC row, and §7 (accepted risks, l.~340–350) has no entry. `diverged-export` exports "the slot copy", and the doc doesn't say which slot (or both) gets exported and cleared. → S-2 |
| b | Nothing overwritten before a successful read-back | **PASS for the stores / Should on the slot** | Stores: l.110–111 "write the loser to the target slot and **read it back** … only then overwrite the losing store"; failover l.112 "if **both** fail, **nothing is overwritten**". Dedupe skips the write only when the copy is already in a slot. Rows l.191 (eviction: "write + read-back before the loser store is overwritten") and l.192 match. Old builds can't overwrite the slots (l.107). **Gap:** in a replace or eviction, the target slot's old copy is overwritten *by* the put itself. If the read-back then mismatches, the old slot copy is gone. The failover rule (l.112: "the other slot is tried … only when it is the lower-`saveSeq` one") then stops at the higher slot, so the new loser stays in its store. Net effect: one copy is lost on a failed replace. That's the same class as the documented eviction, but it isn't stated. → S-3 |

## Contradictions with SD5-1 rules and other sections
- **D-2 (copy not written with idbUnknownAtBoot wins; loser byte-identical in the recovery slot):** consistent. The "recovery slot" now means either slot. The guard must accept the loser in `diverged` OR `diverged2`.
- **SD5-1 "slot skip" variant (new loser byte-identical in its own store; slot keeps the higher-seq loser):** this case no longer exists under rev 4 (it becomes fill-slot-2). The l.199 row still asserts the skip behaviour → M-1. Guard rows R2-SQ/R2-DV/R2-EQ need updating once this is fixed (QA-side).
- **F2-EQ:** the l.103–104 winner rule is unchanged ✔. The trailing slot clause still says skip → M-1.
- **Reset (l.118):** "deletes IDB `save/diverged`" only. l.112 says "Export … or Reset clears both slots". A Reset that leaves `diverged2` would let a new farm inherit the old farm's loser, the same issue m2 fixed for `v6_backup` → M-2.
- **SQ-1 task (l.363)** still specifies "one IDB slot". Implementers work from this row → M-1.

## Musts
- **M-1 (Major): finish the rev 4 propagation.** Remove or rewrite every one-slot/skip statement: l.104, l.136 (the key inventory must list `diverged2`, the serialized-save exemption must cover both slots, and the skip sentence must go), l.196, l.197, l.199, l.286 (telemetry `{slot, action: 'fill'|'replace'|'dedupe'|'write_failed', slot_seq, loser_seq}` per l.112), l.363. As written, §3b makes `diverged2` a zero-writes FAIL, and l.199 contradicts l.112.
- **M-2 (Major): Reset must delete `save/diverged2`** (l.118). Add it to the Reset row and AC alongside `diverged`.

## Shoulds
- **S-1 (Minor):** l.186 N1 row expects `save_recovery_slot{replace}` on what is normally an empty slot. Change it to `fill`.
- **S-2 (Minor):** define the "diverged notice" (trigger: both slots full; show-once rule and storage key, and add that key to §3b; testid). Say what `diverged-export` exports and clears when two slots exist. Add the 3rd-divergence residual to §7 with an AC row.
- **S-3 (Minor):** state that a failed read-back on a replace or eviction loses the old slot copy, or require the failover to try the other slot before giving up. Then add a row: both slots full, injected read-back mismatch on the lower slot ⇒ state what survives.
- **Nit:** add a row for an a01faea Reset after rollback (the slots survive; the next M4 Reset clears both).

## Not run
No browser, unit or guard runs (doc-only, per HoQA). The guard is not yet updated for two slots; it waits until M-1 is settled.
