# Gate 4 (saves), capped: 45eb5e3755aef9bc300f8b94a39653f837c49d80
**VERDICT (07:55 CEST): PASS.** The EXP-SB-QE-LATE Major is fixed for paths a, b and c. **Residual (HoQ: Minor, next release): answer to HoQ's question = YES**, see below.

## Lineage / diff (own check)
- 45eb5e3 is a fast-forward of 8396ed1. Diff: src/ui/tracks-explainer.ts (+1/-1: `seenTracksExplainer=false` before `return null`) and tests/m4-exp1-explainer.test.ts only. No change to save, game, sim, CSV, balance or lockfile.

## Results (own worktree /tmp/qa-g4s/c9d7523 at 45eb5e3, clean)
| Check | Result |
|---|---|
| static build-id dist/dist-qa/dist-html | PASS m3-rc1-pre+45eb5e3, no +dirty |
| runtime build-id Chromium | PASS ["m3-rc1-pre+45eb5e3"] |
| check-globals Chromium | PASS |
| check-release-build | PASS |
| marker, migrate-once, interrupted, rollback, flag-off, sanitize 16/16, explainer EXP-a/b/c/EXP1/lookalike | PASS |
| EXP-SB (lease blocked) x2, EXP-SB-QE (real QuotaExceededError) x2 | PASS |
| QE-LATE (reload-committed-unseen, commit-in-session) | PASS (failed on 8396ed1) |
| QE-LATE-a: QE on the flag write, quota freed, autosave to LS, reload | PASS: mem=false, LS stays false, shown once on reload, never again |
| QE-LATE-b: QE on LS while the IDB mirror succeeds, reload prefers IDB | PASS: the mirror copy is rewritten with seen=false by the next save, reload src=idb, shown once |
| QE-LATE-c: a + mirror | PASS: shown once |
| **QE-LATE-d: QE on the flag write, catch-path mirror write, tab dies (no further save), reload with the IDB copy** | **FAIL, residual** |
Totals 39 passed, 1 failed (d), 2 = F50/H55 N/A BY RULING D-CEO-09. On 8396ed1, QE-LATE-a, -b and -c all FAILED (0 cards ever: LS/IDB persisted seen=true), which confirms the fix.

## HoQ question: does reconcile prefer the catch-path mirror copy (seen=true) after the tab dies? **YES**
Evidence (marker.log `QE_LATE_d`): `idbAtDeath: true` (the catch at game.ts:253 wrote seen=true to the mirror, because g.save() runs BEFORE the explainer resets the flag), **idb saveSeq 5 > localStorage saveSeq 4**, reload `reconcile(...) = 'idb'`, reload1=0, reload2=0. **The card never shows.** The flag is persisted without the card.
Repro: EXP1 fixture, fake IDB mirror; quota throws on the first eggfarm.save* write that carries seenTracksExplainer:true and on every one after it; no further save; quota freed; reload with reconcile(kv, idbRaw).
Fix idea (HoE): in the explainer, check whether the write can succeed before setting the flag, or have Game.save's catch-path mirror write omit seenTracksExplainer. Either way, a save.ts or game.ts change is needed. Per HoQ, this is a Minor for the next release.
Test: qa/m3-scripts/gate4-explainer.qa.test.ts `EXP-SB-QE-LATE-d`.
