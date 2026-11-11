# Review: fix-rc2-b2-tired-tip-tabs @ 902f924 (a01faea..902f924)

Topic: B-2 amended spec (art-ux/rc2-notes-b2-b3.md §B-2 A-C). Recheck of review 5877e0f findings #1-#7. Reviewer: Code Reviewer. Static review only, no browser.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 1 |
| Minor | 3 |
| Nit | 3 |

Verdict: the code fixes for 5877e0f #2 (anchor getters), #3 (15 s cap), #5 (unit cases) and #7 (`closest('.body')`) are correct. #1 and #4 are only partly addressed. #1 is now logged and justified in a comment, but a never-shown tip still passes at three sizes. #4 covers the Manage tip's geometry and a forced re-render, but there is still no scroll or clip check. The new problem is behavioural. When a tip is deferred and then dropped (docked 1280x720/600, 1024x474, or the 15 s cap), the one-time FTUE flag is already spent and nothing records the drop (finding 1).

## Status of the 5877e0f findings

| # | Prior finding | Status |
|---|---|---|
| 1 | `mayDefer` lets a never-shown tip pass at 1280x720/600 | **Partly addressed.** The allowance stays, with a "measured" comment and a `why` log. Nothing asserts that the deferral is justified (finding 4). The product consequence is finding 1. |
| 2 | Legacy tips hold a detached anchor after the 250 ms re-render | **Fixed.** The hire and Manage tips take getters, re-resolved every tick (`app.ts:539`, `:571`, `:590`). rc0 forces a `#uRow` re-render and requires the Manage tip to survive. The old captured-element code would fail that step, so the test discriminates. |
| 3 | Hidden tip has no max defer | **Fixed in code** (`app.ts:538`). No test covers it (finding 2). |
| 4 | Clip wiring and Manage geometry untested | **Partly fixed.** Manage tip `tabOv`/`inVp` and the re-render are checked. There is still no scroll step, and nothing exercises `clip` (finding 2). |
| 5 | Surviving mutants | **Fixed.** Top margin, touching edges and the `COACH_MIN_TOP` boundary now have cases. See nit 5 for the small flaws. |
| 6 | `avoid` declared but unused | **Not changed** (finding 3). |
| 7 | Nits | `closest('.body')` done. |

## Findings

### 1. [Major] A deferred or dropped tip spends the one-time FTUE flag with no record, so the Manage tip is never taught at 1280x720
- `app.ts:584`: `flags.workersIntroB = true; saveFlags(); … onboardingStep(7,'workers_coach',{action:'shown'})` runs at hire time. The tip appears much later, or never.
- Two paths now lose the whole chain permanently:
  - **No clean spot.** The rc0 comment (`rc0-browser.mjs:97`) says the row is at 521..645 and the tabs at 459..503 at 1280x720. Below needs 645+8+68 = 721, which is more than 720-8, so it misses by 9 px. Above needs a top of 445, which is over the tabs. So at docked 1280x720 and 1280x600 the tired tip never shows. The Manage tip is created only from the tired tip's `onShow` (`app.ts:588`), so it never shows either. `introBStage` stays at 1 and `'done'` never fires. I could not verify these numbers because I did not run a browser and the repo has no artifact for them.
  - **15 s cap** (`app.ts:538`). The tired tip is created 50 ms after the hire. If the Workers sheet is not open and the row not on screen within 15 s, the tip is closed and its `onShow` never runs. Example: the player hires, closes the sheet and goes to the barn. They never see either tip.
- The flag is already saved, so neither tip ever comes back. Before this PR both tips showed regardless.
- 'shown' telemetry is now misleading: it fires for a tip the player never saw, and there is no 'deferred' or 'dropped' event, so the funnel reads as drop-off after step 7.
- 1280x720 is a headline desktop size. The spec (§B-2 B) does say to defer, but it says "defer to the next time the worker row is fully on screen". At 1280x720 that moment never comes, and now the 15 s cap also turns the deferral into a drop.
- Fix, either or both:
  - Set `workersIntroB` and stage 1 only in the tired tip's first `onShow` (or when it is dropped, set it and log `action:'dropped'`). Then a later hire gets another chance.
  - Ask Art & UX for a fallback at short docked heights. Examples: the tip beside the row, or the Manage tip shown on its own. Record the decision in rc2-notes.
  - At minimum add `{action:'deferred_dropped', reason}` telemetry.

### 2. [Minor] The new wiring has no test: 15 s cap, `clip`, and the one-shot `scrollIntoView`
- `app.ts:538` (cap), `:545` (`clip: uRow.closest('.body')…`) and `:547` (`centred`) are exercised by no unit test and no rc0 step. `coach()` is not unit-testable as written. rc0 samples for 7 s, so the cap never fires.
- The 5877e0f #4 fix asked for an rc0 step that scrolls `.sheet .body` so the row is under the sheet header or below the fold, and expects the tip hidden. That step is not there. If `clip` were dropped or pointed at the wrong element, nothing fails.
- Fix: add the scroll step to rc0 (phone size, scroll the body, expect `SNAP` null, scroll back, expect it to show). For the cap, expose the max-defer ms as a constant and assert closure with `debugAdvance` or a short override.

