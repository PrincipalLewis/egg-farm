# Code review: M4 gate5 focus-return fix (variant B), aa59600..c0bb3de

Commits: ae24de8 (P46-M1 focus-return fix), c0bb3de (docked Upgrades tab counts as visible).
Files: `src/ui/tracks-explainer.ts`, `tests/m4-exp1-explainer.test.ts`, `scripts/rc0-browser.mjs`.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 3 |
| nit | 2 |

Verdict: the logic is correct for the four cases it targets. Those are card focused, mobile with the sheet closed, mobile with the sheet open, and docked. It is a reasonable scope. The weak spot is test adequacy for the docked fix in c0bb3de, which is effectively unguarded. I could not run vitest or tsc (see "What I ran").

## What the change does

`close()` now computes `mine = !ae || ae === body || el.contains(ae)` before removing the card, so focus is restored only if it was on the card or nowhere. It then picks a target in this order:

1. The `[data-tab].active` button, if it is rendered. That means it has client rects, or it has no `[hidden]` ancestor.
2. The element that was focused when the card opened, if it is still connected and is not `body`.
3. `#collect`.

Checked against the CSS and `app.ts`:

- `[data-tab]` buttons exist only inside `#p-upgrades` (`app.ts:97-99`). That sheet has `hidden` on mobile unless open, and `#panel-layer .sheet[hidden]{display:none}` (`styles.css:103`) applies there.
- In the docked layout (`@media (min-width:960px) and (orientation:landscape)`, `styles.css:157-163`), `.sheet[hidden]{display:flex!important}` overrides it. `getClientRects().length > 0` therefore correctly says "visible" even though `closest('[hidden]')` is truthy. The c0bb3de reasoning holds.
- `#collect` is in `.collectbar` inside `main.farm`, not in `.actions`. `.actions{display:none}` docked (`styles.css:159`) therefore does not hide it, so the final fallback is focusable at 360, 390 and 1280.
- Behaviour at the three widths:
  - 360 and 390: the sheet is closed and the card was opened from nothing, so focus goes to `#collect`. With the sheet open, it goes to the active tab.
  - 1280 (docked): focus goes to the active tab, here usually `Collection`.

## Findings

### 1. [minor] The docked fix (c0bb3de) has no test that can fail without it
`tests/m4-exp1-explainer.test.ts:187-199`, `scripts/rc0-browser.mjs:680-681`

Evidence:
- jsdom's `getClientRects()` always returns an empty list, so the `getClientRects().length > 0` branch, the one c0bb3de added, is never true in any unit test. The new unit tests only exercise the `!closest('[hidden]')` half.
- The only docked coverage is the new rc0 browser assertion `fo !== 'BODY'`. It passes for any focused element. If c0bb3de were reverted, docked focus would fall to `prev` or `#collect` (neither is `BODY`) and the check would stay green.
- The first-pass bug (focus lost to a hidden tab) is covered by the "hidden Upgrades sheet" unit test. The regression c0bb3de fixed (docked tab wrongly treated as hidden, so focus is not returned to it) is not.

Impact: someone can drop the `getClientRects` clause, or simplify it to `!tab.closest('[hidden]')`, with no red test. Docked focus return would then go to the wrong element.

Fix:
- Add a unit test that stubs `HTMLElement.prototype.getClientRects` to return one rect. The tab sits in a `<div hidden>`, and the expectation is that the tab gets focus.
- Strengthen the rc0 assertion to the expected target. At 1280 it should be `[data-tab].active`, so `fo === 'collection'`. At 360 and 390 with the sheet closed it should be `collect`. Use `ok(..., fo === expected, fo)`.

### 2. [minor] Several branches of the new logic are untested
`tests/m4-exp1-explainer.test.ts`

