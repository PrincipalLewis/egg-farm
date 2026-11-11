# Code review: rc1/ux-clarity-v3 (Cut A v3), a01faea..23a3798

Reviewer: Code Reviewer. Worktree `/workspace/review-23a3798` (read-only). Base: main a01faea. Topic: Cut A v3.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 4 |
| nit | 4 |

**Verdict: no blockers, no majors. Every finding from my 5d8a058 review has been addressed; one of those fixes is only partly effective (#1 below). Merge is fine once CI is green and the banner width (#2) is measured in a browser.**

**Not verified:** I could not run `tsc` or `vitest` (see "What I ran"), and I ran no browsers. Type-correctness and test pass/fail are unconfirmed by me. Layout at 360/390/1280 is judged from CSS and from what the rc0 sections assert. CI must show tsc, vitest and rc0 green.

**Scope.** I reviewed the new commits `5d8a058..23a3798` in full (16 files, about 175 lines, all branch-owned Cut A work). I re-read the rest of `a01faea..5d8a058` only where these commits touch it. That earlier range was reviewed in `rc1-ux-clarity-v3-5d8a058.md`. The merged-in main work (seller-variance, vendored sim, m4-design docs, save-recovery) was not re-reviewed.

## Status of the 5d8a058 findings

| # | Was | Status at 23a3798 |
|---|---|---|
| 1 | major, "production stopped" while production runs | Fixed per PM ruling (a): `rateView` no longer clamps, banners name role and effect. Residue in #3 below. |
| 2, 9 | `~1h 60m` | Fixed: `hoursMins` rounds total minutes once. Tests cover 3570 to 3599 s past each hour. |
| 3 | `refill W4` in aria | Fixed: `refillGoalName`. |
| 4 | Refill goal flips to "All upgrades done!" | Fixed in `GoalHysteresis.tick`. Test fails on old code. |
| 5 | Refill name lacks visible text | Only partly fixed, see #1 below. |
| 6 | Single Refill spent on Unpaid worker | Fixed: paid workers are preferred. Test added. |
| 7 | Source-grep tests | Fixed: `navRefillState` is tested. The goal-pill regex was dropped. |
| 8 | Hard-coded 15% / 40% | Fixed, read from balance, with a test using altered balance. |
| 10 | Dead CSS | Fixed. I checked that nothing in the markup uses `.manage-all small/.count`, and that `.hint .link` box props are fully carried by the rule at `styles.css:571`. |
| 11 | `count3` rounds up | Fixed with `down`. |
| 12 | Vacuous sell-pass row check | Partly fixed, see nit #8. |
| 13, 15 | Vacuous "no Need" test, dead branch | Fixed: branch removed, `rem <= 0` case and `fitOrderEggs` tests added. |
| 14 | Unguarded `document.fonts.ready` | Fixed (`fonts?.ready?.then`). |
| 16 | Duplicate goal name in aria | Fixed for normal goals; see nit #6 for `done`. |

---

## Findings

### 1. [minor] Nav/docked Refill accessible name matches the visible label only for the moment it is generated, not for the 5 s throttle window
`src/ui/workers-ui.ts` `navManageView` (the `cd > 0` branch, about lines 118-124), applied in `src/ui/app.ts:~584`. Pinned by `tests/rc1-ui.test.ts:~61-65`.

**Evidence.**
- The visible label counts down every second (`0:28`, `0:27`, … or `Ready in 28s`).
- The aria text is frozen for 5 s: `fresh ? prev : {...}`. It embeds the visible number at generation time, so it reads `Refill 0:28, available in 28 seconds`.
- At t+3 s the visible label is `0:25` and the name still contains `0:28`. `0:25` is not a substring of the name. The docked case is the same: `Ready in 25s` against `Refill, ready in 28s`.
- The test `navManageView(1, 25.1, false, a.aria, 3000).aria` is `a.aria` pins the stale name, and the `toContain(a.label)` assertion is only made at generation time.

**Impact.**
- WCAG 2.5.3 Label in Name, and axe `label-content-name-mismatch`, fail for about 4 of every 5 seconds of the cooldown. A voice-control user saying the visible "ready in 25" can't target the button.
- The fix for 5d8a058 #5 reads as complete in the unit test but is not in the running app.
- Part of this is my fix suggestion. "Keep the 5 s throttle" does not combine with embedding the countdown in the name.

**Fix.** Either drop the number from the name while keeping the visible words (`Refill, ready soon`, unchanged for the whole cooldown; the number is a live visual only), or stop the throttle for this button. If the name stays number-free, a number-free visible label is needed too. A simpler route is to make the countdown `aria-hidden` and name the button `Refill` only, with the cooldown conveyed by `aria-disabled` plus `aria-describedby`. Extend the test to assert label-in-name at 1 s, 3 s and 4.9 s after generation.

### 2. [minor] New worker banner copy is longer than anything the 32px banner has been measured with, and nothing measures it at 360
`src/ui/workers-ui.ts` `workerBannerText`; CSS `src/ui/styles.css:553` (`.wk-banner{height:32px; display:flex; font:800 14px …}`, no `white-space:nowrap`, no `overflow`, no ellipsis).

**Evidence.**
- Old strings were at most 28 characters (`💤 Asleep, bonus down to 15%`).
- New strings are `💤 Coop Hand asleep: collecting slowed` (38 characters), `⚠ Market Hand unpaid: sales slowed` (34) and `💤 Hawker asleep: sales slowed` (30). The banner content box is the card width minus 2×10px padding.
- At 360 I estimate the 38-character string at about 300-310px at 14px/800, against roughly 300-310px available. That is borderline.
- If it wraps, two 17px lines exceed the fixed 32px height. The second line overflows the red band, and the text is white on the cream card.
- `tests/review-5d8a058.test.ts` checks the strings. No rc0 section and no `rc1-ui` CSS test measures `.wk-banner` text against its box. `grep wk-banner scripts/rc0-browser.mjs` is empty.
- I could not measure this; it is an estimate.

**Impact.** At 360, or with large system text at any width, the Coop Hand asleep banner may spill outside its box and be unreadable. Wording-only changes slip past layout checks.

**Fix.**
- Add an rc0 check at 360 and 390: put the Coop Hand asleep, the Market Hand unpaid and the Hawker asleep states on screen, and assert `scrollWidth <= clientWidth` and `scrollHeight <= clientHeight` on `.wk-banner`.
- Or make the banner robust: `min-height:32px; height:auto; padding-block:6px`, or shorter copy (`💤 Asleep: collecting slowed`, since the card already names the worker).

### 3. [minor] "production stopped" still fires when the net rate is negative, and the header and banner use different zero thresholds
`src/ui/app.ts:549` (`stopped: cps <= 0 && productionStopped(s, b)`), `src/ui/workers-ui.ts` `workerBannerText` (`incomePerSec(s, b) <= 0`), `src/ui/s2-economy-ui.ts` `rateView` (`c < 0` branch appends `, production stopped`).

**Evidence.**
- The ruling in the commit message says "stopped only at a true zero". The code says `<= 0`.
- A negative net rate means wages exceed sales. Production and selling continue. The `c < 0` aria still says `Net income minus $0.03 per second, production stopped` whenever any worker is asleep or unpaid. The asleep worker does not have to be the reason.
- Example: Coop Hand working with a high wage, income below wage, Hawker asleep. The Hawker banner reads "Asleep, production stopped".
- The test is titled "stopped only at a true zero" and uses wage 1e6 (`income <= 0`). It never tests a plain negative rate.
- The banner compares the raw float (`<= 0`). The header rounds to cents (`c === 0`). A live income in (0, 0.5¢/s) shows header `⚠ ▼ $0.00/s` in red. In that state `cps <= 0` is false, so the banner says "sales slowed". The header looks stopped and the banner says it is not.

**Impact.** Narrow with the shipping balance, since net-negative needs wages above sales. Where it happens, the copy asserts something false. The two surfaces can also disagree by sub-cent amounts.

**Fix.** Define one predicate, for example `netStopped(cps) = Math.round(cps) === 0 && productionStopped`, or round once in a shared helper, and use it in both places. Decide in the ruling whether a negative rate may say "stopped" (I'd say no, since production is running). Add a negative-rate test for the aria and banner.

### 4. [minor] The header wiring in `app.ts:549` is not covered by any unit test; the new tests re-implement it
`tests/review-5d8a058.test.ts` ("asleep Hawker and asleep Grader …"), `src/ui/app.ts:549`.

**Evidence.**
- The test calls `rateView(cps, { stopped: cps <= 0 })`. It builds its own copy of the `stopped` argument. It never calls `productionStopped`, and nothing imports the expression from `app.ts`.
- Since `rateView` now ignores `stopped` for `c > 0`, the test's "asleep Hawker + Grader, rate > 0, not red" assertion passes even if `app.ts` reverts to `stopped: productionStopped(s, b)`.
- The only thing that would catch such a regression is the rc0 `S2-8` section, which I could not run.
- That is the same pattern I flagged in 5d8a058 #7 (assert on a re-implementation, not on the wired code). `navRefillState` was extracted for the nav; the header was not.

**Impact.** A future edit to `app.ts:549` could put the old behaviour back with all unit tests green. Only the browser run would fail.

**Fix.** Extract `headerRate(s, b)` (pure, returns the `rateView` result) next to `rateView`, call it from `app.ts`, and test it with the asleep Hawker/Grader states from the new test.

### 5. [nit] Header `rateView` makes every rounded-to-zero rate red, and the `'zero'` sign is now unreachable
`src/ui/s2-economy-ui.ts` `rateView` (`c === 0` returns `sign: 'neg'` unconditionally), type `RateSign` at line 34.

**Evidence.**
- `c` is `Math.round(Math.abs(cps))` in cents/s. A live income of 0.3 ¢/s (positive) rounds to 0 and now renders red `⚠ ▼ $0.00/s`, with the shake on the first tick. Before this commit that case was the non-red `'zero'` sign.
- `tests/rc1-ui.test.ts:199` pins `rateView(0.3).text` as `⚠ $0.00/s`, which preserves it.
- Nothing returns `'zero'` any more, so the member of `RateSign` and the `data-sign=zero` handling are dead.
- The text before this change already had the ⚠ at zero. Only the colour, ▼ and shake are new.

**Impact.** Cosmetic, for incomes under half a cent per second. Dead type member.

**Fix.** Return `'neg'` only when `cps <= 0` and keep `'zero'` for the sub-cent positive case (or remove `'zero'` from the type), and record which is intended.

### 6. [nit] Goal button aria: `done` says it twice with `!.`, and the worker name differs from the card
`src/ui/next-goal.ts` `goalAriaDetail` / `goalButtonAria` / `REFILL_NAME`.

**Evidence.**
- For `done` the visible text is `All upgrades done!` and the detail is `All upgrades done.`. The label becomes `All upgrades done!. All upgrades done.` (double punctuation, name twice). The new test covers only a normal goal.
- `REFILL_NAME.W4` is `the Grader`. The card (`WORKER_NAMES.grader`) says `Egg Grader`. The aria says a word the screen does not show.

**Fix.** For `done` return an empty detail when the visible text already says it. Use `WORKER_NAMES` as the single source for the spoken name.

### 7. [nit] Stale comments and docs left by ruling (a)
- `src/ui/s2-economy-ui.ts:~43`: the doc comment still says "AC-R2: never positive while production is stopped". The code now does the opposite.
- `src/sim/workers.ts:~12`: `isOff` says "Off = produces nothing". It is false for the Hawker and the Grader, as the new banner copy shows.
- `src/sim/workers.ts:~25-26`: two JSDoc blocks are stacked on `lowestManageTarget`. The old one ("Target of a below-threshold Refill tap …") is now orphaned above the new review note. Merge them.
- `src/econ/income.ts` header says "AC-R2" in a related comment. The `productionStopped` comment is updated, which is good.

### 8. [nit] rc0 `orderFit11` sell pass still does not check the 181B row, only the row count
`scripts/rc0-browser.mjs:~703`: `need18 = bk >= 1e12 ? r.length >= 5 : r.find(...)`.

**Evidence.**
- The fix for 5d8a058 #12 is better than before. It no longer matches `✓ Ready` and the title now says the 181B row is checked "in need/partial".
- `good` already requires `r.length >= 4`, so the new `>= 5` check adds one row of coverage. It would pass even if the 181B row were a different row.
- The `count3(…, true)` rounding path is unit-tested, so the risk is small.

**Fix.** Give rows a `data-row` lookup (`[data-row="1"]`) and assert on the row with id 1 in every pass.

---

## Layout notes (no browsers run)

- **Worker banners (360/390/1280):** see #2. All other CSS in the range only deletes dead rules or adds a comment. I confirmed the deleted rules match no markup, and the `.hint .link` box props still come from `styles.css:571`. Nothing else can move.
- **Order rows:** `count3(…, true)` shortens or keeps the width: `999K` against `1M` is not longer. `Sell 999K` is 9 characters, so the `long` class threshold (`> 9`) is unchanged. The fixed 88px (80px at ≤375) button and `bw` equality check still apply.
- **Nav Refill:** the cooldown text `Refill 0:28, available in 28 seconds` is aria only. The visible label is unchanged, so layout is unchanged.
- **1280 docked, `:has()`:** the Safari/iOS 15.4 floor is now noted in the CSS comment. Fine.

## Correctness checks that came out clean

- `hoursMins`: for `s` in [600, 3570) `tm < 60` gives the same `~N min` as before. For 3570-3599 it gives `~1 h`. For `fmtGoalEta` the `s < 3600` branch is `m:ss`, so the hour branch never sees `tm < 60`.
- `count3(n, true)`: `999600` gives `999K`; `1000` gives `1K`; the T cap (`v >= 1000`, `d = 1`) is fine; the `1e-9` epsilon covers `1.15 × 100`-style float error.
- `orderView`: `state === 'wait'` with `basket >= 1` needs `rem <= 0`. That case yields button `Sell`, `aria-disabled="true"` (from `v.state === 'wait'`), so it can't be used. Customers with `filled >= demand` are removed anyway, so this is only theoretical.
- `lowestManageTarget`: paid workers first, ties broken by card order as before. Unpaid-only still returns the lowest unpaid, so the label and action stay consistent. `refillCount` and the target agree.
- `GoalHysteresis.tick`: the added line only affects `shown.state === 'refill' || payback === 0`. It does not change any other transition.
- `fonts?.ready?.then`: both guards are correct.
- `navRefillState` is the exact call `app.ts` makes, so the `toEqual(mob)/(dock)` test pins the real values.

## What I ran

- `git log`, `git diff a01faea..23a3798 --stat`, and `git diff 5d8a058..23a3798` (src, tests, scripts). Source reads of `workers-ui.ts`, `workers.ts`, `s2-economy-ui.ts`, `income.ts`, `orders.ts`, `order-list.ts`, `format.ts`, `next-goal.ts`, `app.ts` (wiring), `styles.css` (banner, hint, link rules). `grep` for `wk-banner`, `manage-all`, `'zero'`, and the `.hint .link` rules.
- `npx tsc --noEmit`: **blocked.** The Bash call was denied by the permission mode. The worktree has no `node_modules` either, so there is no local `tsc`.
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/review-5d8a058.test.ts tests/orders.test.ts tests/workers-v11.test.ts tests/rc1-ui.test.ts tests/income-bestbuy.test.ts`: **no results.** With no local `node_modules`, `npx` picked an unrelated cached vitest from `~/.npm/_npx/…` and exited with `CACError: Unknown option --poolOptions` before running a test. Same failure as my previous review. Install dependencies in the worktree, or run from the main checkout, to get a real result.
- No browsers were run. The worktree was not modified.

COUNTS critical=0 blocker=0 major=0 minor=4 nit=4
