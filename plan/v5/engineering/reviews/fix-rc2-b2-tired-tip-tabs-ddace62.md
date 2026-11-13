# Code review: fix-rc2-b2-tired-tip-tabs @ ddace62 (base main a01faea)

Topic: B-2 rule D (rc2-notes §B-2, 02:15): guarded auto-scroll, skip/seen flags, Manage tip alone at 1024x474; plus the 902f924 minors (15s cap, clip tests, clip/row checks for the hire and Manage tips).
Files: `src/ui/app.ts`, `src/ui/coach-place.ts`, `tests/rc2-b2-safe-coach.test.ts`, `scripts/rc0-browser.mjs`. Worktree `/workspace/review-ddace62` was not modified.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 3 |
| Minor | 5 |
| Nit | 3 |

Verdict: not ready. The pure helpers in `coach-place.ts` are sound and well covered. The wiring in `app.ts` has three problems, and the vitest suite cannot catch any of them. First, the player's own Hire tap trips the rule D guard, so auto-scroll never runs in the real flow at 1280x720/600. Second, the auto-scroll decision can be made while the phone sheet is still sliding in. Third, the Manage tip can be lost for good. Only F1 and F3 are certain; F2 is plausible but I could not run a browser to confirm it.

## Findings

### 1. [Major] The Hire tap itself trips the rule D guard, so auto-scroll never happens when the player really hires
`src/ui/app.ts:576-579` (guard listeners), `:557` (guard check), `:211` (hire click path).

Evidence:
- `mark()` is bound to `pointerdown`, `touchstart`, `wheel` and `keydown` on the whole `.body` of the Upgrades sheet.
- The Hire button is a `button.btn` inside `#uRow`, which is inside `.body`.
- The tap that hires therefore sets `lastPanelUser = now`.
- `act(hire)` emits `worker_hire` synchronously. `startTiredVisit()` runs 50ms later, and `coach()` calls `place()` immediately.
- At the first no-fit tick, `guardAllows(now, lastPanelUser)` is false (about 60ms since the tap, limit 1000ms). `d` is `null`, so `skip()` runs.
- Keyboard hire (Enter) does the same through `keydown`.

Impact:
- At the exact sizes rule D targets (docked 1280x720 and 1280x600), a real tap-to-hire always gives a skipped visit.
- The tired tip is replaced by the Manage tip and the skip counter goes up.
- Auto-scroll only runs if the player waits about 1s after the tap, and by then the decision has already been made.
- The 02:15 intent is "never pull the panel from someone mid-scroll". It is not "never scroll after the tap that caused the tip".
- The browser test doesn't catch this. `rc0-browser.mjs` hires with `window.eggfarm.dispatch({type:'hire'})`, which fires no pointer event. The 'guard' mode uses a synthetic `WheelEvent`.

Fix:
- Let only scroll gestures set the guard: `wheel`, `touchmove`, the non-programmatic `scroll` event, and keyboard scroll keys. Drop `pointerdown`, `touchstart` and `keydown` on `button` elements.
- Or ignore events whose target is inside `[data-act]`.
- Or, when the guard blocks, wait until it clears (up to about 1.5s) instead of skipping immediately. This needs a spec call from Art & UX, because "touched" is ambiguous.
- Add a Playwright step that hires with a real `page.click` on the Hire button at 1280x720 and expects the tired tip to show after the scroll.

### 2. [Major, plausible] The auto-scroll / skip decision can run on geometry measured mid slide-in (phones)
`src/ui/app.ts:553-561`, `:625` (visit poller), `src/ui/styles.css:101-104` (`transform:translateY(100%)`, `transition: transform var(--t-med)` = 240ms).

Evidence:
- The visit watcher polls every 250ms and sees `open === 'upgrades'` as soon as the nav tap sets it, while the sheet is still translating.
- The pending tired tip in the direct flow also re-checks every 250ms, so its first tick after opening lands mid-transition about 96% of the time (240 of 250ms).
- `autoScrollDelta` (`coach-place.ts:57-63`) uses `innerHeight` as the bottom limit, but `rr` and `clip` are both translated down by the transform.
- Worked example at 390x640 with the sheet about 200px down:
  - need = 612 + 8 + 68 - 632 = 56.
  - `row.top - need >= clip.top` holds, so `scrollBy(56)` runs. It moves content that should not move.
  - A bigger translation gives `null`, so `skip()` runs and counts one of the 3 skips even though the row would fit once the sheet settles.
