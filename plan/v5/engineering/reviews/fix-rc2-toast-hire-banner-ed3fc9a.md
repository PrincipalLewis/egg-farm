# Review: fix-rc2-toast-hire-banner @ ed3fc9a (base main a01faea)

Topic: RECHECK of `engineering/reviews/fix-rc2-toast-hire-banner-148591a.md` (m1 tests, n2-n4). The toast state machine moved from `showToast` into a pure `toastController` in `src/ui/toast-place.ts`, with unit tests. I reviewed 148591a..ed3fc9a in detail and read the whole a01faea..ed3fc9a diff, plus `src/ui/app.ts`, `src/ui/styles.css` (toast rules) and `scripts/rc0-browser.mjs`. The worktree was not modified and no browser was run.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 1 |
| nit | 2 |

The extraction is behaviour-preserving apart from the intended n3 change, and the new unit tests catch most of the plausible regressions. I checked this by mentally mutating the controller (details below). One real hole remains: nothing tests a second hidden-to-shown cycle, so a `pending` flag that never resets would pass the suite (finding 1). **`tsc` and `vitest` could not be run.** Bash was denied in "don't ask mode" partway through the session, and I did not work around it (see "What I ran").

## Recheck of the previous findings

| Prior (148591a review) | Status | Notes |
|---|---|---|
| 1 (minor) tests don't guard m1/m2/n4 | **Mostly fixed** | `tests/toast-controller.test.ts` has six tests that cover m1 (timer after `.show`), m2 (re-show mid-exit), n4 (double call) and the exact settle order. One gap remains: finding 1 below. |
| 1, docked no-banner assertion weak | **Fixed** | `scripts/rc0-browser.mjs:117` now also requires `seen.length > 0`, `seen[0].top < settled.top - 1` and `!r.below`. The CSS (`styles.css:150`) hides the toast at `translateY(-100% - hud-h - 16px)`, so the first visible frame is far above the settled top. The `-1` margin cannot be hit by frame jitter. |
| 2 (nit) unreachable `cancelAnimationFrame(settleRaf)` | **Fixed** | Removed. The controller has no cancel, and `pending` is only set while hidden. |
| 3 (nit) synchronous `place()` on re-show | **Fixed** | The visible/exiting branch now calls `place` only in the next frame (`toast-place.ts:20`). The unit test "visible branch places next frame only" asserts it. |
| 4 (nit) dismissal margin about 300 ms | **Fixed** | A fixed sleep was replaced by `waitForFunction` with a 3 s timeout (`rc0-browser.mjs:125-126`). The label no longer claims "~1.3s". |

## Findings

### 1. Minor – no test covers a second settle after the first toast has fully gone
`tests/toast-controller.test.ts` (rig at `:6-14`) and `src/ui/toast-place.ts:21-23`.
- Evidence: the rig's `hide` clears `shown` but `op` stays 1 (only the test that sets `r.op` models a fade). Every test therefore starts from a fresh rig and runs at most one hidden-to-shown settle. Take the mutation "delete `pending = false` in the rAF callback". Test 1 passes (one settle), test 2 passes, and test 5 passes (the second call returns early, so one frame and one `show`). With that mutation the real toast would show once, then every later hidden call hits `if (pending) return` and no toast ever appears again. In the browser only the first toast of each rc0 context is checked, so the rc0 script would not catch it either.
- Impact: a one-token regression that disables all toasts after the first one stays green in both suites.
- Fix: add a test along the lines of `show(); frame(); advance(TOAST_MS); r.op = 0; log.length = 0; show(); expect(frames.length).toBe(1); frame(); expect(log).toEqual(['tr-off','place','reflow','tr-on','show']); expect(shown).toBe(true)`. Optionally let the rig decay `op` to 0 in `hide` after a configurable delay, so "fully hidden" does not need to be forced by hand.

### 2. Nit – review-id tags in the test mix two reviews
`tests/toast-controller.test.ts:1,19,28,32` and `src/ui/toast-place.ts:11-14`.
- The header says "review 148591a m1", but the per-test tags `(m1)`, `(m2)`, `(n4)` come from the 4902a39 review. In the 148591a review, "n4" was the dismissal margin, not the double call. `(n3)` is the 148591a one.
- Impact: someone reading the tag against the 148591a file finds the wrong item.
- Fix: describe the behaviour in words (the test names already do) and drop the ids, or prefix each id with its review hash.

### 3. Nit – "pure" is loose for a closure with state, and the module name no longer fits
`src/ui/toast-place.ts:7-14`; also the commit message ("pure toastController").
- `toastController` keeps `timer` and `pending` in a closure and drives side effects through injected ports. It is deterministic and unit-testable, but not pure.
- The file is named `toast-place` and now holds the whole state machine. This is cosmetic.
- Fix: say "injected DOM + clock, no globals" in the comment. Optionally rename the file to `toast.ts` later; not worth a churn commit now.

