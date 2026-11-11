# Code review: fix-sellall-label-grader @ f7642c9 (recheck of 948180e)

Range: f035594..f7642c9 (2 commits; this recheck covers 948180e..f7642c9), worktree /workspace/review-f7642c9, base main f035594.
Topic: recheck of review 948180e (`engineering/reviews/fix-sellall-label-grader-948180e.md`): m1 wiring test, n2 pinned payout, n4 fit at 390/1280.
Files changed since 948180e: `tests/sellall-label-grader.test.ts`, `scripts/rc0-browser.mjs`. `src/` is untouched.

## Verdict
All three findings from 948180e are addressed. I found no critical, blocker, major or minor defects. Two nits remain, both optional. Two checks did not run: `tsc --noEmit` was denied by the shell, and the rc0 browser section was not run (no browsers, as instructed).

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 0 |
| nit | 2 |

## Recheck of the 948180e findings

### m1: UI wiring not covered by a vitest test. Resolved.
- `tests/sellall-label-grader.test.ts:39-43` reads `src/ui/app.ts` and asserts two things.
  - The text `const { eggs, cents } = sellAllPreview(s, b);` is followed on the next line by `setText(sellAllBtn, sellAllLabel(eggs, cents, fmtCount, fmtMoney))`.
  - `sellAllLabel(` appears exactly once in `app.ts`.
- The target lines are `src/ui/app.ts:507-508`, and they match.
- Several other tests in the repo read source with `readFileSync` (`ac14`, `art-ux-rc0`, `contrast`, `economy-copy` and others), so this follows an existing pattern.
- Mutation check by reading:
  - Reverting to the inline `k * price` loop fails the regex.
  - Passing different arguments, or computing the label from another value, fails the regex.
  - Adding a second `sellAllLabel(` call fails the count.
- Remaining weakness is in nit 1 below.

### n2: absolute payout not pinned. Resolved.
- `tests/sellall-label-grader.test.ts:33-38`. Basket 21.7 floors to 21, so the orders take 5 (7 minus 2 already filled), 13 and 3. At farm 3, collection 1 the price is 129c (asserted in the previous test), and tier 1 gives ×1.5.
- Hand check:
  - 5 × 193.5 = 967.5, which rounds to 968.
  - 13 × 193.5 = 2515.5, which rounds to 2516.
  - 3 × 193.5 = 580.5, which rounds to 581.
  - The total is 4065.
  - Rounding the total instead gives round(21 × 193.5) = round(4063.5) = 4064.
  - The `.5` values are exact in binary floating point, so there is no ambiguity.
- The test asserts that the per-order sum is not equal to the rounded total, so the pin is meaningful.
- The expected value is computed independently of `saleValueCents`, using `Math.round(k * 129 * 1.5)`.
- It checks `sellAllPreview` equals `{ eggs: 21, cents: want }` and also checks the `apply('sellAll')` delta against `want`.
- A broken helper fails this test. Replacing `round` with `floor` gives 967, and rounding the total gives 4064. A wrong multiplier also fails.
- The redundant label assertion from the old `Grader tier` test was removed. It was a tautology once `p.cents === delta` held, so this is correct.

### n4: fit at 390 and 1280. Resolved.
- `scripts/rc0-browser.mjs:532-544`, new section `sellallgraderfit`.
- Viewports are 390×844 and 1280×800. Below 960 px wide it opens the Market panel via `[data-nav=market]`. At 1280 it uses the docked layout (the `min-width:960px` and landscape media queries in `styles.css`), so no click is needed.
- State is the QA-scale one: farm 23, collection 17, basket 181.2e9, Grader tier 2. `open()` already takes `w` and `h`.
- Expected label: the price is about 654c (215c farm component × 3.04 collection bonus, rounded). With ×2 and 181.2e9 eggs that is about $2.37T. The label therefore contains `$…T`, and the `/\$[\d.]+T/` assertion should hold.
- Fit assertions:
  - `scrollWidth <= clientWidth + 1`, which catches ellipsis truncation because `#sellAll` has `overflow:hidden; text-overflow:ellipsis` (`styles.css:362`).
  - `left >= 0` and `right <= innerWidth + 0.5`.