- `inVp(r)` is also false during the slide, so `safeCoachPlacement` returns `null` and falls into the autoScroll branch every time.

Impact:
- On phones the panel can be nudged by a few dozen px, or a visit can be wasted.
- rc0's direct-flow phone case only asserts "shown and seen", so a spurious scroll passes it.

Fix:
- Don't decide until the sheet has settled. Options: check `getComputedStyle(sheet).transform === 'none'`, or `sheet.getAnimations().length === 0`, or require two consecutive ticks with an identical `rr.top`.
- Alternatively, start the visit 250ms or more after the open.
- Add an rc0 assertion that `.body.scrollTop` is unchanged after a phone open that needs no scroll.

### 3. [Major] The Manage tip can be lost permanently (regression from "always shows at +3.1s")
`src/ui/app.ts:608-612` (`showManage`, `onClose`), `:614-615` (`startTiredVisit` bails when `tiredSeen`), `:547` (15s cap).

Evidence:
- `showManage` sets `manageShown = true` and creates a Manage `coach()`. That tip is now gated on `sheetOk` and on a clean spot, and is dropped after 15s without showing (`deferExpired`, born at creation).
- `onClose` resets `manageShown = false` when `introBStage < 2`. Nothing ever calls `showManage` again. The only callers are the tired tip's `onShow` and `onSkip`.
- Once the tired tip has been shown, `flags.tiredSeen` is true and `startTiredVisit` returns early.
- Scenario on a phone: the tired tip shows, the player closes the sheet within 3.1s, and the Manage tip defers and is dropped after 15s. FTUE step 7 'done' never fires, and the Manage tip never appears in this or any later session.
- The same happens if another `coach()` replaces it. The old code showed it unconditionally.

Impact: a first-hire FTUE hint can silently vanish, and the step 7 'done' telemetry is lost.

Fix:
- Persist a `manageTipSeen` flag.
- Re-arm `showManage` from the visit watcher while `!manageTipSeen && workersIntroB`, instead of from the tired tip alone.
- Or start the 15s clock when the sheet is visible rather than at creation.

### 4. [Minor] The Manage tip and its 'done' telemetry repeat every session until the tired tip is seen or skipped 3 times
`src/ui/app.ts:606-612`.
- `manageShown` and `introBStage` are in-memory only.
- At 1024x474 the tired tip is skipped once per session, and each skip calls `showManage`. A player gets the Manage tip in 3 sessions, and step 7 'done' fires 3 times.
- The same happens for a player who has already used Manage.
- The old behaviour was once per save.
- Fix: the persisted flag from finding 3 covers this too.

### 5. [Minor] `reveal` can scroll the panel after the Manage tip is already showing
`src/ui/app.ts:563-564`.
- The branch is guarded by `!revealed`, not by `!shown`.
- If the player scrolls the row off screen during the 6s life, the tip hides (`p` becomes null). One second after their last gesture the guard clears and `scrollIntoView` pulls them back, which is the "yank while reading" behaviour rule D forbids.
- Fix: add `&& !shown`.

### 6. [Minor] Test adequacy: the new behaviour is untested in vitest, and rc0 doesn't cover the real paths
- The 27 vitest cases cover the pure helpers only. They pass here.
- None of this is exercised: `lastPanelUser` wiring, `skip()` and `onSkip` and flag persistence, "one attempt per visit", the Manage-after-skip timing, `reveal`, and the `born` / `shown` semantics of the 15s cap.
- A broken implementation passes vitest, for example one that calls `skip()` on every tick or never marks the guard. Findings 1-3 slipped through for this reason.
- `deferExpired` is tested as a pure function. Nothing checks that `place()` passes `born` correctly.
- rc0 can't run in CI-light environments (needs Chrome). It also dispatches hire programmatically, so the tap path is untested (finding 1).
- Fix: extract the per-tip decision (`defer`, `scroll`, `skip`, `reveal`) into a pure `coachStep(state, geometry, now)` and table-test it. Add an rc0 real-click hire case.
- I could not run rc0 (no browsers allowed), so the author's browser results are unverified here.

