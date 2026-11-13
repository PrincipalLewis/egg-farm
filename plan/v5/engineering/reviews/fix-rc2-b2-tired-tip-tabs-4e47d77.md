# Code review: fix-rc2-b2-tired-tip-tabs @ 4e47d77

Range a01faea..4e47d77 (worktree /workspace/review-4e47d77, base main a01faea).
Topic: Manage tip anchor. This is the recheck of CCR fdc8f7a #1/#2 (`scrollerPanel`, header tests) and the still-button first show added in 4e47d77.
Files in range: `src/ui/app.ts`, `src/ui/coach-place.ts`, `scripts/rc0-browser.mjs`, `tests/rc2-b2-{manage-place,rule-d-step,safe-coach}.test.ts`.
I read the whole range. The detailed review covers 4adec84..4e47d77, which holds the fdc8f7a follow-ups and 4e47d77. The earlier B-2 commits were read for context only.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 3 |
| nit | 2 |

Verdict: the behaviour is correct and fdc8f7a #1/#2 are resolved in the code. The remaining findings are about test strength and one undocumented timing change. Nothing blocks merge.

## What I checked, and what held up

- **`scrollerPanel` bounds are correct for every real layout.** The DOM is `.sheet#p-upgrades > header + .body > (.tabs[role=tablist] + #uRow)` (`src/ui/app.ts:90-96`). Header is `flex:none` 56px and `.body` is the `flex:1; overflow:auto` scroller (`styles.css:105-107`). So `.body` never overlaps the header. `managePlacement` requires the button and the tip to lie inside `[panel.top, panel.bottom]`, so the tip cannot land in the header band. Docked (`styles.css:159-161`) the sheet is a static grid row, and the same relationship holds.
- **Floor and tabs.** The tabs live inside `.body`. When they have scrolled out above, `floor` falls back to `panel.top` (= `body.top`). When they are partly clipped, `floor = tab.bottom`. Both are right.
- **Phone widths (360x740, 390x640).** `.sheet` spans the full width (<600px). The cx clamp `panel.left + tip.w/2 + 8 .. panel.right - tip.w/2 - 8` gives about 148..212 at 360 for a tip of at most 280px. Button centres fit. If the tip were ever wider than the panel, the clamp inverts and `managePlacement` returns null (defer). That is safe.
- **1280 docked.** Panel is 400 wide, tip max-width 320 (`styles.css:254`). The `.body` rect includes the scrollbar, but the 8px clamp keeps the tip off it for a centred button.
- **Still gate trace (`app.ts:556-559`).**
  - `lastBtnTop` is updated on every tick, including ticks where the button is not in view or not placeable.
  - A reveal scroll is issued in a tick where `p` is null. The next tick samples a moving button, so it is not still. The tip shows only after two equal samples.
  - After `shown`, the gate is bypassed and the tip keeps tracking.
  - A list re-render before first show swaps the button element but not its position, so the gate stays satisfied.
  - The phone sheet slide-in also moves the button, so the gate covers that case too.
  - I found no case where a stale "still" lets a mid-scroll tip through, and no case where it hangs.
- **Scope.** Small and on-topic. The three layers (pure `scrollerPanel`, wiring, still gate) are separable. No unrelated files.

## Findings

### 1. Minor: the still-button gate (4e47d77) has no automated test
`src/ui/app.ts:557-559`. 4e47d77 touches only `app.ts`: no test and no rc0 change.
- **Evidence:**
  - The gate is inline in the `place()` closure inside `mountApp`. No unit test imports `app.ts` (`grep mountApp tests/` finds only `onboarding.test.ts`, which does not exercise coach placement).
  - The bug it fixes is Firefox-only (1024x474), but `scripts/rc0-browser.mjs:6` defaults to `chromium`. A default rc0 run goes green with `(shown || still)` deleted.
  - Under Firefox, rc0 only catches a regression because `MSNAP` samples every ~100ms and the `points` check (±1.5px) is applied to all samples. That is timing luck, not a deterministic check.
- **Impact:** the exact regression this commit fixes (tip drawn mid-scroll, 4px off) can come back silently.
- **Fix:**
  - Extract the decision into a pure helper in `coach-place.ts`, for example `stillStep(prevTop, top) -> { still, prev }` (or fold `still` into `coachStep`). Add 3-4 table tests: first sample is never still, equal rounded samples are still, NaN is never still, and the gate is bypassed once shown.
  - Add a note to the rc0 b2tip description that the Firefox run (`ENGINE=firefox`) is the one that guards this.

