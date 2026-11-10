# #100 v5-m51-bbv2: Architect M1/M2 delta addendum at e7f3ca7

Date: 2026-11-05 ~23:45 CET · Lane: architect · Prior: v5-m51-bbv2-92381ed-architect-addendum.md (PASS delta, flag 0), v5-m51-bbv2-b6dec409-architect.md (M1/M2 flip blockers)

## STATE: **HELD** (HoE hold 23:40 CET, pending a replacement green tip). No further work on e7f3ca7. No SUCCESS claimed and no approval at this SHA. Findings below are preserved for the delta recheck on the new SHA.

## Verdict (as found before the hold): **FAIL at exact e7f3ca7c71eb73eaf6e2acc98964bf2b7dcf3009**: hosted gate RED, reproduced locally
The M1 and M2 content is correct against the rulings (details below). However, the head breaks a required test: tests/v5-f3-config.test.ts [F3-no-literal]. A follow-up commit is needed. It must not weaken F3.

## Identity
- origin v5-m51-bbv2 = pull/100/head = e7f3ca7. PR #100 is open, NOT draft (HoE "Ready for CI"; I made no change), base rc/v5 844f8e15. 30 files, +1124/−65.
- Commits on top of 92381ed (Generalist):
  - 8a514e4c8cc5052da6d12fce32427429d8b1e8a3 "M1: isolate Q-E2 from BR-R5 hatchCostCents" (22:48 CET).
  - e7f3ca7 "M2: ENFORCE v1.0.4 ship empty BBv2 set → no-pick" (23:03 CET).
- Delta 92381ed..e7f3ca7: 13 files, +296/−21.

## BLOCKER B1: F3-no-literal regression (hosted gate run 42119624080, job 127568254060: completed FAILURE 23:37:21 CET; 1 failed | 2184 passed | 1 skipped)
- The F3 rule (v5-f3-config.test.ts:117) classifies any src file that calls `flagOn(` as an M5 module and scans it for bare literals.
- e7f3ca7 adds direct `flagOn(b, 'zeroGainUi')` calls in src/econ/best-buy.ts and src/ui/next-goal.ts. That pulls 12 pre-existing literals into scope:
  - best-buy.ts: 36/51/59 (100), 103/104/174 (1e-12), 113/151 (3)
  - next-goal.ts: 25/27/28 (100), 88 (2)
- Reproduced locally (f3-config.log: 1 failed / 27). Control at 92381ed: 28/28 pass.
- The Generalist's 72-test focused set did not include v5-f3-config.
- Suggested shape (Eng owns it; I wrote no code): read zeroGainUi through a named accessor in src/config/flags.ts, like `bestBuyV2On`. Do not edit F3 or NAMED_OK, and do not import ui/zero-gain into econ (layering).
- After that fix: new exact SHA → hosted gate + Architect delta recheck + QA.

## M1: Q-E2 isolated from BR-R5 hatch cost (D-ECON-20261105-M1-QE2-HATCH (a), HoP adopted 22:33, PMC wording 22:34): CONTENT CLOSED, as a flip prerequisite only
- Change:
  - `IncomeOpts.ignoreQE2`. collectPerSec planner branch: `bestBuyV2On(b) && !ignoreQE2 ? tap/every_s : tap*1.5`.
  - hatchCostCents passes `{assumeWorking:true, ignoreQE2:true}`. assumeWorking is kept and the rounding is unchanged, per PMC.
  - Default planner/best-buy still applies Q-E2 (BB-AC10).
