# Code review: fix-rc2-toast-hire-banner (a01faea..977be6a)

Topic: recheck of PR #5 after the ac4ec56 review minors. This adds a pure `toastTop()` helper with behavioural tests, and makes rc0 B2 assert the banner at show time and add a 360 width.
Worktree: /workspace/review-977be6a. I did not modify it.
Previous review: `engineering/reviews/fix-rc2-toast-hire-banner-ac4ec56.md`.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 1 |
| nit | 1 |

Verdict: both minors from the ac4ec56 review are resolved, and I found no correctness problem. The helper is behaviour-identical to the inline logic it replaces. The remaining findings are a docked-width coverage gap in rc0 B2 and untested wiring. I could not execute vitest or tsc (see "What I ran"), so test results are verified by hand-evaluation only.

## What changed (since a01faea)

The range also contains the ac4ec56 fix, which I reviewed before. The new part is 977be6a:

- `src/ui/toast-place.ts` (new): `toastTop(queueBottom, bannerBottom, docked)` returns `Math.round(edge + 8)` with `edge = max(docked ? 0 : queueBottom, bannerBottom)`, or `null` when `edge <= 0`.
- `src/ui/app.ts:147`: `place()` measures `qb` and `ia` (visible `.intro-a` bottom, else 0), calls `toastTop`, and sets `style.top` and the `.below` class from the result. `below` is `top !== null`.
- `tests/rc2-toast-banner.test.ts`: the source-text grep is replaced by 6 behavioural cases.
- `scripts/rc0-browser.mjs` B2: widths are now `[360, 390, 1280]`. `ia` is recorded in the same `evaluate` that reads the toast at show time. The test asserts `ia > 0` and `shown.top >= ia + 7`, and the expected top is `max(qb if <960, ia) + 8`.

## Resolution of the previous review

- **Previous #1 (source-grep test): resolved.** The pure helper is tested directly.
  - I evaluated all six cases by hand and each passes: `(140,0,true)` is `null`; `(140,120,true)` is 128; `(90,0,false)` is 98; `(90,140,false)` is 148; `(150,120,false)` is 158; `(0,0,false)` is `null`; `(90.4,0,false)` is 98.
  - A broken implementation would fail. Ignoring the banner fails cases 2 and 4. Using `qb` while docked fails cases 1 and 2. Dropping the `max` fails 4 or 5. Dropping the docked guard fails case 1. Dropping the rounding fails the last case. Returning 0 instead of `null` fails cases 1 and 6.
  - The `edge > 0` boundary is covered at 0, but not at a tiny positive value. That is irrelevant in practice.
- **Previous #2 (rc0 B2 derived from observed state): resolved.** The banner is recorded at toast show time and asserted with `ia > 0`. The toast is asserted at least `ia + 7` below it at all three widths, and 360 is added.
- **Previous nits 3 and 4 are unchanged.** There is no re-placement after the first rAF, and a one-frame animation-mode change can happen if the banner appears in the same tick. Neither is worse after this change, and neither was required.

## Correctness analysis (no findings)

- **No behaviour change from the extraction.**
  - Old: `edge = max(docked ? 0 : qb, ia)`, `below = edge > 0`, `top = round(edge + 8)`.
  - New: the same expression, with `below = top !== null`. `Math.round(edge + 8)` is never `null` for `edge > 0`, so the two are equivalent.
  - `NaN` cannot occur: `getBoundingClientRect().bottom` is a number and `?? 0` handles a missing banner.
- **Module cycle or TDZ risk: none.** `toast-place.ts` has no imports. The import in `app.ts` is hoisted, and the helper is a `const` arrow function defined at module load.
- **No banner animation.** `.intro-a` (`styles.css:255-257`) has no transform or animation, so the bottom read at frame time is final. `shown.ia` at 300 ms is therefore comparable to the value `place()` used.
- **`.toast.below` fades in place** (`styles.css:404`), so the `top` measured at 300 ms is not affected by the slide transition.
- **Layout.**
  - At 1280 (docked): the banner is centred (max 480). The toast is centred at `left:50%` and 8px below the banner's bottom edge, so there is no overlap.
  - At 390 and 360: the banner spans `left/right:12px`. The toast uses the measured `bottom`, so a wrapped banner (taller at 360) is handled. The toast's `max-width` is unchanged from before.
  - No new horizontal-overlap risk.
