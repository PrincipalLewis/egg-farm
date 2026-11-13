# Code review: fix-rc2-b2-tired-tip-tabs @ 4adec84

Range reviewed: `a01faea..4adec84` (worktree `/workspace/review-4adec84`, base `main`).
Topic: Manage tip anchored to its button inside the Upgrades panel (Art & UX Minor on 192f273) + CCR 47526b3 test minors.

The range contains the whole B-2 branch (about 20 commits: `src/ui/app.ts`, new `src/ui/coach-place.ts`, three new test files, `scripts/rc0-browser.mjs`).
I read the full diff. I concentrated on the last five commits (47526b3..4adec84): `managePlacement()`, its wiring in `coach()`, the rc0 `b2tip` and `b2rearm` changes, and the re-arm logic.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 2 |
| nit | 4 |

Verdict: no blocker. The change does what the Minor asked.
- The Manage tip is anchored 8px above the button (hand down), or else 8px below (hand up).
- It stays inside the Upgrades `.sheet`, under the tablist, and never on Market. It defers when no slot fits.
- Both minors are about the edge of the "inside the panel" rule and about tests that cannot fail.

## Findings

### 1. [minor] The Manage tip's "inside the panel" bounds use the whole sheet, not the scroller's visible area
- Where: `src/ui/app.ts:552-555` (`panel = uRow.closest('.sheet')`, and `coachClip()` is not passed to the manage branch); `src/ui/coach-place.ts:105-109` (`floor = max(panel.top, tabs…)`, `btn.top < panel.top`).
- Evidence:
  - The tablist sits inside `.body` (`app.ts:91`) and scrolls with the list. The `.sheet header` (title, phone close X, docked Manage-all button) sits above `.body` and is part of the `.sheet` rect.
  - When the list is scrolled, the tablist can be under or above the header. Its bottom is then only slightly below `panel.top`, so `floor` is that small number or `panel.top`.
  - The "above" slot can then extend into the header band. Example: phone 390x640, panel 160..640, header 160..216. After the list scrolls ~100px, the tablist is at ~132..176 and `floor`=176. The tip can be placed at y≥176 and cover the title and the Close button.
  - The button check is `btn.top >= panel.top`, not `>= body.top`. A Manage button half-clipped under the header (btn.top 200, body.top 216) is accepted. The tip is placed and points at a clipped button.
  - `p` is then non-null, so the `reveal` branch (which only runs when `p` is null) never fires.
  - The tired tip and legacy tips pass `clip` and are protected. The Manage branch is the only one that skips it.
- Impact: transient (6s) tip on the Close X or header, or pointing at a half-hidden button, when the player scrolls the Workers list while the tip is up. It is not the Market overlap the Minor was about, but the same "tip must sit on the right panel area" rule.
- Fix: pass `coachClip()` (the `.body` rect) to `managePlacement` as a second box. Use `max(body.top, tablist bottoms)` as the floor and `body.bottom` as the bottom limit. Require `btn` fully inside the body. Keep `panel` for the horizontal bounds. Add a unit case with a header band, e.g. panel 160..640, body 216..640, tablist scrolled to 132..176.

### 2. [minor] `managePlacement` tests would not catch several broken implementations
- Where: `tests/rc2-b2-manage-place.test.ts:33-36` ("8px viewport margin applies") and `:23-27`.
- Evidence (read by hand; I did not run mutants, since the worktree must stay unmodified):
  - Test "8px viewport margin" does not exercise the margin. Case 1 is decided by the panel floor (above top 84 < 160) and the below slot (212..280) is far from the edge. Case 2 returns null because the below slot overflows the viewport by 36px (676 vs 640) and above is under the tablist. Setting `M=0` in `coach-place.ts:108-109` leaves both passing.
  - There is no case where the tip right edge exceeds `panel.right` or `vp.w`. Dropping `b.right > Math.min(vp.w, panel.right)` keeps all 6 tests green. The "wider than panel" case only trips the left edge (cx 700).
  - There is no case with `btn.top < panel.top`. Dropping that guard is not caught.
  - The 8px side margin is enforced only by the caller's `cx` clamp (`app.ts:553`), not by `managePlacement`, so it is untested there. Doc at `coach-place.ts:99-100` says "inside the viewport (8px)".
- Impact: the exact things this fix is about (inside panel, 8px margins) rest on rc0 alone. The unit suite gives false confidence.
- Fix:
  - Add a bottom-margin case: panel and viewport bottom 640, tip height 68, and a button whose below slot ends at 636 (button bottom 560). It must be refused (636 > 632) even though it is inside the viewport.
  - Add a right-overflow case (cx 940 in the 620..1024 panel, tip 286 wide → right 1083).
  - Add a button-above-panel case.
  - Rename the "margin" test to what it asserts, or make it assert the margin.

### 3. [nit] The Manage tip can silently fall back to the energy bar
- Where: `app.ts:544`: `if (rowId && !at) at = row?.querySelector('.ebar') ?? null`.
- Evidence: this fallback exists for the tired tip, which passes `anchor=null`. The Manage tip also passes `rowId`. If its anchor getter returns null (button not rendered), `at` becomes `.ebar`. `managePlacement` then anchors 8px above or below the bar and the tip says "Tap Manage" while pointing at the bar. rc0's `points` check would fail in that case, but nothing in prod prevents it.
- Fix: apply the fallback only when `!o.manage`; with `o.manage` and no button, defer (`p=null`).

