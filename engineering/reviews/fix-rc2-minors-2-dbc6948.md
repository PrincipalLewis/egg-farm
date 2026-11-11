# Review: fix/rc2-minors-2 @ dbc6948 (PR #35, recheck of e9b9826)

Range `9677d26..dbc6948`, worktree `/workspace/review-dbc6948`. Topic: recheck of `engineering/reviews/fix-rc2-minors-2-e9b9826.md`, plus the new §9 'Wants N eggs' work, the rc0 §9 fixtures, and the #30 merges. The v3 base lacks the PR #22 T tier.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 4 |
| nit | 4 |

Verdict: ready to merge from a code-correctness view. No finding blocks it. All the code-level items from e9b9826 are fixed. The minors are test-adequacy and layout-coverage gaps, plus one spec-alignment question. They can be fixed here or tracked.

I did not run browsers. The 360, 390 and 1280 layout notes come from CSS, code and the rc0 script text, not from measurement. `npx tsc --noEmit` was denied by the permission layer, as in the last review, so I did not run it. The author's `6961d10` message says tsc was fixed, but I have not confirmed it.

## Status of the e9b9826 findings

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | Pending toast shown over a modal | **Fixed** | `toast-place.ts` `toastController` takes a `gate` hook. It checks `blocked()` on entry and again inside the settle `raf`, and calls `hold(dur)` instead of `show()`. `app.ts:169` wires `blocked` to `#modal-layer.open` and `hold` to `toastQ.hold(toast.textContent, ms)`. Unit tests in `toast-controller.test.ts` ("gate hook") fail if the `raf` re-check is removed. I walked the reload path (`renderAll()` then `showWelcome()` in one task, `app.ts:757`): the toast is pending, the modal opens, the `raf` re-check holds it, and `closeModal` → `released()` → `next` shows it. |
| 2 | Drain ended on the last toast | **Fixed** | `next` now always schedules `setTimeout(next, ms + gap)` and clears `draining` only when `held` is empty (`toast-place.ts:35`). `toast-gate.test.ts` asserts that D waits for C's own time and that E passes through afterwards. |
| 3 | Panel-state captions dropped | **Superseded, confirmed** | `art-ux/status.md:46` and `rc2-notes-b2-b3.md:61` mark M-Tut-parity SUPERSEDED by the FM-AC4 strings, approved by Head of Art & UX. `TUT_COPY` matches FM-AC4 exactly. The rc0 caption check compares the exact text at 360, 390 and 1280. |
| 4 | Source-regex tests | **Partly addressed** | See finding 3 below. |
| 5 | Focus lost on hint rewrite | **Fixed** | `setHint` (`onboarding.ts:216`) rewrites only the first text node when the hint is `<text><button.tut-link>` and the content is unchanged in shape. Otherwise it replaces `innerHTML`. The unit test checks that the link node is the same object and that `writes` stays at 1. |
| 6 | z-index comment | **Fixed** | The comment at `app.ts:171` now says z 35 by cascade, and notes that only `#modal-layer` gates, not `.recovery-layer` or the rotate prompt. |
| 7 | Duplicate 1300 | **Fixed** | `TOAST_MS` is used in `app.ts` and in `rc1-ui.test.ts` (S2-1). |
| 8 | Import and style tidiness | **Not fixed** | See nit 3. |
| 9 | Scope | n/a | The merges of #5 and #30 are as described in the brief. |

## Findings

### 1. [minor] The rc0 'same' case does not create the state it claims to test
`scripts/rc0-browser.mjs` `rc2minors2`, path `'same'`; comment "buy + Welcome-back in one task, toast still pending its settle frame (review e9b9826 #1)".

Evidence:
- The tier check that calls `showToast` is in `render()` (`app.ts:540-545`).
- `render()` is called only from `RenderPump` on a `requestAnimationFrame` (`src/main.ts:123`). `g.dispatch({type:'buyFarm'})` does not render.
- In the 'same' case the evaluate does `dispatch(buyFarm)` and then `eggfarmQaWelcome()`. The modal is therefore already open when `render()` next runs, `toastQ.toast` sees `blocked()`, and it holds. That is the same path as the 'during' case.
- The state the fix targets is "toast pending its settle `raf`, then the modal opens". It needs `render()` and `showWelcome()` in the same task. The real case is a reload where `celebratedTier` was not persisted and `pendingOfflineEggs > 0` (`app.ts:757`).

Impact: if the `raf` re-check is removed, rc0 'same' still passes. The unit tests in `toast-controller.test.ts` still catch that. The browser-level check is the one that is mislabelled.

