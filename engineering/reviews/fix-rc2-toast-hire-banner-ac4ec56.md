# Code review: fix-rc2-toast-hire-banner (a01faea..ac4ec56)

Topic: rc2 item 1. The "Coop upgraded!" toast is placed below the "New helper!" banner (`showToast` in `src/ui/app.ts`), plus the rc0 B2 expectation.
Worktree: /workspace/review-ac4ec56. I did not modify it.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 2 |
| nit | 2 |

Verdict: the fix is correct and in scope. I found no blockers. The two minors are about test strength and rc0 coverage.

## What changed

- `src/ui/app.ts:146`: `showToast.place()` now also measures the visible `.intro-a` (`document.querySelector('.intro-a:not([hidden])')`). It computes `edge = Math.max(docked ? 0 : qb, ia)` and `below = edge > 0`. When `below` is true, the toast sits at `top = round(edge + 8)` and gets the `.below` class, which fades in place.
- `scripts/rc0-browser.mjs` B2: the expected toast top is `max(queue bottom if <960, banner bottom) + 8`.
- `tests/rc2-toast-banner.test.ts`: new source-text test.

## Correctness analysis (no findings)

- **No regression when the banner is absent.** With `ia = 0`, `edge = docked ? 0 : qb`, so `below = qb > 0 && !docked`. That is identical to the old logic, and docked with no banner still slides off the top.
- **The hidden banner is excluded.** `.intro-a[hidden]{display:none}` (`styles.css:257`), and the selector uses `:not([hidden])`. `renderWorkersIntro` (`app.ts:562`) hides the banner while a modal or panel is open, so the toast ignores it then.
- **Why a DOM query instead of the `introA` variable.** `let introA` is declared at `app.ts:541`, after `showToast` at `:146`, so a closure reference could hit the temporal dead zone if `showToast` ran early. The DOM query avoids that. This is fine.
- **Ordering at toast time.** In `tick` (`app.ts:631`), `render()` shows the toast first. `renderWorkersIntro()` creates the banner after that, in the same task. The immediate `place()` therefore does not see it, but the `requestAnimationFrame(place)` re-measures and does. The ordering works because of that rAF.
- **Stacking.** The toast has z-index 31 and the banner 26, so even a stale position is not hidden behind the banner.
- **Layout at 1280 (docked, landscape).** The banner is `position:fixed`, `margin-inline:auto`, max-width 480, centred in the viewport. The toast is centred at `left:50%`. Before the fix both sat at `top = hud-h + 8`, which is the overlap bug. The toast now sits 8px under the banner's bottom edge and fades in place.
- **Layout at 390 and 360 (<960).** The banner is 12px from each side, so 366px wide at 390 and 336px at 360. At 360 the text column is narrow, so the banner wraps and is taller. The toast uses the measured `bottom`, so height does not matter. The toast is capped at `max-width: calc(100vw - 24px)`, which matches the banner width, so there is no horizontal overlap problem. At 360, "Coop upgraded! +1 customer slot" has `white-space:nowrap` and may approach 336px. That is existing behaviour and unchanged by this diff.
- **Which edge wins <960.** The banner's `top` is `hud-h + 8`, the same as the queue strip's region. The `max()` handles either one being lower.

## Findings

### 1. [minor] Unit test is a source-text match and would pass a broken implementation
`tests/rc2-toast-banner.test.ts:6-9`

Evidence: the test reads `app.ts` as a string and asserts that the slice contains `.intro-a:not([hidden])` and matches `/Math\.max\(docked\.matches \? 0 : qb, ia\)/`. It never evaluates the placement.

Impact: these variants all pass the test while still showing the bug:
- `toast.style.top` set from `qb` instead of `edge`.
- `below` computed from `qb > 0` only.
- The `max` expression left in place but unused or overwritten.
- A comment or dead code containing the strings.

It also breaks on harmless reformatting. The slice end `toastTimer = window.setTimeout` is brittle, because `indexOf` returning -1 silently changes the slice.

Fix: extract a pure helper, for example `toastTop(qb: number, ia: number, docked: boolean): number | null`, into a small module. Unit-test the cases:
- `docked`, no banner: `null`.
- `docked`, `ia = 120`: `128`.
- Not docked, `qb = 90`, `ia = 0`: `98`.
- Not docked, `qb = 90`, `ia = 140`: `148`.
- Not docked, `qb = 150`, `ia = 120`: `158`.

Then call the helper from `place()`.

### 2. [minor] rc0 B2 expectation is derived from observed state, so it does not prove the banner case occurs
`scripts/rc0-browser.mjs:91-96`

Evidence:
- `below = w < 960 || ia > 0` and `edge` come from the banner measured about 2.5 s after the toast, not at show time.
- The test never asserts that the banner was present. If the banner failed to appear, the 1280 case would silently fall back to the old "off the top" branch and pass. That is the exact case this fix targets.
- Widths are `[390, 1280]`. There is no 360 case, although the banner is tallest at 360.
- The banner is never given a chance to appear after the toast starts, and it is never hidden mid-toast.

Impact: weak regression protection for the fix under review. I could not run the browser here. By reading the setup (`farmLevel` 4 → 5, `coinsCents: 1e9`, `unlock_farm: 3`, FTUE done), the banner should appear in both cases. That is not asserted, though.

Fix:
- Add `ok(..., ia > 0)` for the banner, or add a separate explicit assertion.
- Add a 360 width.
- Record `ia` at show time, inside the `evaluate` that reads `shown`.
- Assert `shown.top >= ia + 8 - 1` at all widths.

### 3. [nit] Placement is not re-evaluated after the first rAF
`src/ui/app.ts:146`

Evidence: `place()` runs once immediately and once on the next animation frame. The 250 ms `setInterval` re-placement used by `coach` (`app.ts:536`) is not applied here.

Impact: if the banner appears or is un-hidden after that frame but within the 1300 ms toast window, the toast can overlap it. Examples are closing a panel, or `workersIntroA` becoming true on a later tick. This is a rare window of about 1.3 s, so I rate it a nit.

Fix: either accept it, or re-run `place` from the interval while `.show` is set.

### 4. [nit] The first frame can use the wrong animation mode when the banner is created in the same tick
`src/ui/app.ts:146`

Evidence: at 1280 with no banner at the time of the immediate `place()`, `below` is false. The toast starts with the slide transform and no `.below` class. The next-frame `place()` then adds `.below` and changes the transform and `top` mid-transition.

Impact: at most a one-frame visual hitch, probably imperceptible because the toast starts at opacity 0. Not worth a change unless Finding 1's helper is introduced anyway.

## What I ran

- `git diff a01faea..ac4ec56` and `git log`.
- Read `src/ui/app.ts` (toast, `render`, `renderWorkersIntro`, `tick`), `src/ui/styles.css` (`.toast`, `.toast.below`, `.intro-a`, `.queue`) and `scripts/rc0-browser.mjs` (B1, B2).
- I could not run `npx vitest run ... tests/rc2-toast-banner.test.ts` or `npx tsc --noEmit`. The sandbox ran in don't-ask mode and denied `npx`. Nothing was executed or verified there. The change is a single expression of existing types (`Element | null`, optional chaining, `?? 0`, `Math.max` of numbers), so I expect it to type-check, but that is unverified.
- I did not run browsers.
