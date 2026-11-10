# Review: fix-rc2-toast-hire-banner @ 4902a39 (base main a01faea)

Topic: toast-v3 (art-ux screenshot-check 2026-10-17-0422 item 5). Reviewed 3930a4c..4902a39 mainly, plus the whole a01faea..4902a39 diff and the surrounding code. Worktree not modified, no browser run.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 3 |
| nit | 2 |

The fix is correct for the reported bug. In the hidden state, `settle` sets `transition:none`, calls `place()`, forces a reflow, restores the transition, then adds `.show`. So `top` and `.below` are committed in a style recalc of their own, and the `.show` transition starts from the settled `.below` hidden state (`translate(-50%,-8px)`, opacity 0) instead of the off-screen base. The new `toastfirst` check would fail on the old one-frame implementation. The findings below are edge cases the change introduced, plus test gaps.

## Findings

### 1. Minor – the dismiss timer can fire before `.show` is added, leaving a toast that never hides
`src/ui/app.ts:147`. `showToast` arms `toastTimer` (1300 ms → `remove('show')`) immediately. In the hidden state, `.show` is added later inside `requestAnimationFrame(settle)`.
- Evidence: `src/main.ts:118` drives the UI through `RenderPump`, and the comment above it says "a timer fallback covers paused/throttled rAF". So `ui.render()` → `showToast` deliberately runs when rAF is paused, for example in a hidden or throttled tab.
- Impact: if rAF is paused or delayed longer than 1300 ms, the timer's `remove('show')` is a no-op. When rAF resumes, `settle` adds `.show` and nothing removes it. "Coop upgraded!" then stays on screen until the next toast. It is `pointer-events:none`, so it blocks nothing, but it is a stuck message.
- Before this change `.show` was added synchronously, so this could not happen.
- Trigger: a coop tier or slot toast raised by the timer fallback while the page is throttled, or a main thread blocked for more than 1.3 s. It is unlikely but reachable.
- Fix: arm the timer inside `settle`, after `classList.add('show')`. This also gives the toast its full 1300 ms; today it is about one frame short. Alternatively, `settle` can check that the toast is still wanted.

### 2. Minor – a toast requested while the previous one is exiting snaps to invisible before fading in
`src/ui/app.ts:147`. The exit transition runs for `--t-med` (240 ms) after `.show` is removed. A new `showToast` in that window takes the `else requestAnimationFrame(settle)` branch because `.show` is already gone.
- Evidence: `settle` sets `transition:none` and forces a reflow. That cancels the in-flight exit transition and snaps to the hidden state (opacity 0, `visibility:hidden`). `.show` is then re-added and the toast fades in from zero.
- Impact: the old code reversed the transition from its current value. Now a partly visible toast disappears for a frame and fades in again, which can read as a flicker. It needs two toasts within about 240 ms of the first one's exit, such as a tier toast followed by a slot toast. `.toast.show` also uses `visibility 0s`, so the reflow-then-restore sequence is fine for the visibility transition.
- Fix: if the computed opacity is greater than 0 (still exiting), use the visible branch: `place()` plus `.show`, without the snap. Or accept it and document it.

### 3. Minor – tests never exercise the paths where the new code is riskiest
`scripts/rc0-browser.mjs:101-121` and `tests/rc2-toast-banner.test.ts`. `toastfirst` opens a fresh context per case and fires one toast.
- Not covered: the timer and dismiss lifecycle, or any check that the toast is hidden at about 1.3 s (finding 1). `B2` still covers "fully gone" for the first toast.
- Not covered: a second toast while the first is visible (the `place(); rAF(place)` branch).
- Not covered: a second toast during the exit (finding 2).
- Not covered: two `showToast` calls before the first frame (see nit 4).
- Not covered: `prefers-reduced-motion` / `.reduced-motion`.
- Not covered: the 1280 docked no-banner case, which is intentionally the slide-in-from-the-top path. `B2` covers 1280 no-banner, but only through final state, not per frame.
- The "would a broken implementation pass?" check:
  - Reverting to the old sync `place(); add('show')` fails the "never over banner/strip" and "first visible frame at settled top" checks, because rect `top` is transform-inclusive.
  - Removing `void toast.offsetHeight` fails them too.
  - Removing only `transition:none` while keeping the reflow probably still fails the first-visible-frame check, since the hidden `top`/`.below` transform change is itself a transition. I did not run this.
  - So the central regression is guarded. The surrounding behaviour is not.
