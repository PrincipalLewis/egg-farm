# Code review: M4 gate5 variant C, P46-M1 focus-return delta

- Range: `bac1c27..0d4c0fef091c1dd4edb5cfc4d954c2be4458d62d` (a1f7b07, 0d4c0fe), branch `m4-gate5-focusC`
- Files changed: `src/ui/tracks-explainer.ts` (+4/-3), `tests/m4-exp1-explainer.test.ts` (+15), `scripts/rc0-browser.mjs` (+2)
- Reviewer: Code Reviewer. The worktree was not modified.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| blocker | 0 |
| major | 0 |
| minor | 3 |
| nit | 3 |

**Verdict:** the fix does what the commit message says, and I found nothing that blocks it.
- Focus is restored only if it was on the card, on the card's descendants, or lost to `body`.
- The target order is: the active Upgrades tab if it is rendered, then the previously focused element, then `#collect`.
- This matches the stated rule. I checked it by reading the code against `styles.css` and `app.ts`.
- I could not run the tests or `tsc` (see "What I ran"). Everything below comes from reading the code, not from a test run.

## Findings

### 1. (minor) The `vis` predicate is `rects>0 || !closest('[hidden]')`, which bends production code to jsdom
`src/ui/tracks-explainer.ts:33`

Evidence:
- `tab && (tab.getClientRects().length > 0 || !tab.closest('[hidden]'))`
- jsdom always returns an empty `getClientRects()`. The `||` branch is what makes the unit tests pass.
- In a real browser the two clauses disagree only in one case: no `[hidden]` ancestor, but zero client rects. That means `display:none` from some other source, a detached subtree, or a zero-size layout.
- In that case the code treats the tab as visible, `focus()` silently does nothing, and focus falls to `body`. This is the bug the commit set out to remove.

Impact:
- None today. In the current app the only thing that hides the Upgrades sheet is the `[hidden]` attribute.
  - Mobile: `#panel-layer .sheet[hidden]{display:none}` (`styles.css:103`) gives no rects and a `[hidden]` ancestor, so the tab is rejected. Correct.
  - Docked (`min-width:960px` and landscape): `.sheet[hidden]{display:flex!important}` (`styles.css:163`) gives rects, so the tab is accepted. Correct.
- It is fragile if another hiding mechanism is added later, such as a class-based `display:none` or `content-visibility`.

Fix:
- Use `tab.getClientRects().length > 0` alone in production.
- In the tests, stub `HTMLElement.prototype.getClientRects` to return a non-empty list (or use `Object.defineProperty` on the element) for the "visible" cases.
- Alternative: `tab.checkVisibility?.()`, with the same stubbing in tests.

### 2. (minor) The docked branch and the `#collect` fallback have no unit coverage; the rc0 check is weak
`tests/m4-exp1-explainer.test.ts:187-199`, `scripts/rc0-browser.mjs:680-681`

Evidence, unit tests:
- The new "hidden Upgrades sheet" test covers a `[hidden]` ancestor with zero rects (jsdom), which gives `prev`. It would fail if the visibility check were removed, because jsdom's `focus()` ignores `display:none`. Good.
- The commit 0d4c0fe (docked layout, rects > 0 despite `[hidden]`) has no test.
  - Break `getClientRects().length > 0 ||` out of the predicate and every unit test still passes.
  - A regression to "never focus the tab inside `[hidden]`" would silently put focus on `prev` or `body` in the 1280 docked layout. No test notices.
- The third fallback, `doc.getElementById('collect')`, is never exercised. The existing "falls back to previous" test sets `prev=#other`. No test has `prev===body` with no visible tab.
- The "timer close leaves focus alone" test is good. It would fail if `mine` were always true.

Evidence, rc0:
- `fo !== 'BODY'` only proves that focus did not get lost.
- It does not check the target, which should be the active tab at 1280 and `prev` or `#collect` at 360/390.
- At 1280 the panel is docked (`openPanel` returns early when `docked.matches`), so the message "(sheet closed)" is wrong there.

Impact: the docked and Collect branches can regress unnoticed.

Fix:
- Add three unit tests, stubbing `getClientRects` where needed:
  - Zero rects plus a `[hidden]` ancestor.
  - Non-zero rects plus a `[hidden]` ancestor, which must focus the tab.
  - No tab and `prev=body`, which must focus `#collect`.
