# Review: fix-rc2-b2-tired-tip-tabs @ 5877e0f (a01faea..5877e0f)

Topic: B-2 amended spec (art-ux/rc2-notes-b2-b3.md §B-2 A-C). Recheck of review 6a9ede1 findings #1-#6. Reviewer: Code Reviewer. Static review only, no browser.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 1 |
| Minor | 4 |
| Nit | 2 |

Verdict: #2, #3, #4 (logic) and #5 are correctly fixed, and #6 is mostly fixed. #1 is only partly fixed: the new deferral allowance covers 1280x720 and 1280x600, and that undoes the guard for the main desktop size (finding 1). Separately, the tired-tip path is safe, but the legacy tips (Manage tip, hire tip) hold an anchor element that the 250 ms row re-render detaches. This commit's `place()` now hides a tip in that case (finding 2).

## Status of the 6a9ede1 findings

| # | Prior finding | Status |
|---|---|---|
| 1 | rc0 b2tip passes if the tip never shows | **Partly fixed.** Now requires `S.length>0 && manage`, but `mayDefer` includes 1280x720 and 1280x600 (finding 1). |
| 2 | Deferred tip leaks its interval | **Fixed.** `place()` calls `close()` when `!el.isConnected`. `close()` is idempotent. |
| 3 | 'done' telemetry fires before the Manage tip shows | **Fixed** (`app.ts:587-588`). Residual: no max-wait on a hidden tip (finding 3). |
| 4 | Row measured against the viewport, not the scroller | **Fixed in logic** (`clip` plus 3 unit asserts). The `app.ts` wiring has no test (finding 4). |
| 5 | Dead `coachPlacement`/`tabOverlap` and their tests | **Fixed.** `grep` finds no references left in src, tests, scripts or docs. Two behaviours worth keeping were not ported (finding 5). |
| 6 | Unit-test gaps | **Mostly fixed.** Margin, horizontal overflow, legacy order, `avoid` and `clip` are now covered. Three mutants still survive (finding 5). |

## Findings

### 1. [Major] `mayDefer` allows the tip to stay hidden at 1280x720 and 1280x600, so a never-shows regression still passes rc0 at the main desktop size
- `scripts/rc0-browser.mjs:97-100`: `mayDefer = (w===1280 && h<=720) || (w===1024 && h===474)`. The pass condition is `mayDefer ? (!S.length || manage) : S.length>0 && manage`.
- For those sizes `!S.length` is a pass. That is the same hole #1 reported: tired tip hidden always, Manage tip never created, and the test is green.
- It contradicts the repo's own unit scene. `tests/rc2-b2-safe-coach.test.ts` test A models 1280x720 docked (tabs at 140, row at 200) and expects `{side:'below', top: row.bottom+8}`.
- My CSS arithmetic agrees. Docked, `#panel-layer` is a `1fr 1fr` grid, so the Upgrades sheet is the lower half, 360..720 at 1280x720. Header 56 + body padding 16 + tabs 44 + gap 12 puts the first row at about y=488. A single-worker row is about 100-110 px tall, so there is about 70 px of room below it for a tip of about 68 px plus the 8 px gap and 8 px margin. A clean spot probably exists at 1280x720. I could not measure it.
- Impact: 1280x720 is the headline desktop size. If the tip really does defer there, the first-hire FTUE tip is invisible to most desktop players and the test hides it. If it does not defer there, the allowance is only slack that masks regressions.
- Fix:
  - Decide per size from a measurement. Allow deferral only where the unit scene proves `null` (1024x474, and 1280x600 only if it is measured and written down).
  - Make `info` record why the tip was deferred: the row rect, the tab rects, and the `centred` flag. Then "deferred" can be audited rather than assumed.
  - Require `S.length>0 && manage` at 1280x720 and 1280x800, as the 6a9ede1 review asked.

### 2. [Minor] Legacy tips capture `at` once; the 250 ms re-render detaches it, and `place()` now hides a tip that was already showing
- `src/ui/app.ts:514`: `uRow.innerHTML = html` whenever the string changes. `workersHtml` embeds `Energy ${Math.ceil(energy)}%`, the Manage cooldown seconds, `canManage`, and other workers' `affordable` and locked state (`workers-ui.ts:57-73`). `drain_s_per_pct` is 9, so the Workers rows change about every 9 s after a hire, and also on any coin threshold crossing.
- The Manage tip (`app.ts:587`) and the hire tip (`app.ts:578`) pass a captured element (`r2.querySelector('[data-act=manage]')`, `row.querySelector('button.btn')`) with `rowId=null`. After a re-render that node is detached, so its rect is 0x0, `inVp` is false, and `p` is null. `app.ts:545` then does `el.style.visibility='hidden'`.
- Only the tired tip re-queries its row each tick. Before 6a9ede1 a tip was positioned once and stayed; now it vanishes.
- Impact:
  - Normal flow: the Manage tip appears about 3.2 s after hire and its 6 s life ends at about 9.2 s, so the first re-render at about 9 s hides it only a moment early.
  - Direct flow on a phone: the player opens Upgrades at, say, 5 s. The tired tip shows, the Manage tip follows at about 8.3 s, and the energy re-render at about 9 s hides it after under 1 s of its 6 s life. The 'done' event has already fired.
  - The hire tip (8 s) hides whenever any row's affordability flips.
  - No unit test or rc0 step covers this. rc0 samples `manage` once, at 7 s.
