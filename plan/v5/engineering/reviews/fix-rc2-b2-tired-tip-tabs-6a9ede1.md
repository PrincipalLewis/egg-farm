# Review: fix-rc2-b2-tired-tip-tabs @ 6a9ede1 (a01faea..6a9ede1)

Topic: B-2 tired tip, amended spec (art-ux/rc2-notes-b2-b3.md §B-2, 2026-10-17 00:55, A-C). Reviewer: Code Reviewer. Static review only (no browser).

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 1 |
| Minor | 5 |
| Nit | 3 |

Verdict: the placement logic in `safeCoachPlacement` is sound and A, B and C are implemented as written. The tired tip anchors at row.bottom+8, never sits on a tablist, and is deferred when the sheet is closed or no clean spot exists. The weak points are what surrounds it: nothing asserts the tip ever shows, a deferred tip can leak its interval, and the unit tests miss several mutants. No correctness regression on the main path.

## Findings

### 1. [Major] The browser check and the unit tests pass if the tired tip never shows
- `scripts/rc0-browser.mjs` (new `sections.b2tip`): `bad = S.filter(...)` runs only over shown samples. `info` falls back to `'deferred (not shown)'` and `ok(...)` is `!bad.length && !errors.length`, so `S.length === 0` is a PASS at every size and in both flows.
- `tests/rc2-b2-safe-coach.test.ts` covers only the pure function. Nothing tests `coach()` in `src/ui/app.ts`: `sheetOk`, the row re-query, `visible`, the `onShow` chain or the Manage follow-up.
- Impact: a regression that makes the tip permanently hidden would pass CI and rc0. Examples are `sheetOk` always false, `inVp(ebar)` always false, or `.ebar` not found. The first-hire FTUE tip would silently disappear, and so would the Manage tip, which is chained to `onShow`. Spec C says "defer", not "never", so the positive path needs an assertion.
- Fix: in b2tip, require `S.length > 0` wherever a clean spot is expected. That is normal flow at 1280x720, 1280x800, 390x640 and 360x740, and direct flow at 1280x* and at phone sizes after the sheet is opened. Allow `deferred` only for 1024x474, and for direct phone before the sheet opens. Also assert that the Manage tip appears after the tired tip. Optionally add a jsdom test of `coach()` with stubbed `getBoundingClientRect`.

### 2. [Minor] A deferred (never shown) tip leaks its 250 ms interval, and the tip is lost
- `src/ui/app.ts:536`: `place = () => { if (!el.isConnected) return; ...`. The interval is cleared only in `close()`.
- `close()` is reached only via click, or via the `life` timeout, which is now armed only on first show (`if (!shown) { shown = true; life = setTimeout(close, ms) ... }`).
- Any other `coach()` call or `.coach` removal drops a still-hidden tip with `el.remove()`. Examples are the `document.querySelectorAll('.coach').forEach(...remove())` at the top of `coach()` and in the `worker_hire` handler (:582).
- Before this change the `ms` timeout always ran `close()`, so the interval was cleaned up. Now it runs forever.
- Impact:
  - One orphan `setInterval` per dropped tip.
  - The hire tip ("Hire them for…", 8 s) is hidden until its target is in view. If the player hires directly, the handler removes it before it shows, and its interval then spins.
  - A removed tired tip is gone for good: `flags.workersIntroB` is already saved, and the deferral state is in memory only.
- Fix: `if (!el.isConnected) { close(); return; }`. Optionally also make `close` idempotent.

### 3. [Minor] The Manage tip can silently never show, while 'done' telemetry still fires
- `src/ui/app.ts:585-589`: `onShow` schedules the Manage `coach()`. Right after that call it does `introBStage = 2; telemetry.onboardingStep(7,'workers_coach',{action:'done'})`, with no check that the tip showed.
- With the new rules, `at` null (row gone because the player changed tab within the 3.1 s) or no clean spot means the Manage tip stays hidden. Before, it fell back to a centred position at left:50%/top:40%.
- Impact: the funnel reports "done" for players who never saw Manage. The tired tip also has no 'done' if it never shows, because the whole chain hangs on `onShow`. A hidden Manage tip lingers in the DOM and pops up whenever the target is next on screen, possibly minutes later and out of context, until another `coach()` call replaces it.
- Fix: move `introBStage = 2` and the 'done' event into an `onShow` of the Manage `coach()` call. Optionally add a max-defer (for example give up after N seconds, or on tab change) so a stale tip does not appear much later.

### 4. [Minor] "Row fully on screen" is measured against the viewport, not the scroller's visible box
- `src/ui/app.ts:540-543` (`inVp` plus the `row.top<0 || row.bottom>vp.h` check in `coach-place.ts`).
- The worker list lives in `.sheet .body` (`overflow:auto`, styles.css:106, app.ts:91). `getBoundingClientRect` ignores that clip.
- A row scrolled under the 56 px sheet header, or past the bottom edge of the docked half-height panel, still has a rect inside the viewport. The tip is then placed next to a row the player cannot see.
- Impact: contradicts spec C ("energy bar is visible"). It most likely shows up at docked 1280x600 and 1024x474, where the body is only a few hundred px tall, and on phones when the player scrolls.
- Fix: pass the `.body` rect (`uRow.parentElement`) as a clip. Require `row` (and `ebar`) inside `max(vp, body)` by intersecting `inVp` with it. Add a unit case: row inside the viewport but above the body top → null.

