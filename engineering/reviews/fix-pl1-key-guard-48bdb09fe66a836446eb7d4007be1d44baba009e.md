# Review: PL-1 keyboard guard recheck (48bdb09)

Range: `90a9c84..48bdb09fe66a836446eb7d4007be1d44baba009e` (branch `fix-pl1-key-guard`, base `rc/m4-default-on`)
Files: `src/ui/app.ts` (+5/-1), `tests/pl1-key-guard.test.ts` (new, 57 lines), `package.json` (+1 devDep `jsdom`), `package-lock.json` (+506, jsdom tree only).
Net effect against base: `key-guard.ts` from d9de058 is gone. The guard is now inline in the `document` keydown handler.

## Summary

| Severity | Count |
|----------|-------|
| critical | 0 |
| blocker  | 0 |
| major    | 0 |
| minor    | 2 |
| nit      | 3 |

Verdict: approve. The one major in my review of d9de058 (the test used a hand-written model, not the app) is resolved. The new test mounts the real `mountApp` and dispatches real `KeyboardEvent`s, so deleting or breaking the handler fails it. The remaining findings are about how closely the test matches real browser behaviour and about Escape edge cases.

**Review limitation:** Bash was denied when I tried to run `npx tsc --noEmit` and the vitest file, so I did not run either. Everything below comes from reading the diff and `src/ui/app.ts`. Run both commands under "What I ran" before merging. Do not take the test as green on my word.

## Findings

### 1. [minor] The test re-focuses the rebuilt Buy button before every key. The real app does not, so the test shows a scenario that cannot occur for Buy buttons
`tests/pl1-key-guard.test.ts:23-25`, `src/ui/app.ts:570`

Evidence:
- `live()` calls `b.focus()` on the freshly queried button each time. The comment says the button "is re-rendered after a purchase".
- `render()` replaces the whole row with `uRow.innerHTML = html` whenever the markup changed. A purchase changes level and price, so it always changes. Nothing restores focus: the only `.focus()` calls in `app.ts` are line 438 (goal jump) and line 693 (start-up).
- In a real browser, after the first Enter buy the focused element is removed and focus falls to `<body>`. Later auto-repeat keydowns then target `body`. The guard skips them (`body.closest('button')` is null), and so does native activation, because nothing is focused.
- So the guard cannot be reached by a held Enter on a Buy button that has just bought. It is reachable when the row is not rebuilt: an unaffordable (`aria-disabled`) Buy button, Collect, Sell all, the nav and tab buttons, and the Upgrade Farm `.link` button.
- The test therefore proves "if focus survives a re-render, repeats are suppressed". It does not prove what happens to a real user on the Buy button. Nor does it show that QA-D-1019-1 is fixed. A native `<button>` is never activated by Escape in any browser, and I still could not find the ticket's exact repro sequence.

Impact: low. The code change is harmless and the test would fail on a broken guard. But the test's claim "held Enter buys exactly once" holds in a browser for a different reason (lost focus) than the one it demonstrates. A future change that restores focus after a buy would make the guard load-bearing, and by then the behaviour would be unchanged anyway.

Fix:
- Say in the comment that focus loss is not modelled.
- Add one case with the button not re-rendered. For example, set coins low so the buy fails and `uRow` is not rebuilt, hold Enter, and assert `defaultPrevented` and zero buys.
- Have QA confirm the real repro in a real browser, which the next Playwright pass can do.

### 2. [minor] Held Escape still unwinds more than one layer (carried over from d9de058 finding 3)
`src/ui/app.ts:283`

Evidence: the Escape branch has no `e.repeat` check. A held Escape closes the top modal on the first event and then calls `openPanel(null)` on each later repeat, closing the panel too. For `modalKind === 'welcome'` the first event calls `grantWelcome(false)`, the dismiss path. I did not verify that it loses no earnings. The fresh-press principle in the new comment ("one press = one level") is applied to Enter and Space only.

Impact: a held Escape dismisses more layers than one press would. Low, and arguably outside "no held-key repeat buys".

Fix: `if (e.key === 'Escape') { e.preventDefault(); if (e.repeat) return; ... }`, and add a test.