## Test adequacy (mutation reading of `toastController`)
Mutants I judged against `tests/toast-controller.test.ts`:
- Drop `|| d.opacity() > 0`: caught by the mid-exit test (the log would be empty instead of `['show']`).
- Drop `if (pending) return`: caught by "two calls before the first frame" (two frames queued).
- Arm the timer at the call rather than after `.show`: caught by the dismiss test (`timers.size` 0 and `shown` false while rAF is paused).
- Drop `arm()` in the visible branch: caught by the second-toast test (it stays shown or never hides at the right time).
- Drop `c.clearTimeout(timer)`: caught by the second-toast test (the first timer fires at 1300 ms and hides the toast early).
- Synchronous `place()` in the visible branch, or no `raf(place)`: caught by the n3 test and the mid-exit test.
- Reorder the settle steps (for example `show` before `reflow`, or `tr-on` before `place`): caught by the exact `toEqual` list in test 1.
- Drop `pending = false`: **not caught** (finding 1).

## Correctness and regressions
- The `app.ts` wiring is equivalent to the previous inline code. `shown()` reads `.show`, `opacity()` reads computed opacity, `transitions(on)` sets `style.transition` to `'none'` or `''`, `reflow()` reads `offsetHeight`, `place` is the same `toastTop`-based placement, and the clock uses `window.setTimeout`/`requestAnimationFrame`. `toastTimer` and `settleRaf` are fully removed (no other references in `src/ui`; the grep was done before the denial).
- `showToast` sets `textContent` before calling the controller, so a second call during a pending settle updates the text and keeps one settle (last text wins), as before.
- `TOAST_MS = 1300` is the only 1300 in `src` (the CSS has no matching timing), so there is no duplicated constant.
- Behaviour change (intended, n3): in the visible or exiting branch `.below` and `top` are applied one frame after `.show`, not synchronously. The synchronous call measured before a same-action banner was laid out anyway, so nothing is lost. At most one frame of stale `top`, same as before in the banner case.
- rc0 changes: the `below` field in `r` is read after the settle, and the dismissal now polls for `!show && opacity '0' && visibility 'hidden'` within 3 s. It cannot pass trivially, since `settled.op === 1` is asserted earlier in the same case.
- Type-level reading: `toastController(d, c)` takes `ToastDom` and `ToastClock`; the adapters in `app.ts` match the signatures (`window.setTimeout` returns a number; `requestAnimationFrame` returns a number). `Array.prototype.at` in the test is already used by `tests/ftue-v11.test.ts` under the same tsconfig (`lib` ES2020 plus `types: node`), so it is not a new risk. Not verified by running `tsc`.

## Layout at 360 / 390 / 1280
No CSS changed and `placeToast` computes the same `top`/`.below` as before, so the layout is the same as in the 148591a review.
- **360 and 390 (not docked):** `toastTop` is non-null, so the toast takes `.below` and fades in place at `max(strip, banner) + 8`. `max-width: calc(100vw - 24px)` and `white-space: nowrap` are unchanged.
- **1280 (docked):** with the banner, `.below` fades in place under it. Without the banner, `toastTop` is null, there is no `.below`, and the toast slides in from above the viewport (`styles.css:150-152`). The strengthened rc0 assertion now matches that.
- **Reduced motion:** `--t-med` is 0, so the exit completes at once and the next toast takes the settle path.

## Scope
Five files: `src/ui/app.ts` (wiring), `src/ui/toast-place.ts`, `tests/rc2-toast-banner.test.ts` (the 6 `toastTop` tests, introduced earlier on the branch), `tests/toast-controller.test.ts` (new) and `scripts/rc0-browser.mjs`. All of it is toast work. No CSS or unrelated files. The `app.ts` diff adds a blank line after `showToast`, which is harmless. Scope is clean.

## What I ran
- Reads: `git log`, `git diff a01faea..ed3fc9a` (full), `git diff 148591a..ed3fc9a -- scripts src/ui/app.ts`, the 148591a review, `src/ui/toast-place.ts`, the toast rules in `src/ui/styles.css`, `tsconfig.json`, and greps for `.at(`, `1300`/`TOAST_MS` and `toast` in the CSS.
- **Not run:** `npx tsc --noEmit` and `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/toast-controller.test.ts tests/rc2-toast-banner.test.ts`. The harness denied both attempts ("don't ask mode"), and I did not retry or work around it. I therefore cannot say that the 6+6 unit tests pass or that `tsc` is clean; the claims about test results above come from reading the code. Please run both before merge.
- The browser section `toastfirst` was not run, as instructed; my reading of it comes from the script.
