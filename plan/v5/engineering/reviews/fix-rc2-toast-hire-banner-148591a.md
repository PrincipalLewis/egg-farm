# Review: fix-rc2-toast-hire-banner @ 148591a (base main a01faea)

Topic: RECHECK of review 4902a39 findings m1-m3, n4, n5 (`engineering/reviews/fix-rc2-toast-hire-banner-4902a39.md`); toast-v3 first-frame fix. Reviewed 4902a39..148591a in detail, plus the whole a01faea..148591a diff and the surrounding code (`src/ui/app.ts`, `src/ui/styles.css`, `scripts/rc0-browser.mjs`, `tests/rc2-toast-banner.test.ts`). Worktree not modified, no browser run.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 1 |
| nit | 3 |

The production changes in `showToast` are correct and fix the behaviours they target (m1, m2, n4). The remaining gap is test coverage: none of the new behaviour is guarded by a test that a broken implementation would fail (finding 1). `tsc` and the unit tests could not be run in this session (see "What I ran").

## Recheck of the previous findings

| Prior | Status | Notes |
|---|---|---|
| m1 timer fires before `.show` | **Fixed** | `arm()` is called only after `.show` is added (`src/ui/app.ts:162`, and the visible branch at `:157`). A paused rAF now means "no toast yet" rather than "stuck toast". The pending-settle early return leaves the timer unarmed, and the settle arms it, so there is no window where a timer exists without `.show`. |
| m2 snap when re-shown mid-exit | **Fixed** | The branch condition `classList.contains('show') \|\| +getComputedStyle(toast).opacity > 0` sends a toast that is still fading out down the no-snap path. That path calls `place()` and adds `.show`, so the transition reverses from its current value. The CSS shows why this works: the exit transition keeps `visibility` visible for `--t-med`, and opacity is above 0 until the transition ends. |
| m3 test gaps | **Partly addressed** | Added the 1280 no-banner case and a dismissal check. Not added: a second toast while visible, a second toast during exit, a double call before the first frame, a stubbed or throttled rAF. See finding 1. |
| n4 two calls in one frame | **Fixed** | `settleRaf` guards a single pending settle; the second call only updates `textContent`, so the last text wins and the timer is armed once. |
| n5 label, comment, long line | **Fixed** | The 1280 no-banner case exists, the "opacity > 0" comment is added, and `showToast` is split over several lines. |

## Findings

### 1. Minor – the new behaviour is not guarded by any test that a broken implementation would fail
`scripts/rc0-browser.mjs:122-126` and `tests/rc2-toast-banner.test.ts`.
- **Dismissal check does not guard m1.** `toast-v3 dismissed after ~1.3s` asserts `!show && op==='0' && vis==='hidden'` about 1.9 s after the dispatch. The pre-fix code, which armed the timer synchronously at the call, also passes it, because rAF runs normally in the harness. The check only proves a timer exists (it would fail if `arm()` were dropped). It does not prove the timer starts after `.show`, which is the point of m1. A paused-rAF case would need a stubbed `requestAnimationFrame` or CDP throttling.
- **m2 (re-show mid-exit) has no test.** If someone removes the `|| +getComputedStyle(toast).opacity > 0` clause, the snap returns and nothing fails. A guard would fire a second `dispatch` about 1.45 s after the first (inside the 240 ms exit) and assert that opacity never drops to 0 in the frames after the first sample above 0.3.
- **n4 (double call before the first frame) has no test.** Removing `if (settleRaf) return;` would give a pop-in with no fade and a stray second `.show`. Nothing fails. A guard would call `showToast` twice in the same task, for example by dispatching two actions that toast, and assert that the first visible frame has opacity below 1.
- **The docked no-banner case is weak.** The assertion is `settled.op === 1 && settled.top >= 0 && seen.every(x => x.top <= settled.top + 0.5)` (`:117`). The label says "slides in from above", but nothing asserts a slide. A toast that fades in place at the settled top passes, because every `top` equals `settled.top`. It also does not assert that `.below` is absent. The B2 section does check `.below` absence on the final state, so the gap is narrow. Adding `seen[0].top < settled.top - 1` would make the label true.
- **The pure unit tests still cover only `toastTop`.** `showToast` and its settle state machine have no unit coverage, and the project has no DOM test setup. This is acceptable, but together with the points above, the three behaviours fixed in this commit rest on reading the code only.
- Impact: a later edit can re-introduce m1, m2 or n4 and the suite stays green. The rc0 browser script is also not part of `vitest`, so a regression needs a manual browser run to show up.
- Fix: add the m2 and n4 cases to `toastfirst` (both can be driven with `dispatch` timing as above), add `seen[0].top < settled.top - 1` to the docked case, and note in the dismissal label that it does not cover m1. Or extract the state machine (`visible | exiting | hidden | pendingSettle`) into a pure function in `toast-place.ts` that takes injected `now`/`rAF`/`opacity` and unit test it.

