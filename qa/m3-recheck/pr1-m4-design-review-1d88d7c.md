# PR #1 recheck: engineering/m4-design.md @ 1d88d7c (v0.3.10, ADR M4-19 rev 5) vs 078edfb
Saves QA · 2026-10-17 ~00:10 CEST · doc-only. No browser or test runs. No PR comments, push, merge or tag. Final verdict is HoQA's.
Line refs are to `git show 1d88d7c:engineering/m4-design.md`.

**Recommendation: CHANGES REQUESTED.** M-1, M-2, the Shoulds and the HoQA allowlist condition all PASS. The M-3 replace order also PASSes. One new Must remains (M-4): an existing `diverged_tmp` can be overwritten by the next replace.

## Diff 078edfb..1d88d7c (1 commit)
m4-design.md: +22/−17. decisions.md: +6 (ADR M4-19 rev 5, 00:05). status.md: +1 line. All of it is within the stated scope (M-1..M-3, S-1..S-3). No unrelated sections changed.

## Musts from 078edfb
| # | Check | Status | Evidence |
|---|---|---|---|
| M-1 | No one-slot or skip wording | **PASS** | grep for skip/one slot finds only unrelated lines (l.95–96, migration path) and l.112 "There is **no skip path**". l.104: "into a slot … fill an empty slot, else replace the lower-`saveSeq` slot via `diverged_tmp`; no skip path". l.197 F1: "both slot writes fail (injected) … slots change only by `fill`/`replace`". l.198: "first loser ⇒ `diverged` `{fill}`; second ⇒ `diverged2` `{fill}`; third ⇒ … `{replace}` via `diverged_tmp`". l.203 (2): "the lower of the two is replaced via `diverged_tmp`". l.290: "`{slot: 'diverged'\|'diverged2', action: 'fill'\|'replace'\|'dedupe'\|'write_failed', …}`". l.368: "one of two IDB slots `save/diverged`/`save/diverged2` … no skip path". l.137 inventory: "keys `main` (and `v6_backup` from S-3), `diverged` and `diverged2` … and `diverged_tmp` … Any other … key appearing is a FAIL"; exemption: "the IDB keys `diverged`, `diverged2` and `diverged_tmp` are exempt". l.136 byte-identical list includes all three. |
| M-2 | Reset clears all four | **PASS** | l.119: "`eggfarm.save.diverged_notice_shown` (all added to `RESET_KEYS`), and deletes IDB `save/diverged`, `save/diverged2` and `save/diverged_tmp` (M-2)". Row l.198 is the same. |
| M-3 | Replace order via tmp; restore; safe sweep | **PASS (order) / see M-4** | l.110: "first copy the evicted slot copy byte-for-byte to … `diverged_tmp` and read it back; then write the loser into the target slot … and read it back; only after that succeeds delete `diverged_tmp`. If the tmp write/read-back fails, the replace is not attempted … If the slot write or read-back fails, restore the old copy from `diverged_tmp` … if the restore fails, `diverged_tmp` is kept". l.112 sweep: "if tmp equals (by `sum` + state) a slot copy or either store's copy ⇒ delete tmp; otherwise it is the only copy ⇒ move it into an empty slot … and if no slot is empty keep tmp and show the diverged notice … The sweep never deletes the only copy." Row l.199 covers this, including a01faea leaving tmp byte-identical. |

## Shoulds
| # | Check | Status | Evidence |
|---|---|---|---|
| S-1 | l.186 expects `fill` | PASS | l.187: "`save_recovery_slot{slot:'diverged', action:'fill'}` fire (slots empty)". |
| S-2 | Diverged notice specified | PASS (Minor notes below) | l.113: trigger "a non-refused load after which `diverged`, `diverged2` or `diverged_tmp` holds a copy with a `slot_seq` above the once-flag; additionally shown on **every** load while both slots are full (or tmp is kept)"; once-flag "LS **`eggfarm.save.diverged_notice_shown`** = the max `slot_seq`"; testids `diverged-export` / `diverged-dismiss`; "Export downloads one file holding every slot copy (and tmp) byte-for-byte, and only after the download is triggered clears the exported keys; Dismiss clears nothing". Row l.200. |
| S-3 | §7 risk 13 | PASS | l.356: "13. **Third-divergence slot eviction (ADR M4-25 …)** … Mitigation: the diverged notice shows on every load while both slots are full … A failed replace never loses the old copy (`diverged_tmp`, M-3)". |
| Nit | a01faea Reset after rollback row | PASS | l.201: "rollback, then Reset in an `a01faea` build, then an M4 load ⇒ the old Reset leaves `diverged`/`diverged2`/`diverged_tmp` … intact; M4 shows the diverged notice". |
| HoQA cond. | `diverged_notice_shown` on the §3b allowlist | PASS | l.137: "and `eggfarm.save.diverged_notice_shown` (plain integer, diverged notice once-flag) likewise; so during a refused load they must stay byte-identical or absent". l.200 adds "never shown on a refused load". |

## SD5-1 / D-2 / F2-EQ consistency
- D-2: consistent. The loser stays byte-identical in a slot. While a replace is in progress, the evicted copy is byte-identical in tmp. The guard must accept copies in `diverged`, `diverged2` or `diverged_tmp`, and must count tmp in the zero-writes set.
- F2-EQ: the winner rule is unchanged (l.104). The slot clause is now two-slot. Consistent.
- §3b vs the notice: the once-flag is LS, an allowlisted key, and is never written on refusal. Consistent.

## New Musts
- **M-4 (Major): replace can overwrite a kept `diverged_tmp`.** l.110 always starts a replace by writing the evicted copy into `diverged_tmp`. Two paths leave tmp holding an only copy: the restore-failed path ("`diverged_tmp` is kept"), and the sweep with no empty slot ("keep tmp and show the diverged notice", l.112). If the same or a later load then hits a third divergence with both slots full, the replace's first write overwrites that only copy. The doc doesn't define how the sweep is ordered relative to the divergence move, either. Required: state that the sweep runs before the divergence move; and while tmp holds a copy that isn't a duplicate, a replace is not attempted (`write_failed`, loser store untouched, notice shown), or it stages to a fresh key. Add a row: tmp kept + both slots full + new divergence ⇒ tmp byte-identical, loser store untouched.

## New Shoulds (Minor)
- **S-4:** Export clears keys "only after the download is triggered" (l.113). On the iOS share sheet or the clipboard fallback, a triggered export can be cancelled, and the slots get cleared anyway. Clear only on a confirmed download or share completion, or keep the slots until the next Export/Dismiss.
- **S-5:** the once-flag is "the max `slot_seq`" (l.113). A new loser whose `saveSeq` is below an earlier shown one (rollback, or F2-EQ at equal seq) won't re-trigger the notice while a slot is still free. Key the flag on a per-copy identity (sum), or on any new `fill`/`replace`.
- **S-6:** the telemetry `slot` enum (l.290) has no `diverged_tmp`, and no action for sweep moves or deletes. Add a sweep or `tmp` action so restore and sweep outcomes are observable.

## Not run
No browser, unit or guard runs (doc-only). The guard update (3 IDB keys, tmp in the zero-writes set, D-2 accepting any slot) waits until the design is approved.
