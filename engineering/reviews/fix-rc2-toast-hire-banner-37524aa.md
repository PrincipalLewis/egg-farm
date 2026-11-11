# Review: fix-rc2-toast-hire-banner @ 37524aa (base main a01faea)

Topic: RECHECK of `engineering/reviews/fix-rc2-toast-hire-banner-ed3fc9a.md` (m1 second-settle test, n2, n3). The only new commit since ed3fc9a is 37524aa, which touches `src/ui/toast-place.ts` (comment only) and `tests/toast-controller.test.ts`. I read that diff in full, read the post-change `toast-place.ts` and both test files, and re-read the ed3fc9a review for the earlier state of `app.ts` and `rc0-browser.mjs` (those two files are unchanged by 37524aa). The worktree was not modified and no browser was run.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 0 |
| nit | 3 |

All three items from the previous review are addressed: m1 is closed by the new test, n3 by the comment, and n2 only for the test names (see finding 2). The new test would fail against a controller whose `pending` flag never resets. No behavioural source change was made, so there is no regression risk in `src/`. **I could not run `tsc` or `vitest`.** Bash was denied in "don't ask mode" after my first read-only git command, and I did not work around it (see "What I ran"). The claims about tests passing come from reading the code, not from running it.

## Recheck of the previous findings

| Prior (ed3fc9a review) | Status | Notes |
|---|---|---|
| 1 (minor) no second hidden-to-shown settle test | **Fixed** | `tests/toast-controller.test.ts:34-37` adds the test. Details below. |
| 2 (nit) review-id tags mix two reviews | **Partly fixed** | Test names and the header comment are clean. `toast-place.ts:12-14` still carries `148591a n3`, `n4` and `m1` (finding 2). Some trailing whitespace was left behind (finding 1). |
| 3 (nit) "pure" is loose, module name | **Fixed** | `toast-place.ts:10-11` now says "a small stateful controller with injected DOM + clock (no globals)" and notes that the module holds placement and timing. The file was not renamed, which is fine. |

### The new test, by mutation reading
`tests/toast-controller.test.ts:34-37`: `show(); frame(); advance(TOAST_MS); op = 0; log.length = 0; show();` then it asserts one queued frame, that the frame produces the exact settle sequence `tr-off, place, reflow, tr-on, show`, and that the toast is shown.
- Delete `pending = false` in the rAF callback: the second `show()` hits `if (pending) return`, no frame is queued, and `frames.length` is 0, not 1. **Caught.** This is the mutation I raised last time.
- Make `pending` a one-shot flag or otherwise block the second settle: same, **caught**.
- Take the instant re-show branch although the toast is hidden (for example by dropping the `opacity() > 0` check or inverting it): the log would be `['show']`, and `frames.length` would be 1 but the `toEqual` fails. **Caught.**
- Reorder the settle steps: **caught** by the exact `toEqual`.
- The timing is right. `advance(TOAST_MS)` fires the timer armed at t=0 because the comparison is `at <= t`, so `shown` is false, and `op = 0` models the completed fade. The test is not vacuous.
- Gap, not worth a finding on its own: the test never checks that the dismiss timer is armed again after the second settle (`timers.size === 1`, or an `advance(TOAST_MS)` that ends in `hide`). See finding 3.

## Findings

### 1. Nit – trailing whitespace left where review tags were removed
`tests/toast-controller.test.ts:20, 27, 31, 38`.
- Evidence: removing `(m1)`, `(m2)`, `(n4)` and `(n3)` left a trailing space. Line 20 ends `// rAF paused: no timer yet ` and the `it(...)` names on lines 27, 31 and 38 end `snap `, `one show ` and `synchronously ` before the closing quote. The two-space-looking names also show up in the vitest reporter.
- Impact: cosmetic. It will trip a whitespace lint or diff check if one is ever turned on.
- Fix: trim the trailing space in those four strings and comments.

### 2. Nit – review ids remain in the source doc comment, and they still mix reviews
`src/ui/toast-place.ts:12-14`.
- Evidence: the comment still reads `(review 148591a n3)`, `(n4)` and `(m1)`. As the ed3fc9a review pointed out, `n4` and `m1` come from different review files than `148591a`, so the same mislabelling remains in the source. The commit message says it dropped review-id tags, and it did so only for the tests.
- Impact: a reader who looks up `n4` in the 148591a review finds a different item. Review ids also go stale once the review files are archived.
- Fix: describe the behaviour only. For example: "visible or still fading out: re-show at once, no snap, place next frame only / hidden: one pending settle per frame / dismiss timer armed after .show".

### 3. Nit – the second-settle test does not check that the timer is armed again
`tests/toast-controller.test.ts:36`.
- Evidence: the test ends with `expect(r.shown).toBe(true)`. A controller that arms the timer only for the first toast, and never for a later settled toast, passes the whole suite, but the real toast would then never hide.
- Impact: low, because that mutation is unlikely and the arming line is shared with the first settle.
- Fix: append `expect(r.timers.size).toBe(1); r.advance(TOAST_MS); expect(r.shown).toBe(false);`.

## Correctness and regressions
- 37524aa makes no logic change. The `toast-place.ts` diff is two comment lines. The controller body, the exports (`toastTop`, `ToastDom`, `ToastClock`, `TOAST_MS`, `toastController`) and the wiring in `app.ts` are unchanged from ed3fc9a, which I reviewed last time.
- The branch-wide state matches my last review: `pending` is set only in the hidden branch and reset in the settle frame, the dismiss timer is armed after `.show`, and the visible or exiting branch places in the next frame only.
- The earlier `rc2-toast-banner.test.ts` tests for `toastTop` are unchanged. I re-read them: they cover docked, not docked, banner lower, strip lower, nothing measured and rounding. Expected values check out against `Math.round(edge + 8)`.

## Layout at 360 / 390 / 1280
No CSS or placement code changed in 37524aa, so the results in the ed3fc9a review stand:
- **360 and 390 (not docked):** `toastTop` is non-null, so the toast takes `.below` and fades in place at `max(strip, banner) + 8`.
- **1280 (docked):** with the banner, `.below` fades in place under it. Without the banner, `toastTop` is null and the toast slides in from above the viewport. The rc0 `toastfirst` case covers both.
I did not re-verify these in a browser.

## Scope
The new commit is limited to one source comment and one test file, both toast work. Across the whole branch the scope is the same five files as before and still clean.

## What I ran
- Reads: `git diff ed3fc9a..37524aa` (full), `cat src/ui/toast-place.ts`, `cat tests/toast-controller.test.ts` (both via the one Bash call that was allowed), then `Read` on `tests/toast-controller.test.ts` and `tests/rc2-toast-banner.test.ts`, and the ed3fc9a review.
- **Not run:** `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/toast-controller.test.ts tests/rc2-toast-banner.test.ts` and `npx tsc --noEmit`. After the first Bash call, the harness denied the next ones ("don't ask mode"). I did not retry or work around it. I therefore cannot say that the 7+6 unit tests pass or that `tsc` is clean. Please run both before merge. The new test only uses `Array.prototype.at` (already used by the earlier tests) and members of the existing rig, so I expect it to compile.
- Also not run: `git status`, `git diff a01faea..37524aa` on `app.ts`/`rc0-browser.mjs`, and any repo-wide grep. Because of that, I relied on the ed3fc9a review for those two files, and I did not check for other leftover review-id tags outside `toast-place.ts` and the toast test.
- The browser sections (`toastfirst` and the rest of rc0) were not run, as instructed.