- The unit tests (`tests/rc2-toast-banner.test.ts`) only cover the pure `toastTop`, not `showToast`/`settle`. That is acceptable given the project has no DOM test setup, but the 4902a39 change adds no unit coverage at all.
- Fix: add `toastfirst` cases for 2 (a second toast 100 ms later, asserting no frame with opacity 0 after one with opacity above 0.3), for 1 (`dispatchEvent` of `visibilitychange` is not enough; a CDP-throttled rAF or a stubbed rAF would be needed), and a dismissal assertion at about 1.6 s.

### 4. Nit – two `showToast` calls in the same frame leave the toast popping in with no fade
`src/ui/app.ts:147`. Both calls see `.show` absent, so each schedules `requestAnimationFrame(settle)`. The second `settle` runs after the first has added `.show`, with transition none, and forces a reflow. The hidden→shown change then applies instantly.
- Current callers (`app.ts:464`, `:467`) are mutually exclusive, because `slotToastPending` is cleared at 464. This is latent only.
- Fix: keep a `settlePending` flag, or cancel the earlier rAF handle.

### 5. Nit – the `toastfirst` label/section details
- `scripts/rc0-browser.mjs:107`: the case-tag label "no banner" is used for the 390 case. It reads fine, but 360 and 1280 both use "banner", so the 1280 docked no-banner case is absent from `toastfirst` (see finding 3).
- `scripts/rc0-browser.mjs:119`: the "never over the banner" assertion uses `seen` (frames with opacity above 0). A toast at opacity 0 over the banner is not counted, which is correct for the user-visible bug but worth a comment.
- The `app.ts:147` line is now one very long line holding `place`, `settle` and the branch logic. It matches the surrounding style but is harder to review; consider splitting it.

## Layout check (reading the CSS, no browser)
- `.toast` default: `top:calc(var(--hud-h)+8px)`, hidden transform `translate(-50%, calc(-100% - hud-h - 16px))`. `.toast.below` (styles.css:404) hides at `translate(-50%,-8px)` and shows at `translate(-50%,0)`.
- 360 and 390 (portrait, not docked): `queueEl` is always measured, so `toastTop` is always non-null and the toast takes the `.below` fade-in-place path. With the new settle the first frame already has `top = strip/banner bottom + 8`. `max-width:calc(100vw - 24px)` and `white-space:nowrap` are unchanged. The longest text, "Coop upgraded! +1 customer slot", at `--fs-base` plus 32px padding fits at 360. I did not measure it; the earlier B2 360 case covers this.
- 1280 (docked, landscape): with the banner it is `.below` and fades in place below the banner. Without it, `toastTop` returns null, so there is no `.below` and the toast slides from off-screen, which is intended and not through anything.
- `docked.matches` is read at call time and `settle` runs one frame later. Rotating or resizing in that single frame could use stale geometry for one toast. Negligible.
- Reduced motion: `--t-med` is 0 so the transitions are instant. `settle` still works, and the extra frame of delay is the only difference.

## Scope
Only `src/ui/app.ts` (`showToast`), `scripts/rc0-browser.mjs`, `src/ui/toast-place.ts` and `tests/rc2-toast-banner.test.ts` changed across the branch. The 4902a39 commit touches `app.ts` and `rc0-browser.mjs` only. No CSS changed and no unrelated files are touched. Scope is clean.

## What I ran
- `git log`, `git diff a01faea..4902a39`, `git diff 3930a4c..4902a39`, file reads of `app.ts`, `styles.css`, `main.ts`, `toast-place.ts` and `rc0-browser.mjs`.
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-toast-banner.test.ts`: 1 file, 6 tests passed.
- `npx tsc --noEmit`: **not run**. The harness denied the command in this session ("don't ask mode"), twice, so I did not retry or work around it. The TypeScript change is a single added arrow function (`settle`) with no new types, but typecheck is unverified by me.
- The browser `rc0-browser.mjs` sections were not run (instructed not to run browsers). My view on `toastfirst` is from reading the script, not from a run.
