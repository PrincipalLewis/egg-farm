# Code review: fix-rc2-b2-tired-tip-tabs @ 47526b3 (base main a01faea), recheck of 4d3cc77 #1-#2

Topic: B-2 rule D. Do 143d0e4 and 47526b3 fix findings #1 and #2 of `fix-rc2-b2-tired-tip-tabs-4d3cc77.md`?
Delta reviewed: `4d3cc77..47526b3` in detail (`src/ui/app.ts`, `src/ui/coach-place.ts`, `scripts/rc0-browser.mjs`, `tests/rc2-b2-rule-d-step.test.ts`, `tests/rc2-b2-safe-coach.test.ts`). I also read the full `a01faea..47526b3` diff. Worktree `/workspace/review-47526b3` was not modified.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 0 |
| Minor | 2 |
| Nit | 3 |

Verdict: both findings are addressed.
- 4d3cc77 #1 (Major, no test for the rule D wiring) is fixed. The remaining gap is lower in severity and is listed as F1 and F2 below.
- 4d3cc77 #2 (four open ddace62 items) is fixed. #7 and #9 are fixed. #10 is fixed except for one test that cannot fail (F3). #6 is the same item as #1.
- I found no regression and no new correctness bug in `app.ts`.
- `tsc --noEmit` could not be run (see "What I ran").

### Status of the 4d3cc77 findings

| # | Sev. then | Status | Where / how |
|---|---|---|---|
| 1 | Major | Fixed. Residual gaps in F1 and F2. | `coachStep()`, `manageRearm()`, `isUserScrollKey()` and `GUARD_EVENTS` are now pure (`coach-place.ts:76-97`) and table-tested (10 tests in `rc2-b2-rule-d-step.test.ts`). New rc0 `b2rearm`. Phone open delay now varies by size. |
| 2 | Minor | Fixed | #7 `app.ts:579` logs step 5 from `onShow`. #9 `app.ts:547` uses `COACH_MARGIN` (8) instead of 4. #10 both touching edges and the clipped-row no-fit case have tests. |

## Findings

### 1. [Minor] rc0 `b2rearm`: the "no repeat after reload" half cannot fail
`scripts/rc0-browser.mjs:131-133, 135`; `src/ui/app.ts:171, 625`.

Evidence:
- After `page.reload()` the script opens Upgrades and waits 2.5s. `tab` is a plain `let`, initially `'collection'`, and nothing restores it from storage (only the `worker_hire` handler, `iaOpen` and a few clicks set it to `'workers'`).
- So the Workers list is never visible after the reload. The visit watcher needs `tab === 'workers'` (`app.ts:625`) and never fires.
- `repeat` is therefore false even if `manageSeen` were not persisted or not read back. I did not run it. This follows from the code.
- The persistence itself is only checked by `f1.manageSeen === true`, which reads `localStorage` before the reload. That does kill a missing `saveFlags()`. It does not prove the next session honours the flag.
- `goneWhileClosed` is also always true. The sheet is closed, so no tip can be visible regardless of whether the tip was dropped.
- `waitForFunction(...).catch(() => {})` swallows a missing tired tip. The test then fails later through `f1.tiredSeen`, so it is not wrong, only hard to read.

Impact: the mutant "ignore `manageSeen` when loading flags" passes `b2rearm`. The re-arm half is fine: if `manageRearm` is removed, `shownAgain` is false.

Fix: after the reload click the Workers tab before the 2.5s wait, e.g. `await page.evaluate(() => document.querySelector('[data-tab=workers]').click())`. Check that the tab really shows (`#uRow [data-w]` visible) before asserting `!repeat`.

### 2. [Minor] The `app.ts` glue is still untested by vitest, and rc0 is not run by CI
`src/ui/app.ts:556-558` (geo / `settled` / `delta` gating), `:576` (`GUARD_EVENTS` loop), `:579` (goal intro `onShow`), `:627` (re-arm call). `.github/workflows/ci.yml` runs `npm test` and the globals check only.

