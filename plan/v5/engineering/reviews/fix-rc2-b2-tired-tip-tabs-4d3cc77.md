# Code review: fix-rc2-b2-tired-tip-tabs @ 4d3cc77 (base main a01faea), recheck of ddace62 #1-#11

Topic: B-2 rule D. Does 4d3cc77 fix the eleven findings of `fix-rc2-b2-tired-tip-tabs-ddace62.md`?
Files in the delta ddace62..4d3cc77: `src/ui/app.ts`, `scripts/rc0-browser.mjs`. `src/ui/coach-place.ts` and `tests/rc2-b2-safe-coach.test.ts` are unchanged. Worktree `/workspace/review-4d3cc77` was not modified.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 1 |
| Minor | 1 |
| Nit | 2 |

Verdict: the code changes fix #1, #2, #3, #4, #5, #8 and #11 as far as I can tell from reading. I found no regression and no new correctness bug in `app.ts`. The remaining Major is test adequacy. All of the new behaviour is inline in `app.ts` and not covered by vitest, so a broken implementation still passes the whole suite. The browser checks (rc0) cover only #1 and a weak form of #2. I could not run rc0, so the author's browser results are unverified.

### Status of ddace62 findings

| # | Sev. then | Status | Where / how |
|---|---|---|---|
| 1 | Major | Fixed | `app.ts:581-585`. Only `wheel`, `touchmove`, scroll keys (not from a `button`) and non-programmatic `scroll` arm the guard. The Hire tap and Enter no longer do. rc0 `click` case added. |
| 2 | Major | Fixed (see F1 for test weakness) | `app.ts:556-559`. The decision needs two ticks (250ms apart) with identical rounded `rr.top,clip.top,clip.bottom`. |
| 3 | Major | Fixed | `manageSeen` persisted. The visit watcher re-arms `showManage` on later visits while `tiredSeen && !manageSeen && !tiredPending` (`app.ts:629-631`). |
| 4 | Minor | Fixed | `showManage` returns early on `flags.manageSeen`, and 'done' fires once. |
| 5 | Minor | Fixed | `reveal` branch now has `&& !shown` (`app.ts:564`). |
| 6 | Minor | Not fixed | Tests unchanged. See F1. |
| 7 | Minor | Not addressed | See F2. |
| 8 | Minor | Fixed | The watcher clears itself when `tiredSeen && manageSeen` (`app.ts:627`). |
| 9 | Nit | Not addressed | See F2. |
| 10 | Nit | Not addressed | See F2. |
| 11 | Nit | Fixed | `let closed` is now declared before `close` (`app.ts:572`). |

## Findings

### 1. [Major] The new rule D wiring (settled-geometry gate, scroll-gesture guard, Manage persistence and re-arm, `!shown` reveal, watcher stop) has no vitest coverage, and rc0 would not catch most regressions
`src/ui/app.ts:556-559, 564, 581-585, 611-615, 627-631`; `scripts/rc0-browser.mjs:86, 93, 107`; `tests/rc2-b2-safe-coach.test.ts` (unchanged, 27 tests, all pass).

