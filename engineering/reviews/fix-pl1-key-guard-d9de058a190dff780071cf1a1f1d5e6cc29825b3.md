# Review: PL-1 keyboard guard (d9de058)

Range: `90a9c84..d9de058a190dff780071cf1a1f1d5e6cc29825b3` (branch `fix-pl1-key-guard`, base `rc/m4-default-on`)
Files: `src/ui/app.ts` (+2/-1), `src/ui/key-guard.ts` (new, 7 lines), `tests/pl1-key-guard.test.ts` (new, 21 lines)

## Summary

| Severity | Count |
|----------|-------|
| critical | 0 |
| blocker  | 0 |
| major    | 1 |
| minor    | 2 |
| nit      | 2 |

Verdict: approve after the major is addressed (or explicitly accepted). The code change is small and low-risk. The test, though, does not prove the ticket is fixed.

**Review limitation:** the Bash tool was denied part-way through this session. I could not run vitest or `tsc --noEmit`, and I could not grep the tests or the QA ticket text. Everything below comes from reading the diff and `src/ui/app.ts`. Re-run the two commands under "What I ran" before merging.

## Findings

### 1. [major] Test exercises a hand-written model, not the app. It cannot catch a broken or missing wiring, and it doesn't show the ticket is fixed
`tests/pl1-key-guard.test.ts:4-12`, `src/ui/app.ts:282`

Evidence:
- `press()` is a simulator. It calls `keyGuard` and then itself decides "native activation = click on Enter/Space unless prevented". Nothing in the test touches `mountApp` or a real DOM `keydown`.
- Reverting `app.ts:282` to the old inline Escape handler leaves the whole suite green, because `keyGuard` is never imported by anything except `app.ts`.
- The Escape case "never buys" is vacuous. The model only buys on Enter or Space, so `buy` stays uncalled for Escape even if `keyGuard` did nothing. The only meaningful assertions in that case are `close` and `stopPropagation`.
- The "other keys never buy" case is likewise independent of `keyGuard`.
- Every simulated target is a button. The branch "repeat on a non-button target is not prevented" is never covered. That includes a `document` or `body` target, which has `closest` undefined, and a `null` target.
- I could not read the QA-D-1019-1 ticket. A native `<button>` is never activated by Escape in any browser, so it is unclear which real sequence produced a buy on Escape. Possible causes:
  - focus moved onto a buy button after the modal or panel closed, or
  - held Enter or Space repeating on a freshly focused buy button.

  Only the second is addressed by the guard. If the QA repro was the first, the fix may not cover it.

Impact: the regression the ticket describes can come back, or may not be fixed at all, with CI still green.

Fix:
- Add a jsdom-level test that mounts the app. See how other UI tests such as `tests/ftue-v11.test.ts`, `tests/offline-modal.test.ts` and `tests/p3-collection-card.test.ts` do it. The test should:
  1. focus a real buy button in `#uRow`;
  2. dispatch `new KeyboardEvent('keydown', {key:'Escape', bubbles:true, cancelable:true})` and assert that no dispatch or buy occurred and the panel or modal closed;
  3. dispatch a `keydown` with `{key:'Enter', repeat:true, cancelable:true}` and assert `defaultPrevented === true`;
  4. dispatch the same event with `repeat:false` and assert `defaultPrevented === false`.
- Add `keyGuard` cases for a non-button target and a null target.
- Record the real QA repro steps in the commit or PR body so the reviewer can confirm they match what is guarded.

### 2. [minor] `stopPropagation()` is a no-op for its stated purpose, and Escape is now always `preventDefault`ed
`src/ui/key-guard.ts:5`, `src/ui/app.ts:282`

Evidence:
- The listener is registered on `document` in the bubble phase. `stopPropagation` there only stops propagation to `window`. It does not stop other `document` listeners (that needs `stopImmediatePropagation`).
- The capture-phase Escape handlers in `onboarding.ts:158-159` and `save-recovery.ts:68-75,120` already run earlier and use `stopImmediatePropagation`, so ordering with them is fine.
- Previously the handler never called `preventDefault` on Escape. Now every Escape, including when no modal or panel is open (the `openPanel(null)` branch), is default-prevented. Native consumers such as an open `<select>`, an IME composition (`isComposing` is not checked), or a screen-reader or browser shortcut will see a cancelled event.

Impact: low. It is a behaviour change nobody asked for, and the comment and test imply a stopping effect that doesn't exist.

Fix: drop `stopPropagation`, or use `stopImmediatePropagation` if suppression is really intended. Only `preventDefault` when something was actually closed (have `closeTop` return a boolean), and skip when `e.isComposing`. Update the test's `stopPropagation` assertion to match.

### 3. [minor] Held Escape still repeats, and unwinds modal then panel
`src/ui/key-guard.ts:5`

Evidence: the Escape branch runs before any `repeat` check. Holding Escape closes the top modal (`closeModal` or `grantWelcome(false)`), then the next repeat calls `openPanel(null)` and closes the panel as well. For the welcome modal, the first repeat calls `grantWelcome(false)`. That is the dismiss path, so I don't think it loses earnings, but I didn't verify it.

Impact: a held key dismisses more layers than one press would. The ticket title says "no held-key repeat buys", so this is arguably out of scope. It is still inconsistent with the "fresh press only" principle in the file's header comment.

Fix: `if (e.key === 'Escape') { if (!e.repeat) closeTop(); … }`, and add a test.

### 4. [nit] Space half of the repeat guard does nothing
`src/ui/key-guard.ts:6`

Evidence: native button activation on Space happens at `keyup`, once. Repeated Space `keydown`s never produce a click, so preventing them changes nothing. Enter fires `click` on every auto-repeat `keydown` in Chrome and Firefox, and that is the real fix. The test models Space as repeating buys, which no browser does.

Impact: none functionally. The tests and the comment are slightly misleading.

Fix: keep Space in the condition if you want it, but say in the comment that it is Enter that matters. Make the test model reflect real behaviour.

### 5. [nit] Scope and style
`src/ui/app.ts:9`, `src/ui/key-guard.ts:6`

- The guard applies to every `button`. It now also blocks a held Enter on Collect (`collectBtn`) and on the nav, tab, Sell and Sell all buttons. That is probably desired. It is wider than "buys" and worth one line in the PR body.
- The new import is inserted between the two existing `./format` imports (lines 8 and 10), which were already split. Moving it below them would keep the file tidy.

## Checks with no findings
- **Layout at 360/390/1280:** the diff touches no CSS, markup or sizing. There is no layout impact, and I did not run a browser.
- **Type safety:** `KeyEv` is structural and `KeyboardEvent` satisfies it, so `app.ts:282` should type-check. I could not confirm with `tsc`.
- **`closest` on a non-element target:** `document.closest` is undefined, so the guard reads `undefined` and doesn't throw. A null target is handled by `?.`.
- **Escape dispatch logic:** the `modalKind === 'welcome'`, then `modalKind`, then `openPanel(null)` order is identical to before. Behaviour is unchanged apart from the `preventDefault`/`stopPropagation` calls in finding 2.

## What I ran
- `git log` and `git diff --stat` for the range.
- `git diff 90a9c84..d9de058a…`, plus reading `src/ui/key-guard.ts` and the handler sections of `src/ui/app.ts` (lines ~175-285).
- **Not run (Bash denied mid-session):**
  - `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/pl1-key-guard.test.ts`
  - `npx tsc --noEmit`
- No browsers were run, and the worktree was not modified.
