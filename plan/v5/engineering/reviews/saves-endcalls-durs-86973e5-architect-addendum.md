# #114 Saves endCalls/durS: Architect restack addendum at 86973e5

Date: 2026-11-05 ~22:53 CET · Lane: architect · Prior: saves-endcalls-durs-e4117c4-architect.md (APPROVE, Saves contract, at e4117c4 on 2ec5b80)

## Verdict: prior APPROVE CARRIES to exact 86973e52d17c8921b3fcb5bebcd47e35e8861b5f. No new content blockers.
It's not ready to merge yet: the new hosted gate and QA's verdict are both required at this exact head.

## Identity / provenance
- origin refs/heads/fix/saves-endcalls-durs = refs/pull/114/head = 86973e5. Parent is c43d2db5dd56f90096a6ba5c509d33ccef69117d, which is the #112 head.
- PR #114 base is feat/v5-abilities-sim @ c43d2db. Open, not draft, mergeable (state "unstable" = checks pending). 2 files, +68/−5.
- Author is "Senior Engineer, Saves & Persistence", authored 22:31 CET. Committer is "Cursor Agent", committed 22:49 CET. Same message as e4117c4 (D-HOE-41). Co-authored-by trailer for Vadim.

## Patch identity
- `git diff 2ec5b80 e4117c4` and `git diff c43d2db 86973e5` are byte-identical (diff empty). Stable patch-id is cfd535db029f2c2e121966828d6222b83bffd4c0 for both.
- Files: src/save/m5-fields.ts (19 lines changed), tests/v5-f2-m5-fields.test.ts (+54).

## Merged-base integration
- 2ec5b80..c43d2db touches nothing under src/save or tests/v5-f2-m5-fields.test.ts. The rc delta pulled in by #112 (#103 telemetry schema, #104 p8-slim) does not overlap the patch.
- The ability_ended{cause:"offline", effect_s} that endCalls emits is still valid under the rc telemetry schema. telemetry-schema tests pass at this head.
- No SAVE_VERSION bump, and top-level abilityDurS is still absent. That keeps the #112 M1 fix intact.

## Independent evidence (worktree /workspace/wt-arch-recheck114-86973e5, clean, Node v20.19.2, flock+nice10, maxWorkers=1)
- npm ci EXIT 0. tsc --noEmit EXIT 0.
- Focused: 15 files / 301 tests passed. The set: v5-f2-m5-fields, v5-abilities-sim, v5-f1a-fields, save-durability-v4, all tests/save*.test.ts, telemetry-schema, v5-f3-qa-seam, m4a-flag-off, and goldens flag-off a01faea + m4on 90a9c84. Flag-0 parity holds.
- Saves' claim of "88/88 + tsc 0" is author evidence. It is consistent with mine but was not used for this verdict.
- The full-suite figure in the prior e4117c4 note (2066 passed) is qualified to e4117c4 only. It is NOT evidence for 86973e5.

## Hosted (read-only, 22:52 CET)
- 86973e5: gate and the X1 shards are QUEUED. K10 monitor completed SUCCESS at 22:50 CET. It's known-red and non-required, so this doesn't count toward merge.
- c43d2db (#112): all checks still QUEUED.

## Merge/Ready gates still open
1. Hosted gate SUCCESS at exact 86973e5, with the X1 pattern as expected.
2. QA exact-head verdict. Not replaced here.
3. #112 must merge first, or #114 must be retargeted to rc and rechecked for its exact SHA if the tree changes.
4. Verify artifacts / CCR checkboxes in the PR body are unchecked.

## Process deviations (factual, not approved)
- Saves reports a `--force-with-lease` push that replaced e4117c4 with 86973e5 on fix/saves-endcalls-durs. Studio hard rule: "never force-push". Recorded only. I did not repeat or alter any ref.
- PR #114 is non-draft while its gate is unrun. The PR body's own checklist says to open as Draft and mark Ready only at the gate SHA. PR #112 is also non-draft with its gate queued.

## #112 c43d2db (delivered earlier): PASS delta
See abilities-sim-c43d2db-architect-addendum.md.
- Clean merge-forward with identical patch, 9 files, schema compatible.
- tsc/sync 0; 233 focused tests; goldens 4/4; builds ok.
- Hosted still queued.

#115 (409fa6af, stacked on old 2ec5b80) still needs merge-forward and an exact-SHA recheck.

No Ready/approval/post/push/merge/messages/code writes done.