Not covered:
- The `#collect` fallback: no tab, `prev` is body or null. This is exactly the load-time case, `app.ts:704`, where `doc.activeElement` is `body`. A regression to "focus lost" would not be caught.
- `prev !== doc.body` is not exercised on its own.
- The swallowed outside-tap path (`mine`). The only test that exercises `mine === false` is the timer case. No test covers an outside tap on a non-focusable area (`mine === true`), or an outside tap on a focusable element where focus has moved (`mine === false`). The existing swallow test (`:84`) asserts buy counts, not focus.

Impact: the behaviours the commit message and CCR major describe are only partly pinned.

Fix: add three small jsdom cases: (a) body-only DOM with a `#collect` button, close via Got it, expect `#collect` focused; (b) focus a sibling button, dispatch a capture click on it, expect that button stays focused; (c) the same on a non-focusable div, expect tab or `#collect`.

### 3. [minor] `||` in the visibility test returns a tab that can be non-rendered
`src/ui/tracks-explainer.ts:33`

Evidence: `tab.getClientRects().length > 0 || !tab.closest('[hidden]')`. In a real browser the second clause is true for any tab with no `[hidden]` ancestor even when it has zero rects (a `display:none` ancestor by class, a `content-visibility`, a collapsed container). The `||` was needed only to keep jsdom, which never has rects, working.

Impact: focus() is a no-op on a non-rendered element, so focus drops to `body`. This is the same symptom as the original bug. Today every closed sheet carries `[hidden]`, so there is no live trigger.

Fix: if the jsdom accommodation is wanted, say so in a comment, or test `tab.offsetParent !== null || getComputedStyle(tab).position === 'fixed'`. Simplest is to leave it and note the jsdom reason.

### 4. [nit] Fallback target `prev` may itself be non-rendered
`src/ui/tracks-explainer.ts:34`

`prev.isConnected` does not mean rendered or enabled. If the previous focus was in a sheet that has since closed, or on a button now `disabled`, `focus()` silently does nothing and focus is lost. It is a rare path (needs the sheet to close while the card is open). Optionally skip `prev` when `prev.closest('[hidden]')` is truthy and it has no rects, or check `document.activeElement === target` after and fall through to `#collect`.

### 5. [nit] Inaccurate wording in the commit and a test label
- The c0bb3de commit subject says "overridden by CSS at >=900". The docked media query is `min-width:960px` and landscape (`styles.css:157`).
- The rc0 check label `G5 focus not lost after Got it (sheet closed) at ${w}` is wrong at 1280. The panel is docked, not closed, and focus goes to the tab.

Neither affects behaviour.

## Regression and scope

- No behaviour change to the swallow path (variant B). The `onAny` and `onKey` handlers are untouched, and `EXP_CLOSED` is still dispatched on every close, so held toasts still play.
- `mine` is read before `off()` and before `el.remove()`. That is correct, because removing a focused node moves `activeElement` to `body`.
- Edge: on Safari, tapping a button does not focus it, so a swallowed outside tap on Buy can leave `activeElement` on `body`. The code then moves focus to the tab or Collect. That is harmless, because the tap is swallowed and the user intended to dismiss.
- Scope is tight: one source function, two focused tests and one browser assertion. There are no layout or CSS changes, so there is no layout risk at 360, 390 or 1280 beyond the focus target analysed above. Focus is moved with `preventScroll: true`, so there is no scroll jump.

## What I ran

- `git diff aa59600..c0bb3de`, plus a read of `tracks-explainer.ts`, `app.ts:74-101` and `:159-160` and `:703-704`, the relevant CSS blocks and the test file.
- `npx vitest run ... tests/m4-exp1-explainer.test.ts`: not completed. The worktree has no `node_modules`, so `npx` fetched an unrelated vitest and exited with `Unknown option --poolOptions`. I did not install dependencies, because the worktree is to stay unmodified.
- `npx tsc --noEmit`: not completed. My first compound Bash call that included it was denied by the permission mode, and I did not retry it after the missing `node_modules` result.
- No browsers were run. The layout conclusions come from reading the CSS.
- Test-pass status of the new tests is therefore unverified by me. The tests have been read, and I expect both new cases to pass.
