# Code review: fix-rc2-b2-tired-tip-tabs, a01faea..fdc8f7a

Topic: Manage tip anchored to its button inside the Upgrades scroller (Art & UX Minor on 192f273). Recheck of CCR 4adec84 #1.
Reviewer: Code Reviewer. Worktree `/workspace/review-fdc8f7a` was not modified.

## Verdict

The CCR 4adec84 #1 fix is correct. It changes only `src/ui/app.ts` (one commit, +3/-1). The Manage tip's bounds are now the sheet rect intersected with the `.body` scroller rect. `.body` sits below the `<header>` in the DOM, so the tip can no longer land on the sheet header.

Nothing guards the fix, though. Reverting to the old `panel = sheet rect` input would still pass every unit test and every rc0 assertion (finding 1).

I could not run vitest or tsc: the sandbox denied `npx` (see "What I ran"). The conclusions below come from reading the code.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 1 |
| minor | 1 |
| nit | 2 |

## Findings

### 1. [major] The header-exclusion fix has no test that could fail
`src/ui/app.ts:552-554` (the fix), `tests/rc2-b2-manage-place.test.ts:7`, `scripts/rc0-browser.mjs` (MSNAP, `inUp` check)

Evidence:
- fdc8f7a touches only `app.ts`. The panel box is built inline from two DOM rects and passed to `managePlacement`. Nothing unit-tests that construction.
- `managePlacement` is tested only with `panel` set to the whole-sheet box (`panel = box(620,237,404,237)`). The header band is part of that box, so no test fails when the tip lands in the header.
- The rc0 MSNAP check still tests `inUp` against `#p-upgrades` (`up = R(document.querySelector('#p-upgrades'))`). That is the sheet rect, including the header, which is the exact box the review said was wrong. A tip drawn over the header passes `inUp`.
- A mutant that restores `const panel = sh` (or drops the `bd` intersection) passes all of the following:
  - `tests/rc2-b2-manage-place.test.ts`
  - `tests/rc2-b2-safe-coach.test.ts`
  - `tests/rc2-b2-rule-d-step.test.ts`
  - rc0 `b2tip` and `b2rearm`

Impact: the regression CCR 4adec84 #1 flagged can return unnoticed. Only a screenshot reviewer would catch it.

Fix:
1. Extract the intersection as a pure helper, e.g. `scrollerPanel(sheet: Box, body: Box): Box`, in `coach-place.ts`. Unit-test it with a sheet that includes a 56px header band. Assert that a Manage button just below the header gets `side:'below'` or null, and never a `top` inside the header band.
2. In rc0 MSNAP, assert `b.top >= body.top - 0.5` and `b.bottom <= body.bottom + 0.5`, with `body = R(document.querySelector('#uRow').closest('.body'))`. Also assert no overlap with `#p-upgrades header`. Do this at 1280x720, 1280x600 and 1024x474, where the header band is closest to the tip.

### 2. [minor] Manage-placement unit fixtures don't match the real DOM
`tests/rc2-b2-manage-place.test.ts:6-7, 34`

Evidence:
- The comment says "measured 1024x474": Upgrades sheet y 237..474, tabs 274..318. The header is `height:56px` (`styles.css:105`), so `.body` starts at about 293 plus the 2px border.
- The tabs at 274 would therefore sit inside the header. The fixture is internally inconsistent, or it was measured before the `.body` rect became the input.
- `pp = box(0,160,390,480)` for the phone is also a sheet box. It carries no header or body split.
- The tests exercise a `panel` shape the app no longer passes.

Impact: the tests give false confidence about 1024x474, the tightest case. They pass `panel` as the sheet, while production passes the body ∩ sheet box.

Fix: re-derive the fixtures from real rects, as `{panel: body∩sheet, tabs, btn}`. Put the tabs inside the body, and keep a separate header box in the "never in header" assertion from finding 1.

### 3. [nit] Panel construction is inline and untested, and the cx clamp order is implicit
`src/ui/app.ts:552-556`

Evidence:
- `cx = Math.min(Math.max(cx, left + w/2 + 8), right - w/2 - 8)`. If the panel is narrower than `tip.w + 16`, the `min` wins and `l` falls below `panel.left`. `managePlacement` then returns null (defers), which is safe but accidental.
- Today only a narrow docked layout could trigger it. The 400px right column and `max-width:320px` leave room.

Impact: none today. It is a latent surprise if the column or tip width changes.

Fix: fold the clamp and the panel intersection into the same pure helper as finding 1, with a test for "panel narrower than tip → null".

### 4. [nit] The Manage tip has no settle check while the phone sheet slides in
`src/ui/app.ts:549-559`, `styles.css:102`

Evidence:
- The tired tip decides on two identical ticks (`settled`). The Manage tip does not.
- The sheet is `transform: translateY(100%)` with `transition: transform var(--t-med)`.
- `inVp(r)` defers while the button is still below the viewport. A mostly-risen sheet can still show the tip a few px off. The 250ms tick corrects it, but the 6s life starts at the first show.

Impact: at most a one-tick (≤250ms) visual offset on a Workers-tab visit at 360/390. This is not a layout failure.

Fix (optional): reuse `lastGeo`/`settled` for the Manage path, or require two identical `panel` rects before the first show.

## Layout check (static)

I only did this by reading the code and CSS, since browsers were not to be run.

- **360x740 and 390x640:** the sheet is 75dvh, full width below 600px. `.coach` has `max-width:280px` and `width:max-content`. cx is clamped to `body ± (w/2 + 8)`, so the tip fits inside the 360px sheet. The vertical bounds are body top to body bottom (≤ vp-8). Above-first placement keeps it under the tablist via `floor`. Below-fallback is bounded by the body bottom.
- **1280x720 and 1280x600 (docked):** the Upgrades sheet is the lower half of the 400px column. The body now starts under the 56px header (the fix). The tip is clipped to 400px wide and needs a ≥ 68px slot above or below the button inside the body. If neither side fits, it defers for up to 15s and is dropped. `onClose` resets `manageShown` and the visit watcher re-arms it.
- **1024x474:** the Upgrades panel is about 237px tall, with header, tablist and Manage button all in it. Placement is tight, and deferral or skip is the expected outcome in many scroll positions. The rc0 `b2tip` expectations treat this size as skip-tired / Manage-alone. They don't prove that Manage can actually show at this size once the header is subtracted from the panel height. I can't confirm this statically, and it needs a browser run after the fix. The first rc0 `b2tip` run for 1024x474 will tell.

## Regressions and scope

- **Regressions:** none found in the new code. The branch also carries earlier B-2 work (tired-tip rule A-D, `coachStep`, flags). That is unchanged since the previous reviews apart from fdc8f7a. The only behaviour change in this recheck is that the Manage tip has fewer legal slots, so it defers or drops more often, never less.
- **Scope:** fdc8f7a is minimal and on topic. It adds no unrelated edits.

## What I ran

- `git log`, `git diff a01faea..fdc8f7a`, `git show fdc8f7a`, and reads of `src/ui/app.ts`, `src/ui/coach-place.ts`, `src/ui/styles.css`, `scripts/rc0-browser.mjs` and `tests/rc2-b2-manage-place.test.ts`.
- **Not run:** `npx tsc --noEmit` and `npx vitest run --pool=forks … tests/rc2-b2-*.test.ts`. Both commands were denied by the sandbox permission mode ("don't ask" mode), so I made no attempt to work around it. I have no pass or fail result for typecheck or tests. The code is typed in a straightforward way, and fdc8f7a adds only a typed object literal. Please run those two commands before merging.
- No browser was run, as instructed.