Evidence (mutants that still pass `vitest`, so the 27 pure-helper tests tell you nothing about them):
- Delete the `settled` gate: passes.
- Put `pointerdown` back in the guard events: passes.
- Remove the re-arm in the visit watcher (the #3 fix): passes.
- Make `manageSeen` session-only (the #4 fix): passes.
- Remove `&& !shown` from the reveal branch (the #5 fix): passes.
- Never clear `visitIv` (the #8 fix): passes.

What rc0 covers:
- The `click` case (1280x720 and 1280x600) does kill the #1 regression, because a real Playwright click raises `pointerdown`.
- There is no rc0 case for #3 or #4:
  - tired tip shown, sheet closed before +3.1s, Manage must appear on the next Workers visit;
  - `manageSeen` surviving a reload;
  - 'done' firing once.
- #5 (reveal after show) has no rc0 case.
- #2: the new `phoneScrolled` assertion (`rc0:107`) only runs in `direct` mode on phones, and reads `scrollTop` once at the end. The direct-mode script opens the sheet at a fixed `t0 + 1500ms + click latency`, and the coach ticks every 250ms from creation. The phase between tick and open is therefore nearly constant from run to run. Whether a tick lands mid slide-in, and whether `autoScrollDelta` returns non-null for it, depends on that fixed phase. A missing `settled` gate may never be hit. I think the assertion is a weak guard for #2. This is an inference from the timing, not something I ran.
- The `guard` case uses a synthetic `WheelEvent`, which is fine for `wheel`. `touchmove`, the `scroll` listener (including the `autoScrollingUntil` exclusion) and the keydown filter have no test at all.

Impact: the ddace62 review (#6) already flagged this and recommended extracting the per-tip decision into a pure function. This commit added more inline state (`lastGeo`, `settled`, `manageSeen`, re-arm) and left it untested. Any later refactor can silently undo #1-#5 and #8 without a red test. rc0 needs Chrome and is not part of `vitest`.

Fix:
- Extract two pure helpers into `coach-place.ts` and table-test them.
  - `coachStep({settled, scrolledAt, guardOk, delta, shown, ...}) -> 'wait' | 'scroll' | 'skip' | 'reveal'`.
  - `manageRearm({tiredSeen, manageSeen, tiredPending, worker}) -> boolean`.
- Extract the guard key filter as `isUserScrollKey(key, targetIsButton)` and test it.
- Add rc0 cases for "tired shown, close the sheet at +1s, reopen, Manage appears and `manageSeen` persists after reload".
- For #2, vary the open delay in the phone case (for example 1500, 1620 and 1740ms) so the phase is not fixed.

### 2. [Minor] Four ddace62 items are neither fixed nor answered
The commit message lists #1-#5, #8 and #11. Nothing says why #6, #7, #9 and #10 were skipped, and no notes file records a deferral.
- #7 is the only one with behaviour impact. `coach()` now hides a goal-intro tip until `safeCoachPlacement` finds a spot, and drops it after 15s. `showGoalIntro` still logs onboarding step 5 (`app.ts:~582`) whether or not the tip ever showed.
- #9: the horizontal margin is 4px, not the 8px in the doc comment.
- #10: the two unit-test gaps remain (the "touching edges" test only asserts one of the two edges, and the `row.top < clip.top` no-fit case is untested).

Fix: either fix them, or record "accepted/deferred, reason" in the rc2 notes so the next recheck does not reopen them. For #7, moving step 5 into the tip's `onShow` is a small change.

### 3. [Nit] Dead state and a doubled trailing comment
`src/ui/app.ts:611-614`.
- `introBStage` is now only written and never read (`onClose` used to read it). The existing `void introBStage` hides the unused warning.
- The long `coach(...)` line ends with two comments: `// persisted: shown once ever (...) // 'done' only once it actually showed`. Move them to the line above, or drop the second.

### 4. [Nit] Guard marks on any `touchmove` and on arrow/space keys that don't scroll anything
`src/ui/app.ts:582-585`.
- `touchmove` arms the guard regardless of distance. Chrome on Android suppresses it inside the slop region, but iOS Safari, as far as I recall, can fire it for a sub-pixel finger drift during a tap on Hire. If so, a tap with a little drift counts as a scroll and a visit that needs a scroll is skipped. This is plausible but unverified (no browser). Impact is low, because phones rarely need the auto-scroll.
- The scroll-key `keydown` handler is already covered by the `scroll` listener when a scroll actually happens. It only adds a guard mark when the panel is already at its end.
- Fix if wanted: only mark on `touchmove` after, say, 8px of movement from `touchstart`, or rely on the `scroll` event alone.

## Checked and fine
- `settled` logic (`app.ts:556-559`): `lastGeo` is only written in the `!p` branch, and auto-scroll needs `!shown`. A stale `lastGeo` from before a shown tip therefore cannot be reused. With a 240ms slide and a 250ms tick, two consecutive ticks cannot be equal before the sheet stops. The only exception is a tick within a few ms of the transition start, which is negligible. At docked 1280 the decision comes one tick (250ms) later, which is harmless. The 15s defer cap bounds a geometry that never settles; in that case the tip is dropped without counting a skip.
- `reveal` is not affected by the slide-in: both `rr` and `clip` are translated together, so the relative comparison is invariant.
- Guard filter: the Hire button is a `button.btn`, and the tab buttons are `button[role=tab]`. Enter, Space on the button and tab arrows do not arm the guard. Real scrolling is caught by `scroll`, with programmatic scrolls excluded through `autoScrollingUntil`.
- Re-arm race: `tiredPending` stays true while the tired tip is alive, so a new visit within its 3s life cannot start a Manage coach that replaces it with `coach()`'s `.coach` cleanup. `visitActive` is set to true on re-arm, so there is one `showManage` per visit. A pending (hidden) Manage coach keeps `manageShown = true`, so a second one is not created. If it is dropped by expiry or removed, `onClose` resets `manageShown` and the next visit re-arms.
- No saves are affected by the new `manageSeen` flag: `tiredSeen`, `tiredSkips` and `tiredWorker` are not on main (`git grep` at a01faea finds none), so there is no upgrade path with a stale `tiredSeen` and no `manageSeen`.
- The watcher clearing: `flags.tiredSeen && flags.manageSeen` is permanent, so stopping the interval is safe. `visitIv` is used inside its own callback only after assignment.
- `let closed` before `close` and `iv`: `place()` is called after all three are declared. `skip` references `close` only when `place` runs.
- Layout at 360, 390 and 1280: `coach-place.ts` and `.coach` CSS are unchanged by this delta. Tip width clamps (`hw` up to 164 incl. the +4, `cx` clamped into the viewport) behave as in ddace62, so nothing here can change placement at those widths. The one new layout-affecting thing is the settle delay, which only postpones a decision. The phone assertion `phoneScrolled` expects no scroll at 390x640 and 360x740 in `direct` mode. I could not verify that in a browser.
- Scope: `rc0-browser.mjs` and `app.ts` only, all on topic.

## What I ran
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-b2-safe-coach.test.ts`: 1 file, 27 tests, all passed.
- `npx tsc --noEmit`: not run. The Bash tool denied it three times in this session (twice again at the end), so typecheck status is unknown. This is the same limit as in the ddace62 review. Please run it in CI or locally before merge.
- No browsers, so rc0 `b2tip` (including the new `click` cases and the `phoneScrolled` check) was not executed.
- Read: `git diff a01faea..4d3cc77` (focus on `git diff ddace62..4d3cc77`), `src/ui/app.ts` 518-660, `src/ui/coach-place.ts`, `scripts/rc0-browser.mjs` 60-125, the previous review `fix-rc2-b2-tired-tip-tabs-ddace62.md`, and `git grep` of the flags on a01faea.