- **Scope.** Only the toast placement, its helper, the unit test and rc0 B2 changed. There is no unrelated churn.

## Findings

### 1. [minor] rc0 B2 now cannot exercise the docked "slide off the top" branch, and the label is wrong at 1280
`scripts/rc0-browser.mjs:92-96`

Evidence: the assertion requires `ia > 0`, and then `below = w < 960 || ia > 0`. With `ia > 0` required, `below` is always true at every width, including 1280. Consequences:
- The test title always prints "below strip, faded", even at 1280. At 1280 there is no strip, and the toast sits below the banner.
- The `: (shown.top >= 0 && after.bottom <= 0)` arm (docked, slide off the top) is unreachable. The dead code reads as if the case were still covered.
- The legacy docked-with-no-banner behaviour (toast slides off the top, `.below` absent) is no longer asserted in any browser check in B2. Unit coverage only proves `toastTop` returns `null`. It does not prove that `''` for `top` and the missing `.below` class give the slide behaviour. `scripts/artux-shots.mjs` F1 only checks `toastTop >= stripBottom`.

Impact: a regression in the no-banner docked path (for example the toast is left with a stale `top` or `.below` class after a banner disappears) would not be caught by rc0. The test also misleads a reader about what it covers.

Fix:
- Drop the dead arm and make the label honest, for example `below ${w < 960 ? 'strip/banner' : 'banner'}`.
- Optionally add one docked no-banner case. For example, use a farm upgrade that does not unlock a helper, or hide the banner first by opening a panel (`renderWorkersIntro` hides it then). Assert `shown.top >= 0`, `after.bottom <= 0`, and no `.below` class.

### 2. [nit] The `app.ts` wiring of `toastTop` is not covered by any unit test
`src/ui/app.ts:147`, `src/ui/toast-place.ts:2`

Evidence: `toastTop(queueBottom, bannerBottom, docked)` takes two adjacent `number` parameters, so swapping the arguments type-checks. The call is `toastTop(qb, ia, docked.matches)`, which is correct, but only rc0 (browser, not part of the unit run) would catch a swap or a dropped `docked.matches`. The old source grep did at least pin the call shape. The `place()` closure itself is not reachable from unit tests.

Impact: low. The helper has the behaviour tests the previous review asked for, and rc0 B2 covers the wiring at three widths.

Fix: none required. If you want a cheap guard, use an object argument `{ queue, banner, docked }` so a swap cannot compile.

## What I ran

- `git diff a01faea..977be6a`, `git diff --stat`, and a read of the previous review.
- Read `src/ui/toast-place.ts`, the `showToast` change at `src/ui/app.ts:147`, `tests/rc2-toast-banner.test.ts`, and the rc0 B2 changes. Read the `.toast`, `.toast.below` and `.intro-a` rules in `src/ui/styles.css`. Grepped for other users of `.intro-a` and `toastTop`.
- **I could not run the unit test or `tsc`.**
  - `npx vitest run --pool=forks ... tests/rc2-toast-banner.test.ts` did not run the project's vitest. The worktree has no `node_modules` (and neither does `/workspace/egg-farm-studio`), so `npx` pulled a different vitest from its global cache. That version rejected the `--poolOptions.*` flags (`CACError: Unknown option --poolOptions`). No test executed.
  - `npx tsc --noEmit` was denied by the sandbox permission mode.
  - I evaluated the six unit cases by hand against the source (see above). The code is simple and uses only `number`, `boolean` and `null`, so I expect type-checking to pass. That is unverified.
- I did not run browsers, so the rc0 B2 changes (including the new 360 case) are also unexecuted. I checked them by reading only.