- Make the rc0 assertion target-specific: `w>=960 ? fo==='collection'|'farm'... : fo==='collect'|prev`.

### 3. (minor) `mine` treats `body` as "on the card", so a late timer close can still pull focus
`src/ui/tracks-explainer.ts:30`

Evidence:
- `mine = !ae || ae === doc.body || el.contains(ae)`.
- In variant C, outside taps register normally and the card stays for 8 s.
- If the user taps a non-focusable area, or Buy re-renders the focused `#uRow` button so focus drops to `body`, the 8 s timer close then calls `.focus()` on the tab or Collect.
- The spec line in the commit is "only when focus was on the card". The implementation also steals from the "lost" state.

Impact:
- Low. The focus ring only shows after keyboard use.
- A screen-reader user whose virtual cursor has focus on `body` could be moved unexpectedly 8 s after the card appears.
- Acceptable if "or lost" is intended, but then the commit message and tests should say so.

Fix:
- Decide the rule. Either:
  - Drop `ae === doc.body` for timer closes only. The click, Esc and Enter paths always have focus on the card or `body`.
  - Document it and add a test.

### 4. (nit) `prev` is not checked for visibility or disabled state
`src/ui/tracks-explainer.ts:34`

- `prev && prev.isConnected && prev !== doc.body`.
- If `prev` is still in the DOM but now inside a hidden sheet, for example a `[hidden]` Market or Upgrades row, `focus()` is a no-op. Focus goes to `body` and never reaches the `#collect` fallback.
- Fix: apply the same `getClientRects().length > 0` test, plus `!disabled`, to `prev` before using it.

### 5. (nit) Enter auto-repeat after closing via Enter can hit Collect
`src/ui/tracks-explainer.ts:34,37`

- Enter on Got it closes the card on keydown (`preventDefault`) and now moves focus to `#collect` (or `prev` when that is Collect, the common mobile case in Chrome).
- If Enter is held, the repeated keydown targets Collect and activates it, so the player collects eggs they did not intend to.
- Before this change focus went to a tab, which is harmless.
- Fix: close on `keyup` for Enter, or swallow repeats with `if (e.repeat) return` plus a one-shot guard.

### 6. (nit) Commit and comment inaccuracies
`src/ui/tracks-explainer.ts:33`; subject of 0d4c0fe

- The commit subject says "overridden by CSS at >=900", but the docked media query is `min-width:960px` and `orientation:landscape`.
- `scripts/rc0-browser.mjs:670` already uses `w < 900` for "mobile". At 900-959, or at 960+ in portrait, the sheet behaves as on mobile and `[hidden]` hides it. The code is right and only the wording is off.
- Fix: say "docked layout (>=960 landscape)" in the comment.

## Other checks

- **Regressions:**
  - Open and close paths (Got it, Esc, Enter, card tap, timer) all go through `close()`. `EXP_CLOSED` is still dispatched on every path, so held toasts still play.
  - The `!el.isConnected` early return is unchanged.
  - Both `off()` calls remain.
- **Layout at 360, 390 and 1280:** no CSS or markup change. `focus({preventScroll:true})` prevents any scroll or layout shift. At 1280 focus lands in the docked side panel, which is intended. Nothing to flag.
- **Scope:** the three files are all in scope. The rc0 additions are limited to the g5 section.

## What I ran

- `git diff bac1c27..0d4c0fe`, the full `tracks-explainer.ts` source, the app/panel code (`app.ts` 78-125 and 168-176) and `styles.css` (100-106, 155-170, 512-517), plus the touched rc0 section.
- `npx vitest run ... tests/m4-exp1-explainer.test.ts`: **did not run.**
  - The first attempt used `npx` and resolved a global vitest, which rejected `--poolOptions`.
  - That suggests the worktree has no local `node_modules`.
  - After that, Bash was denied in this session ("don't ask" mode), even for `ls`, so I could not diagnose or retry.
- `npx tsc --noEmit`: **did not run.** A Bash denial hit the first combined attempt, before it produced any output.
- No test or typecheck pass or fail is claimed here. The findings are from static reading only. Run the explainer test file and `tsc` in the real checkout before merging.
