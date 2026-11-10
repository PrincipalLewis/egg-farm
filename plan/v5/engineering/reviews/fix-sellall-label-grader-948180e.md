# Code review: fix-sellall-label-grader @ 948180e

Range: f035594..948180e (1 commit, worktree /workspace/review-948180e, base main f035594).
Topic: Sell all label uses the same Grader multiplier and per-order rounding as the sellAll action (QA bug `qa/m3-recheck/bug-sellall-label-grader.md`).
Files: `src/sim/actions.ts`, `src/ui/app.ts`, `tests/sellall-label-grader.test.ts` (new), `scripts/rc0-browser.mjs`.

## Verdict
The fix is correct and minimal. No critical, blocker or major findings. One minor test-coverage gap and three nits. I did not run `tsc` or the rc0 browser section (see "What I ran").

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 1 |
| nit | 3 |

## Correctness (checked, no defect)
- `saleValueCents(k, base, gm)` is the old inline expression from `sellTo` moved verbatim. `sellTo` now calls it, so there is no behaviour change on the action path (`actions.ts:10`, `:23-24`).
- `sellAllPreview` mirrors `apply('sellAll')` (`actions.ts:40`).
  - `left` starts as `Math.floor(basket)`. `sellTo` floors the basket on every call, and `basket - k` keeps the fractional part, so the floor is consistent.
  - Both loops stop at `< 1` left.
  - `k = min(left, demand - filled)`, and orders with `k <= 0` are skipped as `sellTo` does.
  - Rounding is applied per order, as in `sellTo`.
  - `base` and `gm` are constant across the loop in both versions because `sellTo` does not change farm level, collection level or workers.
- The old `app.ts` label code multiplied by `price` only. The Grader multiplier was missing, which is the QA bug. It also used the floored basket and did not guard `k <= 0`. The new call fixes both.
- `s.farmLevel` replaces the local `F`. They are the same value (`app.ts:456`).
- `sellAllPreview` is pure and runs once per frame, only when the Market panel is open or docked. It is O(customers), the same as before. No cost regression.
- `app.ts` still imports `graderMult` because `unit` is still used for the order cards (`app.ts:501`).
- No circular import: `ui/app.ts` importing from `sim/actions` is the normal direction.

## Findings

1. **minor – UI wiring is not covered by any vitest test.** `src/ui/app.ts:507`, `tests/sellall-label-grader.test.ts`.
   - Evidence: the unit test calls `sellAllPreview` and `sellAllLabel` directly. Nothing imports `app.ts`'s render path. The only check that the label in the DOM comes from `sellAllPreview` is the rc0 browser section.
   - Impact: reverting `app.ts:507` to the old inline `k * price` loop, or any later edit that drifts the label from the preview, leaves all 497 unit tests green. Only the manual rc0 run would catch it, and I saw no wiring that runs rc0 automatically.
   - Fix: add a jsdom `mountApp` render test (if the repo has a pattern for that) that reads `#sellAll` text at Grader 0/1/2. Otherwise record in the PR that rc0 `sellallgrader` is the regression gate and make sure it is in the release checklist.

2. **nit – the unit test checks agreement but not the absolute payout.** `tests/sellall-label-grader.test.ts:16-20`, `:26-33`.
   - Evidence: `sellAllPreview` and `sellTo` both call `saleValueCents`, so `p.cents === delta` holds whatever that helper returns. The third assertion on line 19 (label equals label built from the delta) is redundant once the previous line passes. The only independent anchors are `graderMult > 1` and `p.cents !== eggs * price`.
   - Impact: a broken `saleValueCents`, such as `floor` instead of `round` or a wrong multiplier, passes these tests. The "per-order rounding" test (`:30-33`) only proves integer output and agreement. It does not prove that rounding is per order rather than per total.
   - Fix: pin one literal. For example, farm 3 / collection 1 (129c), tier 1, 21.7 eggs: assert `sellAllPreview(...).cents` equals the sum of `Math.round(k * 129 * 1.5)` per order computed in the test. Drop the redundant label assertion.

3. **nit – `unit` for the order cards is a second, unrounded copy of the multiplier math.** `src/ui/app.ts:501`, `src/ui/orders.ts:13`.
   - Evidence: the cards still compute `want * (price * graderMult)` with no rounding. `sellTo` and the label now use the shared per-order `round`. Sub-cent differences are possible, for example 129c × 1.5 on an odd number of eggs. The cards show demand value and the label shows what is sellable, so they are not directly comparable. This is pre-existing and out of scope.
   - Impact: none visible today.
   - Fix (optional follow-up): have `orderView` take a value function built on `saleValueCents`, so there is one source of truth.

4. **nit – rc0 `sellallgrader` covers 360 only, with a loose tolerance.** `scripts/rc0-browser.mjs` (new section).
   - Evidence: the viewport is fixed at 360×640. The QA acceptance asks for 360, so this matches it. The brief for this review also lists 390 and 1280. At 1280 the market panel is docked, and `#sellAll` has `min-width:min(100%,280px)` with `overflow:hidden; text-overflow:ellipsis` (`styles.css:362`), so overflow is impossible there. The fit check is `scrollWidth <= clientWidth + 1`, which would catch ellipsis truncation, but it only runs at 360.
   - The label-vs-gain tolerance is `max(0.005, 0.5% of gain)`. `fmtMoney` rounds to 3 significant digits (`format.ts:17-21`), so worst-case rounding error is close to 0.5%, plus about 600 ms of sim drift between reading the label and clicking. That is tight but acceptable. It cannot hide the original ×1.5 and ×2 bugs.
   - The section is well behaved otherwise. It resets customers and basket per iteration. The Grader is passive, so the `coinsCents: 0` start cannot make it Unpaid (`tick.ts` applies Unpaid to Market Hand and Coop Hand only). It also asserts no page errors.
   - Fix (optional): loop viewports `[360, 390, 1280]` for the fit check only. Keep the tolerance, or compare against the label's own formatted `fmtMoney(delta)` text for an exact match.

## What I ran
- `git diff f035594..948180e` and read the surrounding code: `actions.ts`, `workers.ts` (`graderMult`, `mood`), `app.ts` (market render block and import list), `orders.ts` (`sellAllLabel`, `orderView`), `format.ts` (`fmtMoney`), `styles.css:362`, and the QA bug file.
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/sellall-label-grader.test.ts`: 7/7 passed.
- Same command, full suite: 52 files, 497 tests passed.
- `npx tsc --noEmit`: **not run**. The shell denied it twice in this session, so I did not work around that. There is no type-check result from me. Types look sound by reading: `sellAllPreview(s: GameState, b: Balance)` is called with `s` and `b` as in scope, and the destructured `{ eggs, cents }` match the `sellAllLabel` parameters.
- The rc0 browser section was **not run**, as instructed (no browsers). The 360 layout verdict comes from reading the CSS and the section's logic, not from executing it.
