# PR #7 arch/ac7-gate @ 3b464ea (base a01faea, on main)
Read-only, 0 Claude calls. Two commits: b1004e7 and 3b464ea. **Only tests/pacing.test.ts changes (+34/-6).**

## Verdict: PASS on content, but superseded by #18. Don't merge it on its own after #17/#18. Not a blocker.

## Bands vs rulings
- **No workers:** level at 30:00 must have P5 ≥ 18 and P95 ≤ 22, inclusive (`>=`/`<=`). This matches decisions.md:111 (L18-22) and the HoP 23:15 P95 standard (:242): 30 seeds and nearest-rank P5/P95. The `MIN_SEEDS_P95` assert and the quant unit test (1..30 → P95 29, P5 2) pin this.
- **With workers:** L20-24, inclusive, matching :283/:287 (the zero-margin L20 passes). It is SOFT (`WORKERS_GATE=false`) here, which is correct for pre-F1 main: every seed lands on L18.
- **L10:** P95 ≤ 12 and P5 ≥ 8, consistent with the 01:15 ruling. #18 later moved these bounds to pacing-targets.json.
- **Gap (not this PR's fault):** HoP 23:15's worst-seed guards (≤2.25x, ≤4 min) aren't asserted. #18 doesn't assert them either.

## Determinism, vacuity
- **Deterministic:** the bots are seeded (seeds 1..30, no clock), and repeat runs gave identical results.
- **Non-vacuous:**
  - A missing L10 maps to Infinity and fails.
  - The seed-count assert stops a shrunken seed list.
  - The quant unit test catches an off-by-one.
- **Vacuous on purpose:** the with-workers test always passes while soft. It only warns (on main it warned "P95 levels 18-18").
- **The bot carries no variance:** the deterministic bot gives P5 == P95, so "P95" is really a single value. Per HoP 00:58 (:284-288), that makes it a regression fixture, not the AC7 verifier.

## Runs (/tmp)
- **#7 on main:** pacing 9/9 pass, with the with-workers SOFT warning.
  - Full vitest: 468 pass, 2 skipped, 1 fail. The failure is telemetry-m3 BUILD_ID, an artifact of the /tmp copy having no .git. Main itself shows the same.
- **Scratch #17 b0e8278 + #7:** `git merge-tree` **CONFLICTS** in tests/pacing.test.ts. With #7's file taken whole, pacing passes 9/9, and with WORKERS_GATE=true it still passes 9/9 (F1: all seeds L21).

## Overlap / conflict
- **#18:** 79edfa1 already "brings in arch/ac7-gate b1004e7" as content (not as git ancestry).
  - It flips WORKERS_GATE=true, then (c9b8f5b) labels the gate a regression fixture, adds the TODO(F-1) variance gate and moves the L10 bounds to data. So #7 is a duplicated subset of #18.
  - #18 lacks only 3b464ea's harness tests (the MIN_SEEDS_P95 assert and the quant unit test) and the `export` of quant.
  - Merging #7 conflicts with both b0e8278 and 6f19823.
- **#19 (c5905f3):** doesn't touch pacing.test.ts. It adds seller-variance.slow.test.ts, which asserts TS/Python bot parity and the variance targets (≥50 distinct, 3-15% spread). It does **not** assert the L18-22 / L20-24 bands with the variance bot, so the AC7 gate HoP 00:58 calls for is still unimplemented anywhere (the TODO in #18).
  - No merge conflict with #7.

## Recommendation
- Close #7 as superseded by #18, carrying 3b464ea's two harness tests into #18; that's a minor ask to the #18 author. Or merge #7 first and rebase #17/#18, resolving pacing.test.ts by hand.
- Track the variance-bot band gate (#19 follow-up) as the real AC7 verifier, including the 23:15 worst-seed guards.
