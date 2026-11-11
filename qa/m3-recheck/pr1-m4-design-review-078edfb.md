# PR #1 SK-1 recheck: engineering/m4-design.md @ 078edfb (v0.3.9 + ADR M4-25) vs b606a4a
Saves QA · 2026-10-16 ~23:58 CEST · doc-only. No browser or test runs. No PR comments, push, merge or tag. Final verdict is HoQA's.
Line refs are to `git show 078edfb:engineering/m4-design.md`. They match b606a4a, because the one design change is an in-place edit of l.112.

**Recommendation: CHANGES REQUESTED.** Still open: M-1 and M-2 from b606a4a (see pr1-m4-design-review-b606a4a.md). 078edfb only adds ADR M4-25.

## Diff b606a4a..078edfb (1 commit, "ADR M4-25 accepted risk …")
- decisions.md: +6 lines, new entry **ADR M4-25** dated 23:58.
- m4-design.md l.112: one in-place edit adding "**Accepted risk for rc1** (HoE, 2026-10-16): see decisions.md, *2026-10-16 23:58 ADR M4-25*". Nothing else in that line changed.
- **Also changed, outside M4-25:** status.md has a new 23:58 Architect line. It notes a post-rc1 ticket, "NOT filed as a GitHub issue: creating issues needs the user's approval" (that is correct), and records Saves' candidate refinement for eviction: evict a copy that matches by sum+state first; otherwise keep the loser out of the slots and evict on the next load. This is informational only and changes no spec.
- **Verdict on the diff:** it is M4-25 only, plus the link at l.112 and the status line. None of the M-1/M-2 locations were touched.

## SK-1 checks
| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Two slots, no skip path | **PASS in §3c / FAIL doc-wide** | l.107, l.112 "There is **no skip path**". Skip or one-slot text is still at l.104 ("otherwise skip and leave the loser's store untouched"), l.136 (`save_recovery_slot{skip}`), l.196, l.197, l.199, l.286 (`{action: 'replace'\|'skip'}`, no `slot`), and l.363 ("the one IDB slot"). → M-1 |
| 2 | diverged2 on the §3b list | **PASS (list) / FAIL (inventory)** | l.135 lists `diverged2`. l.136 still says the only keys are "`main` (and `v6_backup` …), and `diverged` … Any other … key appearing is a FAIL", and its exemption names only `diverged`. → M-1 |
| 3 | Pre-SQ-1 ignores and keeps the slots | PASS | l.193; l.107 "never read, write or delete either key". |
| 4 | Rollback rows: slot → a01faea → M4 | PASS | l.192 (L1/L2 survive, plus the case where both writes fail). |
| 5 | Dedupe by sum + state | PASS | l.109; l.194 `action:'dedupe'`. |
| a | 3rd-divergence residual risk + Export offer in M4-25 | **PASS** | decisions.md M4-25: "with both recovery slots … full, a third divergence evicts the lower-`saveSeq` slot copy, which may be the only remaining copy of that loser"; "**accepted for rc1** … Mitigation: the diverged notice offers Export whenever both slots are full". Linked from l.112. Should S-2 still applies: the "diverged notice" is not specified (trigger, show-once key, testid, which slot Export exports or clears), and §7 has no entry. |
| b | Nothing overwritten before read-back | **PASS for the stores / Should on the slot** | l.110–112 unchanged. S-3 still applies: if a replace's read-back fails, the evicted slot copy is already gone. M4-25 covers deliberate eviction, not a failed replace. |

## SD5-1 consistency
D-2 and F2-EQ winner rules are consistent. The F2-EQ slot clause (l.104) and the SD5-1 "slot skip" variant row (l.199) still describe skip → M-1.

## Musts (unchanged from b606a4a)
- **M-1 (Major):** carry the two-slot/no-skip rule through l.104, l.136 (key list, exemption, skip sentence), l.196, l.197, l.199, l.286 (telemetry `{slot, action: fill|replace|dedupe|write_failed, …}`), and l.363.
- **M-2 (Major):** Reset at l.118 must also delete IDB `save/diverged2`, as l.112 says ("Reset clears both slots").

## Shoulds
S-1 (l.186 `replace` → `fill`), S-2 (define the diverged notice, say what Export does with two slots, add a §7 entry), and S-3 (failed replace read-back), all Minor. Nit: a row for an a01faea Reset after rollback.

## Not run
No browser, unit or guard runs (doc-only). The guard update for two slots waits on M-1.