Fix: reproduce it with a load fixture. Use a save with `farmLevel: 4`, `celebratedTier: 0` and a stale `lastSeen`, so the first `renderAll()` toasts and `showWelcome()` follows in the same task. Or drop the "pending settle frame" claim from the comment.

### 2. [minor] §9 narrow branch has no fit fallback, and the fixtures cover neither 320/390/430 nor the widest value string
`src/ui/order-list.ts:44`, `scripts/rc0-browser.mjs` (the §9 fixture loop, widths 360 and 1280 only), `src/ui/orders.ts:21`.

Evidence:
- At <=375 the code is `e.replace(/ eggs$/, '')` with no `fits` check. The `e5e62d5` fallback to `0/N` was removed in `529523a`. "Wants N" is about four characters wider than "0/N" was.
- `.order .l1 .v` is `flex:none; overflow:visible` (`styles.css:587`) and `.e` is `flex:none`. A line that is too wide therefore overflows the text column instead of being clipped or shortened.
- The worst fixture is `Wants 181B · $1.78T` (19 characters), and rc0 asserts <=170px at 360 only.
- `fmtCount` gives `n >= 1e10` one decimal, so `$100B..$999.9B` renders as `$181.2B` (7 characters), one more than `$1.78T`. A customer wanting 181B eggs at about $1 an egg would render `Wants 181B · $181.2B`, one character wider than the fixture. I could not measure whether it fits at 360.
- At 320, the narrower l1 (rough estimate: avatar 40 + button 80 + padding) is not covered. 390 and 430 use `fitOrderEggs` and are not covered either. The "kept only when it fits" behaviour is exercised only at 1280.
- Note: the rc0 `want` computation at 1280 accepts either string for `d=181e9`. The real constraint comes from the `lines === 1`, no-ellipsis and `sw <= cw` clauses, so the fixture is not vacuous.

Impact: a possible one-off overflow at 360 or 320 for 100B-999B values. The fixtures give no signal at 320, 390 or 430.

Fix: add fixtures for `Wants 181B · $181.2B` (price 100 cents) at 320, 360 and 390. If it overflows at narrow, run the same `fitsL1` check there and drop to `Wants 181B`.

### 3. [minor] #4 is only partly addressed: wiring is still asserted by source regex, and the new "narrow" test is partly tautological
`tests/rc2-minors-2.test.ts`.

Evidence:
- The tut-link handler, the order-list aria write, and the `pullToast`/`closeModal` wiring are still checked by `readFileSync(...).toMatch(...)`. `pullToast` still has the condition from the original finding in untested form.
- The `§9 narrow branch` test runs `'Wants 13 eggs'.replace(/ eggs$/, '')` and compares it to `'Wants 13'`. That tests `String.replace`. The only real assertion is a regex on the source line of `order-list.ts:44`.
- Real gains: `setHint`, the controller gate hook, the drain, and the fit helper now have behavioural tests.
- The repo has no jsdom or happy-dom (`package.json`), so my earlier "jsdom-test" suggestion is not free.

Impact: a broken `pullToast` (wrong early return) or click handler would pass vitest. Only rc0 would catch it.

Fix: extract `pullToast` and the tut-link action behind small facades like `ToastDom` and unit-test them. Delete the tautological `.replace` assertion, and extract the narrow/fit decision as a pure `fitOrderText(e, narrow, fits)` that is tested.

### 4. [minor] M-Tut-goal pulse does not match FM-AC5/FM-AC7 (verify scope with Art & UX)
`src/ui/app.ts:725` (`retrigger(buy, 'pulse')`), `styles.css:50`.

Evidence:
- `.pulse` is `animation: pulse var(--t-med)` with `--t-med: 240ms` and `scale(1.12)`.
- `product/collection/first-minute-proposal.md` FM-AC7 says the pulse peaks at 1.06 ±0.01, has a period of 1,200 ms, has an outline or box-shadow, and under reduced motion shows a static 3 px outline.
- FM-AC5 says "exactly 1 pulse cycle (1.2 s ±0.1 s)" for the link-triggered pulse.
- `rc2-notes-b2-b3.md:62` says only "pulses its Buy button", which this code does. The rc0 check only asserts that the `pulse` class is present 450 ms after the tap, and it stays on the element.
- Under reduced motion `--t-med` is 0 ms and there is no outline, so there is no visible cue.

Impact: the link works but its pulse does not meet the later first-minute AC if that AC applies to this PR.