- Fix: re-resolve the anchor on each tick, for example `coach(..., anchor: () => Element | null)` with `() => workerRow(id)?.querySelector('[data-act=manage]')`, or reuse the `rowId` path with a `sel` parameter. Add an rc0 check that the Manage tip is still visible after a forced `uRow` re-render.

### 3. [Minor] #3 closes the telemetry gap but not the hidden-tip lifetime
- `app.ts:545` and `:549`: `life` starts only on first show, and nothing bounds the wait. A tip whose anchor is null or detached (finding 2, or the player switched tab inside the 3.1 s) never shows and has no timeout. Its 250 ms interval runs until another `coach()` call drops it, which `close()` now cleans up.
- A tip that stays hidden for minutes can also pop up out of context when its target next scrolls into view. The 6a9ede1 review suggested a max-defer, and it is still not there.
- Impact: low (one interval, and a stale tip that is possible but not easy to trigger).
- Fix: add a defer deadline, for example `close()` after 10-15 s without a first show, or on tab or sheet change.

### 4. [Minor] The #4 wiring and the Manage tip's geometry are not tested end to end
- `app.ts:542` passes `clip: rowId ? uRow.parentElement?.getBoundingClientRect() : undefined`. The unit asserts cover only the pure function. If `clip` were dropped or pointed at the wrong element, nothing fails: no rc0 case scrolls the worker list, and nothing covers `coach()`.
- rc0 `manage` (`rc0-browser.mjs`) is a boolean "a visible `.coach` containing Manage exists". `SNAP` selects only `/tired/` tips. The Manage tip's overlap with the tablist, the worker row and the viewport is never asserted, even though the spec says every tip is clear of the tabs.
- Fix: extend `SNAP` to take a text regex, run it for both tips, and apply the same `bad` filter. Add one rc0 step that scrolls `.sheet .body` so the row is under the header or below the fold, and expect the tip hidden.

### 5. [Minor] Behaviour from the deleted tests was not ported; three mutants of `safeCoachPlacement` still survive (reasoned, not executed)
- `coach-place.ts:44`: `b.top < M`. Mutating `M` to 0 on the top side survives. The only top-edge assertions are `clean()` (`b.top >= 0`) and the margin test, which covers the bottom side only. Add a case where above fits only without the 8 px top margin.
- `hit()` uses strict `>`, which is why touching edges don't count. The old test file had an explicit touching-edge case (tip top equals tab bottom). Mutating to `>=` would produce false deferrals and nothing catches it. Add one case.
- `COACH_MIN_TOP` boundary: the legacy-order test uses 400 and 119. `>=` to `>` survives. Add `target.top = 120` and expect above.
- The margin test (h=444 versus 448), the horizontal-overflow test (`cx` 100 and 300), the `avoid` test and the three `clip` asserts each kill their own mutants. I checked each by hand.

### 6. [Nit] `avoid` is still declared but never passed
- `SafeOpts.avoid` and the `...o.avoid` spread are unused by `app.ts`. This is carried over from nit #7 of the previous review. The spec says every tip is clear of the worker name, but the Manage tip is checked only against the tabs and its own button.
- Fix: pass the row's name and Energy-label rects for the Manage tip, or drop the option.

### 7. [Nit] Small items
- `uRow.parentElement` is `.sheet .body`, which also contains the tablist. That is fine because the tablist is not sticky, but `uRow.closest('.body')` would not depend on the nesting.
- The B-2 section comment in `rc0-browser.mjs` is placed under the `// ---------- B1 hire banner ----------` header.

## Checked and fine
- `place()` calling `close()` first is safe: `close` is declared before the first `place()` call, and `clearTimeout(0)` is harmless.
- `close()` is idempotent, which matters because the click handler, the life timer and a drop can all call it.
- Layout: `.coach` has `width:max-content`, so the hidden `offsetWidth/Height` equal the final size. At 360 and 390 the max width is 280, and the `cx` clamp keeps `l >= 4`. Docked at 1280 the tip stays inside the right panel.
- Phone slide-in animation: the sheet transform pushes the row below `vp.h`, which returns null and defers, as intended.
- `onShow` chain: the tired tip's `onShow` runs once, and the Manage tip's `onShow` now carries `introBStage` and 'done'.

## What I ran
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-b2-safe-coach.test.ts`: 1 file, 14 tests, all pass.
- `npx tsc --noEmit`: the harness denied it in don't-ask mode on every attempt. **No typecheck result.** Please run it on the branch.
- No browser or rc0 run, as instructed. Layout figures in finding 1 come from CSS arithmetic, and the mutation analysis in finding 5 is by reading, not executed.
- Read: the full diff a01faea..5877e0f and 6a9ede1..5877e0f, `coach-place.ts`, `app.ts` coach, workers-intro and render code, `workers-ui.ts`, the `styles.css` sheet, tabs and coach rules, the economy CSV (drain 9 s per percent) and the 6a9ede1 review.