Evidence: the pure decisions are now covered, but these mutants still pass the whole vitest suite:
- `settled` forced to `true`, or `lastGeo` never updated.
- `delta` passed as a constant, or not gated on `guardOk`/`!scrolledAt`.
- The `manageRearm(...)` call deleted from the watcher.
- The `GUARD_EVENTS` loop deleted, or changed to listen on other events. The test only asserts that the constant equals `['touchmove','wheel']`; it does not show the app uses it.
- `showGoalIntro` logging step 5 again at call time.

rc0 would catch the first two (a tick usually lands inside the 240ms phone slide-in, and a skipped tip fails the `seen === true` assertion) and the re-arm call (`shownAgain`). It would not catch the `GUARD_EVENTS` loop (the `guard` case dispatches its own `WheelEvent`, which would still exercise a loop left in place, but nothing covers `touchmove` or the key and `scroll` listeners) or the step 5 timing. rc0 needs Chrome, `build:qa` and about 40s per run, and is manual only.

Impact: low. The risky logic is in the tested pure functions, and a future refactor of the glue is caught only if someone runs rc0.

Fix (any one is enough):
- Extract `isSettled(geo, lastGeo)` and the `delta` gating into `coach-place.ts` and table-test them.
- Add a one-line note in the rc2 notes that rule D wiring is verified by rc0 `b2tip`/`b2rearm` only, run before each release.

### 3. [Nit] New "touching edges" case `s3` cannot fail
`tests/rc2-b2-safe-coach.test.ts:84`.

`s3` uses `runM`, which tries the below candidate (372..440) first. The tab sits at 220..300, nowhere near the tip, so `below` is returned whatever the `hit()` edge rule is. The comment "tab bottom == row top: touching" describes an adjacency that the tip never reaches. The second edge (tip top == tab bottom) is therefore still unasserted. Nothing breaks, because the single `hit()` expression is already pinned by the first assertion (tip bottom == tab top).

Fix: make below impossible and put a tab bottom exactly on the above candidate's top. For example `scene({ w: 390, h: 400 }, [box(0, 180, 390, 44)], 300, 8, 374)` gives `runM` an above candidate with top 224 against a tab bottom of 224, and below (372..440) does not fit. Expect `{ side: 'above', top: 224 }`.

### 4. [Nit] "Varied phone open phase" is two fixed offsets, not a variation
`scripts/rc0-browser.mjs:103`.

`1500 + (w * 7 + h) % 3 * 120` evaluates to 1620ms for 390x640 and 1740ms for 360x740. The phase is fixed per size, and the 100ms poll loop and click latency add a near-constant offset. It is a sensible change, and it hardly matters because a 250ms tick against a 240ms slide almost always lands mid-slide. It just does not match the commit message ("varied"). Optional fix: read an env phase (`B2_PHASE`) or run each phone size at three offsets (0, 80, 160ms).

### 5. [Nit] Two small behaviour changes have no test
- `app.ts:579`: goal-intro step 5 is now logged only when the tip actually shows. If it is deferred past 15s it is dropped and step 5 is never logged. It can also log after step 6 (hire tip) if the goal tip was delayed. This is the intended fix for ddace62 #7, but nothing asserts it, and no note says the onboarding funnel can now skip step 5. Add a one-line mention in the rc2 notes or a small rc0 check on the telemetry log.
- `app.ts:547`: the 8px side margin is inline in `place()`, so no unit test pins it. `safeCoachPlacement` only rejects `l < 0` or `r > vp.w`. A pure `clampCx(center, tipW, vpW)` in `coach-place.ts` would let the margin be tested.