### 2. Minor: the `scrollerPanel` wiring and the header case are not pinned by any test
`src/ui/app.ts:552-554`, `scripts/rc0-browser.mjs:90-92`, `tests/rc2-b2-manage-place.test.ts:39-55`.
- **Evidence (reasoned; I did not run mutants):**
  - The unit tests exercise `scrollerPanel` and `managePlacement` in isolation. Reverting the wiring to `panel = sh` (the pre-fdc8f7a behaviour) leaves all 9 tests green.
  - rc0 `inUp` now also asserts `!ov(b, header)`. In the normal state the tablist sits inside `.body` above the button, and `floor` (= tabs.bottom) already keeps the tip below the header. The header band is reachable only when the tabs have scrolled out above the button. No rc0 case forces that state. It happens only incidentally when the reveal scroll runs at 1024x474.
  - The loop in the unit test at line 44-45 is guarded by `if (p)`. If `managePlacement` returned null everywhere it would pass vacuously. The two `toEqual` assertions after the loop do carry the real check.
- **Impact:** CCR fdc8f7a #1 could regress through the app.ts wiring without any red test.
- **Fix:**
  - Extract the panel computation into a pure `managePanel(sheet, body)` used by both `app.ts` and the test. It is already almost that (`scrollerPanel`), so the gap is just the call site.
  - In rc0, add one deterministic step after the Manage tip shows: scroll `.body` to the bottom (tabs out of view), wait one tick, then run `MSNAP` and require `!ov(b, header)` and `inUp`.

### 3. Minor: "tabs scrolled into view ... still floor the tip" cannot fail
`tests/rc2-b2-manage-place.test.ts:51-54`.
- **Evidence:** button 425..469, tip h 68, so the above slot is top 349. The tab is 303..347 and the panel top is 295.
  - With the floor removed (`floor = panel.top`), the result is the same `{above, 349}`: the tip does not hit the tab, and 349 > 295.
  - The assertion `top >= 347` is satisfied for the same reason.
  - The test therefore passes whether or not the tab floor exists. The floor is only distinguishable from the overlap check when a tab lies outside the tip's x-range but inside the panel's.
- **Impact:** the test name claims coverage of a rule the test does not exercise.
- **Fix:** pick a button position where the floor decides the outcome. For example, button top 410 with a tab 303..347 gives above top 334. The floor rejects it (334 < 347), the fallback below (462..530) overflows, and the result is null. Or use a narrower tablist that does not overlap the tip's x-range, which then still has to floor the tip.

### 4. Nit: the still gate adds an undocumented 250-500ms to every Manage tip first show
`app.ts:557-559`.
- **Evidence:**
  - The first `place()` call can never show the tip, because `lastBtnTop` is NaN. The next 250ms tick is the earliest show, even when nothing scrolls (phone, 1280x720 with the row already in view).
  - The comment says only "reveal scroll finished".
  - `still` also compares a rounded `top` only, not `left`, the scroller box, or the sheet transform.
- **Impact:** negligible for UX. The Manage tip life (`ms = 6000`) starts at first show, and `showManage` delays are unaffected. It matters only for anyone timing rc0 expectations.
- **Fix:** add one comment line about the cost. Optionally skip the gate when no reveal was issued (`!revealed`).

### 5. Nit: `scrollerPanel`'s `sheet` clip is a no-op in every real layout
`src/ui/coach-place.ts:115-116`, `app.ts:552`.
- **Evidence:** `.body` is a flex child of `.sheet`, so `body ⊆ sheet`. The second unit assertion (`box(-10,250,520,400)` against a 500x100 sheet) uses a geometry the DOM cannot produce. `coachClip()` is also called twice per tick (once for `clip`, once for `bd`).
- **Impact:** none. It is a harmless clamp, but the unit test gives false confidence that the case matters.
- **Fix:** either keep it as a cheap defence and label it as such in the test, or drop the `sheet` argument and read `bd` once.

## Layout notes (by reasoning from the code; no browser run, as instructed)

- **360x740 / 390x640 (phone sheet, 75dvh):** `.body` is the scroller and the panel is full width. The tip sits between the tablist/`.body.top` and `.body.bottom`, 8px from the viewport. Phone tests in `rc2-b2-manage-place` (line 33-37) cover the margin. The still gate also absorbs the sheet slide-in.
- **1280x720 / 600 (docked):** panel is the lower half of a 400px column. Above is blocked when the tabs are in view (as in the test at line 15-17), so below is used. If neither fits, the tip defers (null) and the reveal scroll runs. Placement logic is unchanged by this range except for the header exclusion, which is now stricter.
- **1024x474:** the docked panel is about 237px tall, so the tip is the tightest fit. The reveal scroll plus the still gate is the intended path. `rc0 b2tip 1024x474` requires the Manage tip to show.

## What I ran

- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-b2-manage-place.test.ts tests/rc2-b2-safe-coach.test.ts tests/rc2-b2-rule-d-step.test.ts` -> 3 files, 46 tests, all passed.
- `npx tsc --noEmit` -> **not run**. The tool was denied by the permission mode in this session (three attempts). Type-checking is therefore unverified by me.
- No browsers and no `rc0-browser.mjs` run, as instructed. All layout statements above are from reading the code, CSS and tests.
- I did not run mutation checks. The "reverting the wiring / removing the gate keeps tests green" statements come from reading which modules the tests import, not from executing mutants.
- Worktree not modified.
