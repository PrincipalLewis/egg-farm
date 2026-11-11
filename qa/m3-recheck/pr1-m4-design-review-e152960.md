# PR #1 recheck: engineering/m4-design.md @ e152960 (v0.3.11, ADR M4-19 rev 6) vs 1d88d7c
Saves QA · 2026-10-17 ~00:15 CEST · doc-only. No browser or test runs. No PR comments, push, merge or tag. Final verdict is HoQA's. (The 1d88d7c report is kept as filed.)
Line refs are to `git show e152960:engineering/m4-design.md`.

**Recommendation: CHANGES REQUESTED.** Every one of the Architect's claims is in the doc, and everything carried over from 1d88d7c PASSes. 1d88d7c M-4 is **still open, and the new ordering makes it certain to occur**. The replace step (l.110, unchanged) still stages into `diverged_tmp` without checking whether tmp already holds a kept unique copy. And the sweep now explicitly runs *after* the divergence move (l.112). So with tmp kept and both slots full, the next divergence overwrites tmp before the sweep could protect it. That breaks HoQA's condition "only ever one temp key, never appended" in the destructive direction: the single key is *overwritten*.

## Diff 1d88d7c..e152960 (1 commit)
m4-design.md +8/−5: header, l.112 sweep paragraph, l.136–137 §3b wording, row l.194 extended, new rows l.200–202. decisions.md +5 (ADR M4-19 rev 6, 00:10). status.md +1. **l.110 (the replace step) is untouched.** Nothing else changed.

## Architect's claims
| Claim | Status | Evidence |
|---|---|---|
| tmp + flag (plain integer) on §3b | PASS | l.136: "**`eggfarm`/`save`/`diverged_tmp`** (IDB replace staging key, M-3)". l.137: "**`eggfarm.save.diverged_notice_shown`** (allowlisted LS key: a plain integer flag … **never save data**)". |
| Sweep and notice only after the refusal check | PASS | l.112: "The sweep and the diverged notice run **only after the refusal (newer-version) check passes**; a refused load never sweeps, never writes `eggfarm.save.diverged_notice_shown`, and never touches `diverged`, `diverged2` or `diverged_tmp`". |
| No sweep while a same-boot read-back is unverified | PASS | l.112: "never runs while any slot read-back of this boot is unverified (it runs after the divergence move has finished and every slot written this boot has been read back)". |
| tmp deleted only after a confirmed duplicate | PASS | l.112: "deletes tmp **only after verifying by read-back** that a slot or store currently holds a duplicate of it by `sum` + state". |
| Both full ⇒ keep, notify, never evict | PASS (for the sweep only) | l.112: "if **both slots are full, keep tmp and show the diverged notice (Export includes it); the sweep never evicts a slot**". The *replace* path does not respect a kept tmp → M-4. |
| Rows: rollback keeps 3 / refused touches nothing / unverified keeps tmp / both-full keeps tmp | PASS | l.194 "ignores `diverged2` and `diverged_tmp` … all three keys byte-identical and not deleted"; l.200 "refused load … no sweep, no notice, flag and all three IDB keys byte-identical"; l.201 "slot write of this boot unverified ⇒ sweep not run, tmp kept"; l.202 "tmp (unique) and both slots full ⇒ tmp kept, both slots byte-identical (no eviction), diverged notice shown". |

## HoQA conditions
| Condition | Status | Evidence |
|---|---|---|
| tmp can't grow without bound: one key, never appended | **FAIL** | There is one key and the sweep never appends to it (PASS so far). But l.110: "Replace (both slots full, M-3): first copy the evicted slot copy byte-for-byte to IDB **`eggfarm/save/diverged_tmp`**". There is no guard for an occupied tmp. Because l.112 orders the sweep after the divergence move, a kept unique tmp (l.202 state) plus a new divergence means the replace overwrites the only copy. Row l.202 doesn't cover a divergence on that boot. → M-4 |
| Doesn't keep a later main save from saving | PASS | Keeping tmp touches no main path. l.112: "the winner is played in memory, its store keeps saving". Only the *losing* store is held, and only on `write_failed` (l.137). Neither the sweep nor the notice blocks autosave. (After M-4's fix, the loser's store stays unwritten while tmp is kept. That is the existing write_failed behaviour, and the winner's store is unaffected.) |

## Checks carried over from 1d88d7c
| # | Status | Evidence |
|---|---|---|
| M-1 no one-slot/skip wording | PASS | Unchanged from 1d88d7c. The only "skip" matches are the unrelated l.95–96 and l.112 "no skip path". l.104, l.197–199, l.206, l.290 and l.371 are two-slot; the l.137 inventory lists `diverged`, `diverged2`, `diverged_tmp`. |
| M-2 Reset | PASS | l.119: "`eggfarm.save.diverged_notice_shown` … deletes IDB `save/diverged`, `save/diverged2` and `save/diverged_tmp`". |
| M-3 replace order, restore, safe sweep | PASS (order) / FAIL (M-4) | l.110: tmp copy + read-back → loser write + read-back → delete tmp; restore from tmp on failure. The sweep is now stricter (l.112). |
| S-1 `fill` | PASS | l.187: "`save_recovery_slot{slot:'diverged', action:'fill'}` fire (slots empty)". |
| S-2 notice spec | PASS | l.113: trigger, once-flag, `diverged-export`/`diverged-dismiss`, Export of all copies; row l.203. |
| S-3 §7 #13 | PASS | l.359. Note that it says "A failed replace never loses the old copy (`diverged_tmp`, M-3)". That is true only once M-4 is fixed. |
| Nit: a01faea Reset row | PASS | l.204. |
| HoQA: flag on the allowlist | PASS | l.137 (quoted above). |

## D-2 / F2-EQ
Consistent: winner rules unchanged (l.101, l.104). Guard note: the loser can sit in any of the three IDB keys, and refusal zero-writes covers all three plus the flag (l.200, l.205).

## Musts
- **M-4 (Major, open since 1d88d7c, now certain to occur): a replace must not overwrite an occupied `diverged_tmp`.** In l.110, add: "if `diverged_tmp` already holds a copy that is not a verified duplicate, the replace is not attempted (`write_failed`, loser store untouched, notice shown)". Alternatively, run the sweep's verified-duplicate delete *before* the divergence move. Add a row: tmp unique + both slots full + new divergence on that boot ⇒ tmp, both slots byte-identical; loser store untouched; `{write_failed}`; notice; winner store keeps saving. Update §7 #13 wording to match.

## Shoulds (Minor, still open from 1d88d7c)
S-4 (Export clears once the download is "triggered", l.113), S-5 (a max-`slot_seq` once-flag can miss a lower-seq new copy), S-6 (no `diverged_tmp` / sweep values in the telemetry at l.290). None of them were addressed in this diff.

## Not run
No browser, unit or guard runs (doc-only). The guard update waits for approval.
