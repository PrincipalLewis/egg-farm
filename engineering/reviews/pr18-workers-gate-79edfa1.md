# PR #18 econ/f1-workers-gate-v3 @ 79edfa1 (base #17 3ea9f04)
One commit, one file: tests/pacing.test.ts (+25/−7). Read-only. Claude: 0 calls. /tmp copy.

## Verdict: APPROVE (test-only). Note: nothing changes in src/sim/workers.ts. WORKERS_GATE is a test constant.

## What flips
- `const WORKERS_GATE = true` (tests/pacing.test.ts): the with-workers AC7 check (Farm level at 30:00 in L20–24, P95-low and P95-high over 30 seeds, runM2 seller15) goes from console.warn to hard expects.
- It also brings in the AC7 standard:
  - 20 → 30 seeds, with a nearest-rank P95 helper.
  - L10 8–12 min is judged at P95 high and P5 low.
  - The no-workers L18–22 check is judged at P95-low/high, with bounds from data/pacing-targets.json.
- **Live game impact:** none. It's not an M4 flag or a runtime switch; no src, save or sim change. Existing saves, workers hired below any gate, offline catch-up and the sim tick are untouched.
- **Rulings:**
  - P95 / ≥30 seeds: HoP 23:15, decisions.md:242, product/ac7-qa-threshold-changes.md:2,6-10.
  - With-workers L20–24 after F1: qa/m3-test-plan.md:107; engineering/decisions.md:17 (flip as a separate PR after QA's rerun).
  - Inclusive band edges: HoP 00:58, decisions.md:285-289.
- **Runs:** tsc clean; sync and check-economy-copy OK; vitest 477 pass + 1 skipped (pacing 7/7). Golden import pending #14. check-globals PASS. Determinism: the bots are seeded; results are identical across runs.

## Findings
- **MINOR: the hard gate runs on the deterministic seller15 bot,** where all 30 seeds land on L21 (PR body), so "P95" has no spread.
  - HoP 00:58 (decisions.md:285-289) says AC7 is judged at P5/P95 with the variance bot (17877b41); the fixed bot is a regression fixture only, and AC7 counts as VERIFIED only once the TS variance port lands. The variance bot sits at L20, zero margin (decisions.md:283).
  - Rename the test or comment it as the regression fixture so it isn't read as AC7 verification, and add a TODO for the variance-bot gate.
- **NIT:** the L10 check adds a P5 ≥ 8 min lower bound that ac7-qa-threshold-changes.md:7 doesn't specify (it asks only "P95 seed ≤ 12"). That's harmless today, but cite it or drop it.