### 2. Nit – the `cancelAnimationFrame(settleRaf)` in the visible/exiting branch is unreachable
`src/ui/app.ts:156`. A settle is only scheduled while the toast is hidden (no `.show`, opacity 0). While one is pending, a second call re-enters with `.show` still absent and opacity still 0, so it takes `if (settleRaf) return;`. Nothing else adds `.show` or raises opacity in that frame. So `settleRaf` is always 0 when the first branch runs, and the `cancelAnimationFrame(...)` and `settleRaf = 0` there are dead code.
- Impact: none at runtime; it is harmless defensive code, but it suggests a path that does not exist.
- Fix: delete both statements, or keep them with a comment saying they are defensive.

### 3. Nit – the exit branch places synchronously, so a partly visible toast can jump for one frame
`src/ui/app.ts:157`. In the visible/exiting branch `place()` runs synchronously and again in the next frame (`requestAnimationFrame(place)`). The first call happens before a banner shown by the same action is laid out.
- When the toast is already visible, this is the previous behaviour, unchanged.
- The new exit path makes it reachable while the toast is mid-fade, and flipping `.below` or `top` on a toast that is partly transformed can move it by up to a banner height for one frame. The cases are a docked toast sliding out with no banner, then a second toast within 240 ms with the banner now visible, so the toast jumps to `banner + 8` while its transform is still offset.
- Impact: at most one frame of a displaced toast, and it needs two toasts within 240 ms of each other with a banner appearing in between. This is not a regression of the fixed behaviour.
- Fix: for the exit branch, skip the synchronous `place()` and rely on the next-frame call. Or accept it and note it.

### 4. Nit – the dismissal check has a margin of about 300 ms
`scripts/rc0-browser.mjs:124`. The check runs about 1900 ms after the dispatch (100 + 400 + 1400 of fixed sleeps). The toast is dismissed one or two frames after the dispatch (render pump, then settle) plus 1300 ms plus a 240 ms fade, so about 1590 ms. That leaves about 300 ms.
- Impact: it could flake under a loaded CI runner or a slow render pump fallback. It does not matter for correctness.
- Fix: poll with `page.waitForFunction` on `!el.classList.contains('show') && opacity === '0'` with a 3 s timeout, instead of a fixed sleep.

## Layout check (reading the CSS, no browser)
No CSS changed, and `place()` computes the same `top` and `.below` as before, so the layout at the three widths is unchanged from the 4902a39 review.
- **360 and 390 (portrait, not docked):** `toastTop` is always non-null, so the toast takes the `.below` fade-in-place path. The first frame already has `top = max(strip, banner) + 8`. `max-width: calc(100vw - 24px)` and `white-space: nowrap` are unchanged.
- **1280 (docked, landscape):** with the banner, `.below` fades in place under the banner. Without it, `toastTop` returns null, there is no `.below`, and the toast slides from the off-screen base (intended, nothing to cross).
- **Re-show during exit:** the transform, `top` and `.below` transitions use the existing `transform var(--t-med), opacity var(--t-med)`. The `.show` rule's `visibility 0s` makes the toast visible immediately, so nothing new appears at any width.
- **Reduced motion:** `--t-med` is 0, so the exit completes instantly and opacity is 0 at the next call. The toast then takes the settle path, which still works.
- **Timer shift:** the dismissal starts at `.show` rather than at the call, so the toast is visible about one frame longer, which is negligible against 1300 ms.

## Scope
Four files changed across the branch: `src/ui/app.ts` (`showToast`), `src/ui/toast-place.ts`, `scripts/rc0-browser.mjs` and `tests/rc2-toast-banner.test.ts`. The 4902a39..148591a part touches only `app.ts` and `rc0-browser.mjs`. The single-line `showToast` is reformatted into several lines, which is justified because the function was substantially rewritten. No CSS changes and no unrelated files. Scope is clean.

## What I ran
- `git log`, `git diff a01faea..148591a`, `git diff 4902a39..148591a`, reads of `src/ui/app.ts`, `src/ui/styles.css`, `scripts/rc0-browser.mjs`, `tests/rc2-toast-banner.test.ts`, and the 4902a39 review. A grep over `tests/` found no test that references `showToast` or the settle code.
- `npx tsc --noEmit` and `npx vitest run --pool=forks ... tests/rc2-toast-banner.test.ts` were **not run**. The harness denied the combined command ("don't ask mode"), so I did not retry or work around it. From reading, the new types check: `toastTimer` and `settleRaf` are numbers, `requestAnimationFrame` returns a number, and `+getComputedStyle(toast).opacity` is a number. The unit test file is unchanged since the last review (6 tests passed then). Typecheck and tests are unverified by me for 148591a.
- The browser `rc0-browser.mjs` sections were not run (instructed not to run browsers); my reading of `toastfirst` comes from the script, not from a run.