### 3. [Minor] Legacy tips (Manage, hire) get no `clip`, `avoid` is still unused, and rc0 omits the row-overlap check for them
- `app.ts:545`: `clip` is passed only when `rowId` is set, so the Manage and hire tips can show over the sheet header when their button is scrolled under it but still inside the viewport. `SafeOpts.avoid` (`coach-place.ts:10`) is still never passed.
- Spec B says "every tip" must clear the tabs and the worker name. The Manage tip sits 12 px above or below its button, so it can cover the worker name, bar or Energy label of its own row.
- `rc0-browser.mjs:98`: the Manage check pushes `bad` only for `tabOv>0 || !inVp`. It drops `rowOv`, `rowVis` and `sheet`, which the 5877e0f #4 fix said to apply "the same `bad` filter".
- Fix: pass `clip` for any anchor inside `uRow`, and pass the row's name and Energy-label rects as `avoid` for the Manage tip. Or drop `avoid` and state that only the tabs apply. Then extend the rc0 filter, or write down why the Manage tip may overlap its own row.

### 4. [Minor] `mayDefer` can still hide a real regression at the docked short sizes
- `rc0-browser.mjs:97,106`: for 1280x720, 1280x600 and 1024x474 (6 of the 12 runs), `!S.length` passes. A "never shows anywhere" regression is still caught at 1280x800, 390x640 and 360x740. Any over-strict check that only bites on a short docked screen is invisible, for example a larger margin or an over-tall tip.
- `why` is logged only when the tip never showed, and nothing asserts it. The "measured" claim lives in a comment.
- Fix: when `!S.length`, read the hidden `.coach` element's `offsetHeight` (it stays in the DOM, hidden, until the cap) and assert from `why` that both sides fail. Below must fail: `row.bottom+8+h > vh-8`. Above must fail: `row.top-8-h < tabsBottom` or `< 8`. Then a deferral that has a clean spot fails the test.

### 5. [Nit] Unit-test details
- `tests/rc2-b2-safe-coach.test.ts:85`: the first `COACH_MIN_TOP` assertion builds `box(100, 120 + 80, …)`, so the target top is 200 and it tests nothing about the boundary. The second assertion (top = 120, tip h 20) does kill `>=` to `>`. Delete or fix the first.
- `:79-82`: the title says "tip top == tab bottom" but only tip-bottom == tab-top is covered. Also `441 - 1 - 1` should be `439`.

### 6. [Nit] `coach()` signature
- `app.ts:530`: six positional arguments, with an `anchor` union (element or getter) and `rowId` that overrides it (`app.ts:540`). `let at` (`:536`) is hoisted but only used inside `place`. An options object would read better; the tired-tip call already has to pass `null, 3000, '', e.worker, fn`.

### 7. [Nit] rc0 small items
- `afterRerender` is computed but not in `info` (`rc0-browser.mjs:101`), so a pass or fail shows only through `bad`.
- The Manage sample is taken after the 7 s loop, then +600 ms for the re-render. The Manage tip ends about 9.5 s in the normal flow, so the margin is about 1.5 s. It is fine on a quiet box but could flake on a slow CI.

## Checked and fine
- `place()` before `close` is declared: the first `place()` runs after `close` is defined, so there is no TDZ. `close()` is idempotent; the click, the life timer and a drop can all call it.
- `workerRow` (`const`, `app.ts:558`) is only called inside `place`/getters at runtime, after mount. Goal tips use `rowId=null` and never touch it.
- Layout: `.coach` has `width:max-content`, `max-width:280px` (320 at ≥960), so `offsetWidth` is the final width even at `left:0` while hidden. `hw = ceil(w/2)+4`. At 360 and 390 the tip is ≤280 and `cx` clamps to `[hw, vw-hw]`, so `l ≥ 4`. At 1280 the tip centres on the row's bar inside the right panel and does not reach the farm view. The row is inside `.sheet .body`, so `closest('.body')` is correct and includes the tablist, which the `tabs` check already covers.
- Unit cases (top margin, touching edge, boundary): traced by hand, and each kills the mutant it targets (`M`→0 on top, `>`→`>=` in `hit`, `>=`→`>` on 120).
- Telemetry 'done' now fires from the Manage tip's actual show (`app.ts:591`).

## What I ran
- `git diff a01faea..902f924` and `5877e0f..902f924`, read in full; also `coach-place.ts`, the coach/Workers-intro code in `app.ts`, `styles.css` `.coach`, the unit tests and the rc0 `b2tip` section, and the 5877e0f review.
- **Not run:** `npx tsc --noEmit` and `npx vitest run … tests/rc2-b2-safe-coach.test.ts`. The harness denied the command in don't-ask mode, so there is **no typecheck or test result from this review**. Please run both on the branch.
- No browser or rc0 run, as instructed. The 1280x720 geometry in finding 1 comes from the commit's own comment, not from my measurement.