### 7. [Minor] Goal-intro tip behaviour changed without being asked for
`src/ui/app.ts:542-565`, `:580`.
- The old `coach()` fell back to a centred position when the anchor was missing or had no width.
- Now every tip is hidden until `safeCoachPlacement` finds a spot, and is silently dropped after 15s.
- `showGoalIntro` still fires telemetry step 5 regardless of whether the tip ever showed.
- It is consistent with rule B ("every tip") but is a behaviour change on an unrelated tip. Worth a line in the notes, or fire the telemetry from an `onShow`.
- `SHOTS_ALL` in rc0 is a small off-topic tooling change (it is in the commit message).

### 8. [Minor] A permanent 250ms `setInterval` for the visit watcher
`src/ui/app.ts:625`.
- It is never cleared, even after `tiredSeen` is true or no tired worker exists, and it reads layout state on every tick on a perf-sensitive WebKit target.
- Fix: stop it once `flags.tiredSeen`, or drive it from the `tab` / `open` changes (`openPanel` and the tab click handler) instead of polling.

### 9. [Nit] Horizontal margin is 4px, not 8px
`src/ui/app.ts:547`, `coach-place.ts:27`.
- `COACH_MARGIN` (8) applies only vertically.
- The centre clamp leaves a 4px edge gap, and `safeCoachPlacement` only rejects `l < 0 || r > vp.w`.
- At 1280 the Manage tip, anchored on a right-hand button, can end within 4px of the viewport edge.
- The doc comment says "viewport (8px margin)". Align the code and comment, or the test sweep.

### 10. [Nit] Test gaps and a misleading name in the new unit tests
`tests/rc2-b2-safe-coach.test.ts:80` ("touching edges" claims both tip bottom == tab top and tip top == tab bottom, but only the first is asserted), `:108` (`autoScrollDelta` with `row.top < clip.top` where the tip can't fit, returning `null`, is untested; a row clipped at the panel's bottom but still inside the viewport returns 0 and is untested).

### 11. [Nit] `let closed` is declared after `close`, which uses it
`src/ui/app.ts:~569-571`.
- It only works because `place()` is not called until after the declaration.
- Move `let closed = false` up with the other state, since `close`, `skip` and `place` form a TDZ-sensitive cycle.

## Checked and fine
- `safeCoachPlacement` order and margins, and `hit()` argument order (zero-size boxes are ignored on the correct operand).
- `autoScrollDelta` numbers for 1280x720 (9px), 1280x600 (39px) and 1024x474 (`null`).
- `tiredTipAfter` and `deferExpired` boundaries.
- Tips hide again when `p` goes null, and `cssText` replaces the hidden state on show.
- The 800ms post-scroll skip covers the case where the panel can't scroll, since `scrollBy` is a no-op.
- `TS 5.9.3` has `ScrollBehavior 'instant'`.
- 360, 390 and 1280: widths fit (`hw` is at most 144, `cx` is clamped). Docked 1280 stays inside the panel.
- Tablist is inside `.body`, so scrolling can move it up; the extra stricter clearance check is harmless.

## What I ran
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-b2-safe-coach.test.ts`: 1 file, 27 tests, all passed.
- `npx tsc --noEmit`: **not run**. The Bash tool was denied for it twice in this session. Typecheck status is unknown; I only confirmed TypeScript is 5.9.3.
- No browsers, so rc0 `b2tip` was not executed and the 1280/390/360 layout statements come from reading the CSS and the code.
- Read: `git diff a01faea..ddace62`, `src/ui/app.ts` (surrounding code), `src/ui/styles.css`, `src/ui/workers-ui.ts`, `art-ux/rc2-notes-b2-b3.md`.