## Checked and fine
- **Refactor equivalence** (`4d3cc77..47526b3`, `app.ts:554-562` vs the removed inline block). `coachStep` reproduces the old logic branch for branch.
  - Old gate `autoScroll && sheetOk && rr.height && clip && !shown && (settled || scrolledAt)` is now `ready && autoScroll`, then `scrolledAt` first, then `!settled` -> wait.
  - First attempt: `d === null` or guard blocked -> skip, otherwise scroll. Same as before.
  - After a scroll: the 800ms settle then skip is preserved. `SCROLL_SETTLE_MS` is 800 and the boundary is tested on both sides (`now - scrolledAt > 800`).
  - `reveal` branch conditions are unchanged: `!shown`, sheet ok, row laid out, clip present, `rowCut`, `!revealed`, guard ok. `rowCut` is computed the same way.
  - `delta` is computed only when it can matter. When it is null because of `!settled`, `coachStep` waits first, so the null never turns into a skip.
- **`delta === 0`.** `autoScrollDelta` returns 0 when no scroll is needed, so `{act:'scroll', d:0}` records `scrolledAt` without scrolling. After 800ms of no fit it skips. This is the same behaviour as before.
- **Re-arm wiring** (`app.ts:624-627`). `startTiredVisit` returns early (tired already seen, or pending) without setting `visitActive`, so the watcher keeps evaluating `manageRearm` each tick until it sets `visitActive = true`. A second `showManage` call is blocked by `manageShown`. `onClose` resets `manageShown` only when `!manageSeen`, so a dropped (15s defer) Manage tip re-arms on the next visit. `tiredPending` blocks re-arm while the tired tip is alive, so the 3.1s Manage timer and a re-arm timer cannot both create a coach.
- **`b2rearm` timing** (the part that does work). The Manage coach is created at about +3.1s after the tired tip shows, with the sheet closed. It is dropped at `born + 15s` = about +18.1s. The script waits 19.5s, so a stale deferred Manage tip cannot be what shows later. `shownAgain` therefore proves the re-arm.
- **47526b3** (nav through `element.click()`). `nav` has one delegated handler on `closest('button')` (`app.ts:169`), so a synthetic click behaves like a tap. At 390x640 the open sheet covers `[data-nav=farm]`, which is why the real click failed. The remaining `locator(...).click()` calls for the nav run only in 1280-wide modes or with the sheet closed, where the nav is reachable.
- **Layout.** No CSS or `coach-place.ts` placement code changed in this delta.
  - The side margin goes from 4px to 8px. `.coach` is `width:max-content`, so measured `offsetWidth` at `left:0` equals the width after placement and there is no wrap or oscillation.
  - 360 wide: tip at most 280px, so `hw` = 148 and `cx` stays in [148, 212]. The tip clears both edges by 8px.
  - 390 wide: `cx` in [148, 242]. 1280: tip at most 320px, so `hw` = 168. The docked panel centres are far from the edges, so no clamp.
  - Row-mode tips (tired, Manage) are anchored to the row and `cx` only moves them horizontally. `safeCoachPlacement` still checks the whole tip box against the tablist and the row. Vertical placement is unchanged.
  - I could not check any of this in a browser.
- **Scope.** All files are on topic. The range contains earlier B-2 commits that were reviewed already.

## What I ran
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-b2-rule-d-step.test.ts tests/rc2-b2-safe-coach.test.ts`: 2 files, 37 tests (10 + 27), all passed. A first attempt that chained this with `tsc` was denied; the standalone vitest command ran.
- `npx tsc --noEmit`: not run. The Bash tool denied it (don't-ask mode) both times I tried, in a chained and a standalone call. This is the same limit as in the earlier B-2 reviews, so typecheck status is unknown. Please run it locally or in CI before merge.
- No browsers, so rc0 `b2tip` and `b2rearm` were not executed, and the author's results are unverified.
- Read: `git diff a01faea..47526b3` (focus on `4d3cc77..47526b3`), `src/ui/app.ts` 150-175, 520-640, `src/ui/coach-place.ts`, `src/ui/styles.css` 250-254, `scripts/rc0-browser.mjs` 1-40, 60-140, 573, both test files, `.github/workflows/ci.yml`, and the earlier review `fix-rc2-b2-tired-tip-tabs-4d3cc77.md`.