Fix: confirm with Art & UX whether FM-AC5/7 are in scope for #35. If they are, add a goal-pulse class with 1.06, 1.2 s, glow and a reduced-motion outline.

### 5. [nit] `fmtMoney` prints `$1000B` just below the new cut-off
`src/ui/orders.ts:21`: the T path starts at `valueCents >= 1e14`.

Evidence: for `d` in `[999.95e9, 1e12)`, `fmtCount` does `(d/1e9).toFixed(1)` → `"1000.0"` → `"1000B"`. The cut-off should be at `$999.5B` to match the roll-over in `count3`. This is at most a 5 character-wide glitch for a narrow value range.

Fix: use `valueCents >= 9.995e13`, or use `count3` for any value `>= $1B`.

### 6. [nit] A modal that reopens during the drain delays the held toast
`src/ui/toast-place.ts:37` (`released`: `if (!held.length || draining) return`).

Evidence: A is shown by the drain (`draining` stays true until `next` fires at +dur+gap). A modal opens → `pullToast` re-holds A. The modal closes → `released()` returns because `draining` is true. A reappears only when the old `next` fires, up to about 1 s later. No test covers this. It is rare.

Fix: on `hold()`, reset `draining` when `blocked()`, or use a generation counter for `next`.

### 7. [nit] Stale tutorial strings and doc
`src/ui/onboarding.ts:7-10`, `:12-13`.

- `STEPS[].caption` ("Spend your coins: open Upgrades and buy your first one.") is still the default for `mountOnboarding`'s `caption` argument. It no longer matches FM-AC4. Point the default at `tutCaption`.
- Two stacked JSDoc blocks sit above `TUT_COPY`. The first ("source: the 390 strings") is orphaned and untrue now.

### 8. [nit] Tidiness from the earlier #8 still present
- `app.ts:5` imports `toast-place` above the type imports.
- `tests/ftue-v11.test.ts:3` has two import statements for the same module on one line.
- `tests/rc1-ui.test.ts`, `tests/toast-controller.test.ts` (`tc2`/`TM` aliases) and `rc2-minors-2.test.ts` have imports in the middle of the file.
- Test names and comments carry "review e9b9826 #N" tags. Commit `37524aa` in this branch's history dropped such tags from test names.

## Checked, no finding

- **M-Order-zero:**
  - `have === 0` occurs only in `wait`. Ready and partial are unchanged.
  - Aria refreshes on label change, so 0→1 egg updates it.
  - `count3` and the value path agree for `>= $1T` (`$1.78T`).
  - The narrow cache key includes `narrow`.
- **Toast gate:**
  - `pullToast` holds only a toast that is `.show`n. A fading-out toast is just cut.
  - Stale dismiss timers are cleared by the controller on the next call.
  - `closeModal` is the only path that removes `.open`.
  - `hold` dedupes by text.
- **M-Tut-goal:**
  - `openPanel('upgrades')` is idempotent, so a tap with Upgrades already open does not close it.
  - Docked skips `openPanel`.
  - The link's hit area is about 44 px high, and wider than 44 px.
  - The setHint structural type looks assignable to `HTMLElement`, but tsc was not run.
- **#30 Sold chip:** `styles.css:375` sets `font-family: var(--f-body)`, weight 700, 12px. Specificity beats `.btn.sell.long`. The rc0 check asserts family, weight, size >= 12, no transform and unchanged row width. There is no vitest guard for it.
- **Scope:** the diff is the PR #5 toast controller, the #30 merge and the #35 items, as described.

## What I ran

- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-minors-2.test.ts tests/toast-gate.test.ts tests/toast-controller.test.ts tests/rc2-toast-banner.test.ts tests/ftue-v11.test.ts tests/orders.test.ts tests/rc1-ui.test.ts`: 7 files, 115 tests, all passed.
- `npx tsc --noEmit`: **not run.** The call was denied by the permission layer ("don't ask mode"). An ad-hoc script to print `fmtMoney` values at the boundaries was denied too, so finding 5 comes from reading `fmtCount`, not from output.
- Not run (per instructions): browsers and `scripts/rc0-browser.mjs`. The `rc2minors2`, `toastfirst`, `b2` and Sold-freeze checks are unverified by me.
- Read: the full diff `9677d26..dbc6948` (src, tests, rc0 script), `app.ts` render, modal, toast and tutorial wiring, `main.ts` render pump, `format.ts`, the relevant `styles.css` rules, `first-minute-proposal.md` FM-AC4 to AC7, and `art-ux/rc2-notes-b2-b3.md` and `art-ux/status.md`.