- Other sim readers of bestBuyV2/zeroGainUi: income.ts:39 is the only bestBuyV2 read under src/econ|src/sim, and src/sim has no zeroGainUi read. rankable is consumed only by src/ui (and best-buy's bestPaybackAmong, which is UI-only), so bots/sim never see it.
- Independent probe (m1-probe.ts, not committed):
  - Setup: 129,024 states, breeds on: F10–30 × H × V × C × 16 worker subsets × grader tier 0/5 × energy 100/5. Configs: bb0zg0, bb1zg0, bb0zg1, bb1zg1.
  - e7f3ca7: hatchCostCents diff 0, startHatch charged coins/incubator.costCents diff 0, sampled 60 s `step` full-state diff 0 (1,330 samples). EXIT 0.
  - Control at 92381ed: cost/charge diff 9,364. So the probe detects M1.
  - This covers far more than the PR test's 8 states.
- Residual nit n1: `hatchEstimate` (sim/breeds-hatch.ts:94) still uses Q-E2 income. Its only consumer is the dev/QA hook eggfarmQa.breeds.hatchEstimate. It is display-only and not a charge.
- Note: with breeds = 1, anyM5FlagOn is already true, so the step probe cannot exercise D-HOE-38 (UI flag alone toggling timers). D-HOE-38 remains a separate, open flip hold.

## M2: ENFORCE v1.0.4 ship no-pick (D-HOP-2026-11-05-14 option B; Card #12 9f900304; spec v1.0.4 4ea3841a): CORE CLOSED, flip ACs PARTIAL
- Change:
  - `rankable`: when the meaningful set is empty, ship (bb1 + zg1) returns `[]`, and zg0 still returns all keys (DECISIVE net).
  - selectGoal: in ship with an empty set, it does not fall back to c0 and returns key null.
  - All 4 picker paths go through rankable (DualPicker hint, highlight, next-goal pool, tracks highlightPick).
  - No v1.0.5/v1.0.6 semantics, no waiver.
- Not merely hiding: no-pick fires only when meaningfulKeys is empty, which is exactly the D-HOP-14 contract. When the set is non-empty, behaviour is byte-identical to 92381ed (probe below).
- Independent probe (m2-probe.ts, cross-head vs 92381ed):
  - Setup: 72,000 states (F1–30 × H × V × C × 16 worker subsets × tier × coins 0/1e5/1e12) × 4 configs.
  - Results:
    - pathBad 0: the empty ship set gives hint, highlight, selectGoal.key and highlightPick all null, and a non-empty set never yields a non-meaningful hint.
    - Regression in bb0zg0/bb0zg1/bb1zg0 = 0.
    - Ship regression when the set is non-empty = 0.
    - Planner income (Q-E2) diff vs 92381ed = 0, so there is no Q-E2 planner regression.
    - 30 empty-ship states, 18 of them changed.
- Slow seeds 1–200 (mine, at e7f3ca7, flock + nice 10, 1 fork, 1136 s, EXIT 0):
  - AC9: 0 zero-gain of 42,737 buys.
  - DECISIVE zg0: violations 0, suppressedAffordable 25,297 (identical to fbce499, so the contract is unchanged), Below30 0.
  - CONFIRMATORY ship: violations 0, **suppressedAffordable 0** (was 18), Below30 0, suppressed 374,469 (was 377,932).
  - This is the global count, not just below L30, and the slow test now asserts it.
- D-HOP-14 flip ACs:
  - (1) CONFIRMATORY suppressedAffordable === 0 at all Farms: MET (200 seeds, mine).
  - (2) DECISIVE contract unchanged: MET.
  - (3) Strict set on all 4 paths, empty → no-pick: MET (code + probe).
  - (4) L30+ capacity-only HENS fixtures:
    - Breeds off → no-pick: MET.
    - Breeds on → BR-BB4 "Hatch · $X"/"Hatch · in Xs": **NOT MET**.
      - src/ui has no hatch UI at all. In ship with an empty set, selectGoal returns "All upgrades done!" even with breeds on.
      - The test's breeds loop only hits states where COLL is meaningful, so it never covers empty set + breeds on. Test comment: "BR-BB4 … is separate UI".
      - Needs implementation or a HoP/HoE scope ruling before the flip (finding N1).
  - (5) Diagnostic of the 18 states: **PARTIAL** (finding N2).
    - engineering/tasks/bbv2/m2-18-state-diagnostic.md/.json is a *reconstruction* with an explicit empty→all scorer. It found 960,329 suppressedAffordable, not 18. The 40 rows are consecutive runM2 seed 1, F30 H29 V30 C11.
    - It shows the defect shape (meaningful empty, capacity-only HENS selected), but it is not the dump of the 18 states the actual pre-fix appPicker produced, and the counts don't reconcile.
    - Acceptable as shape evidence only. HoP/QA decide whether AC5 is satisfied.
  - (6) Flag 0 byte-identical: MET.
    - Goldens flagoff a01faea + m4on 90a9c84 pass, m4a-flag-off passes.
    - The probe shows zero bb0 change, and the PR test checks the absent-key equality.
- N3 (Minor, UX/copy, for PM/UI QA): in ship with an empty set, the strip shows `state 'done'`, "All upgrades done!", tab 'workers', while HENS/COLL capacity rows are still purchasable. This reuses existing copy (spec: "no new copy"), but the wording is literally false there. UI QA should confirm at 360 on 3 engines (HoQA bar).

## Prior Minors at this head
- m1 (starred FARM label bypasses 27-cp truncator): OPEN. Untouched; flip-time UI QA.
- m2 (AC14 "no exception" not asserted): **CLOSED**. The unit and slow tests now assert CONFIRMATORY suppressedAffordable === 0.
- m3 (BB-AC1 coverage): OPEN (non-blocking).
- m4 (AC-W1 flag-0 band, QA N-3): OPEN (non-blocking).

## Independent evidence (worktree /workspace/wt-arch-review100-e7f3ca7, clean before and after, Node v20.19.2, lane-run architect, flock + nice 10, maxWorkers=1)
- npm ci 0, tsc 0.
- Focused: 22 files / 293 tests pass. Includes bbv2-m1/m2/parta/qapicker/qe2/sim/telemetry, v5-breeds*, zg-*, v5-f3-qa-seam, m4a-flag-off, telemetry-schema and both goldens. AC14 seeds 1–3: CONFIRMATORY suppressedAffordable 0.
- **v5-f3-config: 1 FAILED / 27** (B1). Control at 92381ed: 28/28.
- build + build:html EXIT 0.
- Slow bbv2-sim 200 seeds: PASS (above).
- Probes m1 (and control) and m2: as above.
- Full suite not rerun. The hosted gate ran it: 1 failed / 2184 passed.
- Logs, probes, hosted dumps and SHA256SUMS: scratch/architect/review100-e7f3ca7/.

## Hosted (read-only, 23:44 CET, exact head_sha e7f3ca7)
- **gate (run 42119624080): FAILURE** at 23:37:21 CET (F3-no-literal). release-globals skipped.
- verify-smoke: SUCCESS (23:27:34 CET).
- pacing-x1 shards (optimal, casual, seller15) and K10 monitor: IN PROGRESS (runs 42119624197 / 42119624210).
- Earlier runs 42119213462/463/482 were all skipped (draft at the time).

## Gates and remaining holds
- **Merge (flags 0):** blocked by B1. Needs the B1 fix commit → new SHA → hosted gate SUCCESS (X1 expected pattern, K10 known-red) → Architect delta recheck → QA exact-head verdict.
- **Flip of bestBuyV2 (held per D-HOE-38):**
  - M1 content done.
  - M2 core done, but the D-HOP-14 flip ACs still need: AC4 breeds-on BR-BB4 (N1), an AC5 decision on the reconstruction (N2), N3 copy and m1 UI QA at 360 on 3 engines.
  - Still needed: the D-HOE-38 SIM-only flag list (Architect, not started), Econ/HoQA flag-on goldens (BB-AC13), and the HELD-flip diff/seam pin.
- No Ready/PR post/push/merge/messages/code writes done.