### 5. [Minor] Dead production code and 16 tests that guard it
- `coachPlacement` and `tabOverlap` (`src/ui/coach-place.ts:16-40`) are no longer imported by `app.ts`. The only importer is `tests/rc2-b2-coach-tabs.test.ts` (16 tests).
- Those tests, which this branch carried from c9d5d9c and 572864a, are green but protect nothing that ships. The `coachPlacement` doc comment ("Legacy rule (every tip)… only the tired tip opts in") now misdescribes the code.
- Fix: delete `coachPlacement`, `tabOverlap` and `rc2-b2-coach-tabs.test.ts`. Keep `COACH_GAP`, `COACH_MIN_TOP` and `COACH_MARGIN`. If any of those tests encode behaviour worth keeping (edge touch, top clamp), port them to `safeCoachPlacement`.

### 6. [Minor] Unit-test gaps: mutants of `safeCoachPlacement` that still pass (reasoned; I did not run mutations)
Test file: `tests/rc2-b2-safe-coach.test.ts`.
- `COACH_MARGIN` 8→0, in the `b.top < M || b.bottom > vp.h - M` check (`coach-place.ts`): `clean()` (:11) checks only `b.bottom <= vp.h`, and no scene has a tip bottom in (vp.h−8, vp.h]. The mutant survives. Add a case where below fits only without the margin → null or above.
- Delete the `l < 0 || r > vp.w → null` check: no test has a tip that overflows horizontally (the sweep uses a centred 276 px tip). Survives. Add a narrow-viewport or edge-`cx` case.
- Legacy side order (`target.top >= COACH_MIN_TOP ? [A,B] : [B,A]`): the legacy test cases are decided by tabs or viewport, never by order. In every legacy case the preferred side is blocked or both sides are not clean, so swapping the order still passes. Add a both-clean case at `top >= 120` (expect above) and at `top < 120` (expect below).
- `avoid` has no test, and the sweep's `clean()` returns true for null. An always-null implementation passes the sweep and is caught only by the three `not.toBeNull`/side assertions.
- Fix: add the cases above. Replace `cx: 150 > 142 ? 150 : 142` (:36) with a literal.

### 7. [Nit] `avoid` is declared and documented but never passed
- `coach-place.ts` `SafeOpts.avoid` ("worker name, Energy label, Refill/Manage button…") and the `...o.avoid` spread are unused by `app.ts`.
- Spec B reads "every tip… clear of the tabs and the worker name". The tired tip is safe by construction because it sits below the row. The Manage tip is checked only against tabs and its own button. From the row geometry (button top+4, h44, +12 gap) it probably clears the row, but nothing proves it.
- Fix: pass the row's name and label rects for the Manage tip, or drop the option and the doc claim.

### 8. [Nit] The deferred tip is not persisted
- `flags.workersIntroB` is saved at hire, but the deferred tired tip exists only as an in-memory timer.
- Direct flow on a phone, then reload before opening Upgrades, means the tip is never shown. Spec C says "queue until the Workers tab is open (same 3 s, once)", which is satisfied within a session.
- Accept this, or set the flag on first show instead of on hire.

### 9. [Nit] Small items
- `app.ts:545`: `row.scrollIntoView({block:'center'})` fires once when no clean spot exists. At 1024x474, where a spot never exists, this moves the player's list once after the hire for no visible result. Consider doing it only when the "above" or "below" failure is due to scroll position.
- The `coach()` signature `(text, at, ms, cls, rowId, onShow)` is getting positional-heavy. An options object would be clearer.
- `scripts/rc0-browser.mjs`: the new `sections.b2tip` sits under the `// ---------- B1 hire banner ----------` header, so the section comments are misplaced.

## Spec conformance (§B-2 amended)
- A, anchor row.bottom+8: `coach-place.ts:67` (`o.row.bottom + ROW_GAP`), row re-queried each tick (`app.ts:537`). OK. The row-rect test asserts exactly `row.bottom + 8` (unit test A).
- B, tablist and viewport check on every tip: `safeCoachPlacement` for all tips. Tablists are queried live and zero-size rects are ignored. Null is returned instead of clamping onto tabs. OK. The 1024x474 repro is deterministic in the unit test.
- C, show only with the sheet open and the bar visible: `sheetOk = (docked.matches || open==='upgrades') && tab==='workers'` plus `inVp(ebar)` plus a row height check. OK, but see finding 4.
- AC at 360x740, 390x640, 1280x*, 1024x474: the unit scenes model them and pass. I could not verify the real DOM (no browser); the rc0 `b2tip` result is unverified by me, and see finding 1 for what it can miss.
- Horizontal: centre on the bar with the clamp using the measured tip width. At 360/390 the tip (max 280 px) fits (`l ≥ 4`). At 1280 docked it stays inside the panel column.
- Measurement is sound: the hidden tip is positioned at left:0/top:0 with `width:max-content`, so `offsetWidth/Height` equal the final size, and `cssText` is replaced on show (which clears the visibility).

## What I ran
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-b2-safe-coach.test.ts tests/rc2-b2-coach-tabs.test.ts`: 2 files, 25 tests, all pass.
- `npx tsc --noEmit`: the harness denied the command, so there is no typecheck result. Please re-run it on the branch. The `coach()` rest/optional param change and `SafeOpts` use are the only typed surface I would double-check.
- No browser or rc0 run, as instructed. Mutation analysis (finding 6) is by reading, not executed.
- Read: the full diff a01faea..6a9ede1, `app.ts` coach/workers-intro/panel markup, `styles.css` sheet/coach/tabs rules, and the spec and 00:49 FAIL report.