### 3. [nit] Escape is always `preventDefault`ed, even when nothing is open or during IME composition
`src/ui/app.ts:283`

Evidence: `e.preventDefault()` runs before the `modalKind` and `openPanel(null)` dispatch, so it runs on every Escape. `e.isComposing` is not checked. There are no text inputs in the app today, so there is no known consumer. Dropping `stopPropagation` (present in d9de058) was correct: on `document` in the bubble phase it never did what its comment implied. The capture-phase Escape handlers in `onboarding.ts:158` and `save-recovery.ts:68,120` use `stopImmediatePropagation` and run first, so they are unaffected.

Impact: none today. Fix, if wanted: skip `preventDefault` when nothing was closed or when `e.isComposing`.

### 4. [nit] Two assertions cannot fail, so the real signal is the other assertion in each test
`tests/pl1-key-guard.test.ts:35,48`

Evidence:
- In the Escape test, `key()` only calls `t.click()` for Enter. So `expect(buys()).toBe(0)` holds whatever the handler does. What actually guards the fix is `defaultPrevented === true` and the panel-closed check.
- In the Space test, the model clicks once on keyup, so `buys() === 1` holds even with no guard. The `defaultPrevented === true` assertions on the repeats are what would fail. That matches the real mechanics: native Space activates on keyup, once, so the Space half of the guard changes nothing in practice. The Enter half is the real fix.

Impact: none. The tests are sensitive to the guard, but a reader may think the buy counts prove more than they do. Fix: add a comment saying so, or drop the vacuous `buys` assertions.

### 5. [nit] Each `mount()` leaves a live app instance behind
`tests/pl1-key-guard.test.ts:11-14`

Evidence: `mountApp` adds a `document` keydown listener, plus its timers or render loop, and nothing removes them. Later tests dispatch to the earlier tests' handlers as well. All instances run the same code, so a real regression still fails every test. But `defaultPrevented` is set by any listener, so the assertions cannot tell which instance set it. Fix, if wanted: reset with `vi.resetModules()` and a fresh `document`, or have `mountApp` return a disposer.

## Checks with no findings
- **Correctness of the handler:** the Escape dispatch order (`welcome` then other modal then panel) is unchanged. The repeat branch is `(Enter|' ') && repeat && target.closest('button')`. It is safe for a null target and for `document` or `window` targets (`closest?.` yields undefined). `closest` on an inner `<img>` or `<span>` inside a button works.
- **Test adequacy for the guard itself:** removing the handler, the `preventDefault` on Escape, or the repeat branch fails tests 1 to 3. A real `mountApp` and real `Game` are used. Only the jsdom gaps (`matchMedia`, rAF, `Audio`) are shimmed, and `dispatch` is spied on, not replaced.
- **Layout at 360, 390 and 1280:** the diff touches no CSS, markup or sizing. There is no layout impact, and I ran no browser.
- **Scope:** the guard now applies to every `button`, not only Buy buttons (Collect, nav, tabs, Sell). That is probably desired, and it is the same scope as d9de058. The jsdom devDependency is a dev-only addition of about 20 transitive packages (506 lock lines, no runtime or bundle impact). The `// @vitest-environment jsdom` docblock limits it to this file, so the other tests stay in the node environment. `npm install` may print a deprecation notice for `whatwg-encoding`, a transitive dependency of jsdom 26. That is cosmetic.
- **Types:** `(e.target as Element | null)?.closest?.('button')` should type-check, but I did not run `tsc`.

## What I ran
- `git diff --stat` and the full `git diff 90a9c84..48bdb09fe66a836446eb7d4007be1d44baba009e`, and `git log --oneline` for the range.
- `git show d9de058` to compare with the earlier version, and a re-read of my earlier review of that commit.
- Read `src/ui/app.ts` around the keydown handler, the click handlers (about lines 175-285) and the render path (lines 560-575). Grepped the other `keydown` listeners in `src/ui`.
- **Not run (Bash denied):**
  - `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/pl1-key-guard.test.ts`
  - `npx tsc --noEmit`
- No browsers were run, and the worktree was not modified.
