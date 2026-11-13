# #100 v5-m51-bbv2: Architect content delta at ae12da4 (merge-forward onto rc f8036e8f / #105 income-ref)

Date: 2026-11-06 ~00:20 CET · Lane: architect · Prior: v5-m51-bbv2-c8cc5e3-architect-addendum.md (content PASS), v5-m51-bbv2-e7f3ca7-architect-addendum.md (M1/M2 findings, HELD)

## Verdict: content PASS (delta) at exact ae12da452fa00443a1d12078cd8f9468d34c3591
This is not merge clearance. The hosted gate at this SHA was IN PROGRESS and QA has no verdict. The flip stays held, unchanged.

## Identity
- origin v5-m51-bbv2 = pull/100/head = ae12da4. PR #100 is open, not draft, base rc/v5 @ f8036e8f (current rc tip). 31 files, +1129/−68.
- Parents: c8cc5e3f2e10e14627edad1cce5684d53b8d1c76 (prior content PASS) and f8036e8f0826ca76fcc0ee13092d575533d4969b (rc, #105).
- Author: Generalist, 00:07:36 CET. Message: "Merge rc/v5 (f8036e8f, #105 income-ref) into v5-m51-bbv2".
- c8cc5e3..ae12da4 brings exactly #105's 8 files: formulas, m5-rules, game.ts, m5-fields, actions, income-ref.ts, timers, v5-income-ref test.

## Merge-tree / conflict audit (not a clean merge)
- `git merge-tree c8cc5e3 f8036e8f` has 1 conflict, **src/game.ts** (frame catch-up block). Everything else auto-merged.
- The ae12da4 tree (e5b16256) differs from the merge-tree result (f72808d0) only in that hunk.
- Resolution: rc's lines are kept verbatim (comment + `this.state = gap >= maxMs && incomeRefOn(b) ? resetIncomeRef(r.state) : r.state;` + frameFarm/accMs/emit). Then #100's `if (this.bbTel) { bbSimMs += min(gap,maxMs); bbTel.sample(floor(bbSimMs/1000), this.state) }` follows.
- Semantics and order audit:
  - resetIncomeRef only deletes `irefRingCents`/`refWarmS` (income-ref.ts:71–74). farmLevel is unchanged, so `frameFarm = r.state.farmLevel` is equivalent.
  - `Bbv2Tel.sample` (telemetry/bbv2.ts:79–84) reads farmLevel and `meaningfulAffordable` (best-buy optionGain / incomePerSec). It reads no I_ref field and does not mutate state. So sampling post-reset gives the same result as pre-reset, and it matches c8cc5e3, where `this.state = r.state` preceded the sample.
  - The warm-up is correct. rc's intent is preserved exactly: the capped catch-up's absent-time sales are recorded, then the ring is dropped at the return boundary (§4.1a), so the next read starts the I_ss warm-up. m5Offline's own pre-advance reset is unchanged.
  - Q-E2 / hatch isolation: income-ref's I_ss uses live `incomePerSec(s,b)` + `wagesPerSec`, with no `assumeWorking`. The Q-E2 branch (income.ts:39, assumeWorking only) can't reach it. hatchCostCents (`assumeWorking`+`ignoreQE2`) is untouched.
- Probe (frame-probe.ts, real `Game.frame`, 90 s warm, then a 120 s stall, then 1 frame; bestBuyV2 × tapCoins):
  - tapCoins = 1: ring present / warm 90 → after the stall ring gone, warm null → next frame warm 1. This is **identical for bestBuyV2 0 and 1**.
  - bestBuyV2 = 1: bbSimMs 90,000 → 150,000 (+min(gap, 60 s)). This is **identical for tapCoins 0 and 1**.
  - Flag 0: no ring and no bbTel.
  - Result: neither feature perturbs the other.

## Patch preservation / no regressions
- PR patch f8036e8f..ae12da4 vs 844f8e15..c8cc5e3: identical except the game.ts hunk context (the bbTel line is unchanged).
- #105 touches none of the M1/M2/F3 files: income.ts, breeds-hatch.ts, best-buy.ts, next-goal.ts, pick-hysteresis.ts, tracks-ui.ts, zero-gain.ts, config/flags.ts are byte-identical to c8cc5e3.
- check-release-build.mjs:74 still lists both `eggfarmQa` and `qaPicker`.

## Evidence: NEW at ae12da4 (worktree /workspace/wt-arch-review100-ae12da4, clean before and after, Node v20.19.2, lane-run architect, flock + nice 10, maxWorkers=1)
- npm ci 0; tsc 0; sync-economy --check 0.
- Focused: **28 files / 376 tests pass**. Files: v5-f3-config, v5-f3-is-paused, bbv2-m1-hatch-qe2, bbv2-m2-ship-nopick, bbv2-parta/qapicker/qe2/sim/telemetry, v5-breeds-hatch, v5-income-ref, v5-f2-game-settle, v5-f2-m5-fields, offline, zg-*, v5-f3-qa-seam, m4a-flag-off, telemetry-schema, telemetry, goldens flagoff a01faea + m4on 90a9c84.
- AC14 seeds 1–3 identical to e7f3ca7/c8cc5e3: CONFIRMATORY suppressedAffordable 0, DECISIVE 334.
- build + build:html EXIT 0 ("no ?debug/?perf/?ios/QA hooks ok").
- frame-probe: EXIT 0.
- The author's 193 focused tests were not used.
- Logs + SHA256SUMS: engineering/reviews/evidence-v5-m51-bbv2-ae12da4/.

## Evidence CARRIED (not re-run at this head)
Justification: the M1/M2 logic files are byte-identical to e7f3ca7/c8cc5e3. The added timer system (incomeRef) is identity unless tapCoins.
- M1 probe: 129k states, 0 diff; control 9,364.
- M2 probe: 72k × 4, pathBad 0.
- Slow seeds 1–200 (run at e7f3ca7): AC9 0/42,737; DECISIVE 25,297; CONFIRMATORY suppressedAffordable 0.
- Logs: scratch/architect/review100-e7f3ca7/.

## Hosted (read-only, single read ~00:12 CET, exact head_sha ae12da4)
- **gate run 42127280016: IN PROGRESS. No SUCCESS cited.**
- pacing-x1 shards (42127280092): 1 in progress, 2 queued. K10 (42127280065): queued.
- The prior gate SUCCESS (run 42123690754) applies to c8cc5e3 only.

## Current gates
- **Merge at flags 0** needs:
  - hosted gate SUCCESS at exactly ae12da4
  - pacing shards with the expected pattern (aggregate red only on row 904)
  - QA's exact-head verdict (QA-D-1105-RCMOVE delta re-gate). #100 overlaps #105's game.ts, so QA needs a local tsc + full vitest.
  - rc/v5 still f8036e8f at merge
- **Flip of bestBuyV2: HELD, unchanged.** It needs:
  - D-HOE-38 SIM-only flag list
  - N1 breeds-on BR-BB4 Hatch target, or a ruling
  - N2 real 18-state dump, or a HoP/QA AC5 decision
  - N3 copy + m1 UI QA at 360 on 3 engines
  - Econ/HoQA flag-on goldens
  - HELD-flip diff/seam pin
  - Prior Minors: m1/m3/m4 open, m2 closed. n1/n2 nits as before.
- No code/PR mutation/push/Ready/merge/messages done. Write scope: engineering/reviews/ + status only.