### 4. [nit] rc0 `MSNAP.inVp` is looser than the placement rule
- Where: `scripts/rc0-browser.mjs:92`.
- Evidence: `inVp` checks only `top>=0 && bottom<=innerHeight`. There is no left/right check and no 8px margin; `SNAP.inVp` (line 83) checks all four edges. `inUp` covers left/right only if the panel itself is inside the viewport. No check that the tip stays clear of the sheet header.
- Fix: reuse the four-edge test, assert 8px top/bottom margin, and add "no overlap with `#p-upgrades header`" (this would catch finding 1 in the browser).

### 5. [nit] Glue in `coach()` has no unit coverage
- Where: `app.ts:545-556` (cx clamp for `manage`, panel choice, `sheetOk`, `inVp`).
- Evidence: all new tests exercise the pure functions. Wiring errors (wrong panel element, clamp order) are caught only by rc0 `b2tip`, which I did not run (no browsers allowed here). Not a defect, but the 8px side margin and the panel clamp exist only in this uncovered glue.
- Fix: optional. Move the cx clamp into `managePlacement` (take the raw anchor centre) so it is covered by the pure tests, and see finding 2.

### 6. [nit] `visitIv` never stops for saves without `tiredWorker`
- Where: `app.ts:628`.
- Evidence: the interval clears only when `tiredSeen && manageSeen`. Players who finished the old Part B (`workersIntroB` true, no `tiredWorker`/`tiredSeen`) get a 250ms interval for the whole session, each tick running `startTiredVisit()`, which returns at once. Harmless cost, but "nothing left to teach" is not true for them.
- Fix: also stop when `flags.workersIntroB && !flags.tiredWorker`.

## What I checked and found OK
- `managePlacement` logic against the 6 documented geometries (1024x474 docked: above at 336..404; 8px below fallback; defer when neither fits; touching tab edge OK, 1px in not OK; phone sheet). All 6 tests pass and the math matches `ROW_GAP=8`.
- Hand direction: `p.side==='above'` → `ui-pointer-hand-down.svg`; `below` class toggled → `handup` animation. rc0 `points` checks bottom = btn.top−8 or top = btn.bottom+8 (±1.5), while code uses `Math.round(p.top)` (≤0.5px). Consistent.
- Market exclusion: in the docked layout the Upgrades `.sheet` is its own grid row (`styles.css:156-161`), so "inside the `.sheet` rect" excludes Market. On phones Market is `hidden`.
- Layout, from CSS and arithmetic only (no browser):
  - 1280: `.coach` max-width 320 (`styles.css:254`); docked panel is 400 wide. The cx clamp keeps the tip in the panel.
  - 390 and 360: max-width 280, `width:max-content`, so the width does not depend on `left` and there is no wrap feedback loop with the `translateX(-50%)` clamp.
  - 360: the 3-line "full energy" variant ("…when their energy drops.") may be ~94px tall, not the 68px the tests assume. The function uses the measured `offsetHeight`, so it falls back to "below" or defers. That is correct, but the unit tests never use a tall tip for `managePlacement`.
  - "Above Manage" necessarily covers the row's name, Energy bar and label, since the button is the last grid item (`workers-ui.ts:70-73`). That is what Art & UX asked for. The Manage tip text does not depend on them.
- Re-arm flow: `visitActive`, `tiredPending`, `manageShown`, `manageSeen` interplay (including skip → Manage alone, deferral drop → `manageShown` reset, double timer guarded by `manageShown`). No race found beyond a ≤200ms window.
- rc0 `b2rearm` after 4adec84: the repeat check now really visits the Workers tab (2.5s after click, longer than the 300ms re-arm delay plus slide-in). The positive control clears `manageSeen` and expects the tip within 5s with the same steps, so `repeat` can fail. The `waitForFunction(...).catch(()=>{})` swallow is backstopped by `f1.tiredSeen===true`.
- Old `coach(text, at, ms, cls)` signature: all 4 call sites updated (`app.ts:583, 598, 613, 620`). `tests/onboarding.test.ts` passes.
- Scope: the range includes the earlier B-2 commits (rule D auto-scroll, persisted `manageSeen`, goal-intro telemetry moved to `onShow`). These are in the same branch and consistent with their commit messages. One behaviour change: a legacy tip with a missing or zero-size anchor used to show centred; it now defers 15s then drops. Fine.

## What I ran
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-b2-manage-place.test.ts tests/rc2-b2-rule-d-step.test.ts tests/rc2-b2-safe-coach.test.ts`: 3 files, 43 tests, all pass.
- `npx vitest run … tests/onboarding.test.ts`: 13 pass.
- `npx tsc --noEmit`: NOT run. The sandbox denied the command ("don't ask" mode) each time I tried (three attempts, including `-p .`). Type correctness is unverified by me; Engineering should confirm it.
- Not run: `scripts/rc0-browser.mjs` (browsers not allowed), so `b2tip` and `b2rearm` results and the 360/390/1280 geometry are from reading only.
- The worktree was not modified.
