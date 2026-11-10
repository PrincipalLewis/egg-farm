# #112 abilities sim — Architect delta recheck at c43d2db (merge-forward onto rc/v5)

Date: 2026-11-05 ~22:50 CET · Lane: architect · Prior: abilities-sim-2ec5b80-architect-addendum.md (sim APPROVE)

## Verdict: PASS (delta) at exact c43d2db5dd56f90096a6ba5c509d33ccef69117d

## Identity
- PR #112 head (origin, read 22:49 CET) = c43d2db5dd56f90096a6ba5c509d33ccef69117d, base rc/v5 = 844f8e15774daeb1c0a855cb69b1fabd2f0ab820; not draft; mergeable (state "unstable" = hosted checks queued).
- Parents: 2ec5b803e65bc6c16299202d581114e3cacdebdf (approved) + 844f8e15 (current rc/v5). Old base 30df38c.
- Merge commit authored as "Senior Software Architect" (same identity, not by this review task) — noted for independence.

## Diff preservation
- c43d2db tree 0c45985a == clean `git merge-tree` of the two parents → no manual conflict resolution.
- Patch rc..c43d2db identical to 30df38c..2ec5b80 except the src/sim/workers.ts index line and a hunk offset (@@ -36 → -38).
- 9 files, +402/−10 (matches GitHub): src/sim/{abilities,effects,events,m5-state,payout,timers,workers}.ts, tests/v5-abilities-sim.test.ts, tests/v5-f1a-fields.test.ts.

## Merged-rc compatibility (#103 telemetry schema, #104 p8-slim)
- src/telemetry/schema.ts `ability_used` fields match events.ts; cross-rule combo⇒in_sheet holds (`combo = inSheet && !viaAll && comboQualifies(...)`).
- `ability_ended` cause enum (expired|paused|offline|asleep|unpaid) and `ability_blocked` reasons match; `ability_active` fields present.
- No UI files touched; p8-slim untouched.

## Regression checks
- M1 stays closed: no top-level abilityDurS; per-entry durS persisted in AbilityState {readyAt?, activeS?, durS?}.
- API guards: TimerSystem identity unless m4.flags.abilities; graderMult tierAdd defaults 0; comboQualifies requires abilities && rc2Refill and a finite value ≥ 0 (refillAgoSimMs); tcNum used, no production literals 10/45.
- rc balance.json flags abilities=0, rc2Refill=0 → inert at release.

## Evidence (worktree /workspace/wt-arch-recheck112-c43d2db, clean, Node v20.19.2, flock+nice10, maxWorkers=1)
- tsc EXIT 0; sync-economy EXIT 0.
- Focused, 14 files / 233 tests pass: v5-abilities-sim, v5-f1a-fields, v5-f2-m5-fields, telemetry-schema, telemetry, telemetry-m3, workers, workers-v11, sellall-label-grader, save-durability-v4, v5-p8-slim, zg-telemetry-annotate, m4a-flag-off, v5-f3-qa-seam.
- Goldens flag-off a01faea + m4on 90a9c84: 4/4 pass (flag-0 parity holds).
- build + build:html EXIT 0 (check-release-build ok). Tree still clean afterward.
- No local full-suite rerun: the delta is a clean merge with an identical patch; the hosted gate covers the full suite on Node 20.
- Logs + SHA256SUMS: scratch/architect/recheck112-c43d2db/.

## Hosted (read-only, 22:49 CET)
gate, X1 shards (optimal/casual/seller15) and K10 monitor all QUEUED. Not yet evidence.

## Ready / merge recommendation
- Architect delta gate: met at c43d2db.
- Merge still needs (QA-D-1105-PR112-114): the hosted gate GREEN at this exact SHA (expected pattern: X1 summary red only for the RC row, K10 known-red non-required) and QA's own verdict and UI check. Not replaced here.
- Saves gap from the prior note (m5-fields endCalls must honour durS and clamp effect_s) is NOT fixed in #112. It's acceptable for merge at flag 0, since it's inert. It BLOCKS any abilities flag flip until #114 lands.
- Follow-up: #114 (e4117c4) and #115 (409fa6af) are stacked on old 2ec5b80. Each needs a merge-forward/retarget onto rc after #112 merges, plus a fresh exact-SHA Architect recheck.

No Ready/approval/post/push/merge/messages/code writes done.