- The section name is not gated: with `ONLY` empty, `want()` returns true, so it runs in the default rc0 pass.
- Layout reasoning from the CSS (I did not execute it):
  - 360: covered by the existing `sellallgrader` section.
  - 390: the button is `min-width:min(100%,280px)` with `nowrap`, and the label is about 30 characters. This is the same class as 360 but wider, so it is lower risk.
  - 1280: docked, and the button is clamped to its track by the existing B6 rule. Truncation would be caught by the `sw`/`cw` check.

## Findings

1. **nit: wiring test is a source tripwire, coupled to formatting.** `tests/sellall-label-grader.test.ts:41-42`.
   - Evidence:
     - The regex requires the destructure line and the `setText` line to be adjacent, with only whitespace between them.
     - The `sellAllLabel(` count only proves there is one call. It does not prove nothing else writes `#sellAll` text afterwards. Today nothing does: grep for `sellAllBtn` shows `setText` only at `app.ts:508`.
   - Impact:
     - A harmless reformat, such as joining the two lines or adding a statement between them, fails the test with an unhelpful message.
     - A later extra `setText(sellAllBtn, …)` elsewhere would not be caught.
     - Neither affects today's correctness.
   - Fix (optional):
     - Loosen the regex to `/sellAllPreview\(s, b\)[\s\S]{0,200}setText\(sellAllBtn, sellAllLabel\(/`.
     - Add `expect(src.match(/setText\(sellAllBtn/g)?.length).toBe(1)`.
     - The rc0 sections remain the behavioural gate.

2. **nit: `sellallgraderfit` does not check label = payout, and the `T` check does not prove the Grader multiplier.** `scripts/rc0-browser.mjs:541`.
   - Evidence: the assertion is `/\$[\d.]+T/` plus fit. A label with the old bug (no Grader mult, about $1.18T) also matches `\$…T`.
   - Impact: none for correctness. Label = payout is verified at 360 by `sellallgrader`, and by the unit tests for the price math. The new section only guards layout, which is what n4 asked for. A label-vs-gain regression at 390 or 1280 would not be caught by this section.
   - Fix (optional): rename the check to something like "label fits (T tier)", or reuse the `money()` and delta comparison from `sellallgrader`. The latter needs a click, so it only makes sense if you want it.

## Regressions and scope
- `src/` is untouched since 948180e, so there is no runtime regression risk from this commit.
- The changes are tests and the rc0 script only.
- The commit message refers to m1, n2 and n4. n3 (the order-card `unit` copy) is not touched, which is fine because it was optional and out of scope.
- The new test file import (`node:fs` `readFileSync`) works under vitest's default node environment. The run passed.

## What I ran
- `git diff f035594..f7642c9`, `git diff 948180e..f7642c9`, and a read of `src/sim/actions.ts`, `src/ui/app.ts` (lines 500-515), `src/ui/orders.ts` (`sellAllLabel`), `src/ui/format.ts` (`fmtMoney`, `fmtCount`), `src/config/formulas.ts` (`eggPriceCents`), `src/config/balance.json` (Grader tier mults 1.5 and 2), `src/ui/styles.css:362`, and `scripts/rc0-browser.mjs` (`open()`, the `sellallgrader` and `sellallgraderfit` sections).
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/sellall-label-grader.test.ts`: 1 file, 9/9 tests passed. I did not run the full suite this time, and the diff only touches this file plus the rc0 script.
- `npx tsc --noEmit`: **not run**. The shell denied it twice, so I did not work around that. There is no type-check result from me. The only new code in `tests/` is a `readFileSync` import and two `it` blocks, and vitest compiled and ran them.
- rc0 browser sections (`sellallgrader`, `sellallgraderfit`): **not run**, as instructed. The layout verdicts for 360, 390 and 1280 come from reading the CSS and the section logic, plus the expected-label calculation above. They have not been executed.
