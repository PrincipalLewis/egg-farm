# Re-check: feat/offline-popup-v2 @ 6fe32b2 (PR #16)
Previous pass: feat-offline-popup-v2-e3daa15.md. Scope: `git diff e3daa15..6fe32b2` (6 files, +30/-14: `rc0-browser.mjs`, `hidden-time.ts`, `app.ts`, `format.ts`, `styles.css`, `offline-popup-v2.test.ts`). Reviewer: Sonnet 5.5 (code review). 2026-10-17.

**Result: 0 Blocker, 0 Major, 1 Minor, 3 Nit open.** Of the e3daa15 items, 6 are fixed, 3 are partly fixed, 1 needs a run to confirm, and the carry-overs are untouched. The one open Minor is that the new fade-mask check probably never executes.

## What was and wasn't run
- I read the full diff plus the surrounding `game.ts` (`endHidden`, `resumeFromHidden`, `save`), `app.ts` (`closeModal`, `fit`, the recovery branch), `styles.css` (`:455-480`), `format.ts` and `hidden-time.ts`.
- **Ran:** `npx vitest run tests/offline-popup-v2.test.ts`: 36/36 pass, including the two new tests.
- **Ran:** `npx vitest run` (full): 548 pass, **3 fail** in 2 files, none touched by this diff:
  - `tests/economy.test.ts`: "fixture is fresh vs the live reference sim"
  - `tests/economy-copy.test.ts`: "data/economy.csv == product/economy.csv" and "check script exits 0"
  - They compare repo data against `product/` files. I did not check whether they also fail at e3daa15 or on the PR base. Please confirm they are unrelated or already known.
- **Not run:** `tsc --noEmit` (denied) and `npm run build:qa`. The `app.ts` expression below is type-plausible by reading only.
- **No browser, as instructed.** Every claim about `rc0-browser.mjs` is by reading the script. I cannot say which checks pass or fail in a browser.
- Still unverified from last pass: the Nunito 800 woff2 against `@fontsource/nunito`, and "Saves PR #25".

## e3daa15 items: status
| e3daa15 item | Status at 6fe32b2 |
|---|---|
| **Minor 1** short-screen checks don't detect the new CSS or the mask | **Half fixed.** The rule is now asserted and discriminates. The mask check is conditional on the body scrolling and likely never runs (Minor A). |
| **Minor 2** throw-path contract test; unasserted line | **Fixed.** The dead line is gone and the throw test is added. The module-level `finally` on throw is still not pinned (Nit B). |
| **Minor 3** title icon question | **Open, needs your run.** The check now asserts the icon is shown (`t.icon !== 'none'`). Nothing in the diff answers the Art & UX question, and my arithmetic says the icon may be hidden (details below). |
| **Minor 4** focus after recovery lands on Close | **Fixed.** |
| **Minor 5** carry-overs (Saves ownership, wide strings, test gaps, second-hide overwrite, `sim-rules.md` stale) | **Unchanged.** Not in this diff. |
| Nit 1 stale reset comment | **Fixed.** |
| Nit 2 subscriber throw starves the others | **Fixed.** Residual: the catch is silent (Nit A). |
| Nit 3 `format.ts` dead tier and `$1,000,000` boundary | **Half fixed.** The boundary is fixed. The dead `K` tier and `i === 0` branch remain. |
| Nit 4 shadowed `h`, `heldHidden` not cleared | **Fixed.** |
| Nit 5 sub-line gap, `100vh` fallback | **Fixed.** |
| Nit 6 `loadingdone` listener never removed | **Half fixed.** `{ once: true }` only helps if the event fires (Nit C). |
| Nit 7 double-tap on Settings X dismisses the popup | **Not addressed.** Fine to defer. |

## Verification
- **Minor 2 test.**
  - The throw test (`tests/offline-popup-v2.test.ts`, "CCR e3daa15 Minor 2") registers a throwing subscriber and a recording one. It asserts `endHidden()` returns an `offline-grant` result and the second subscriber still ran. It then asserts `frame()` advances `coop` and `save()` writes. Without the stub's try/catch the first assertion would throw, so it is a real regression test for Nit 2.
  - The per-game dedupe test creates two `Game`s with the same `startAt`, and both `endHidden()` calls return non-null. A module-global `Set` would return null for the second, so it discriminates.
  - The `onHiddenPeriodAccounted` import exists (`:13`).
- **Minor 4 (`app.ts:673`).** `(modalKind === 'welcome' ? $('#wbCollect') : null) ?? modal.querySelector(...) as HTMLElement | null` parses as `A ?? (B as T)`, because `as` binds tighter than `??`. It focuses Collect when the welcome card is open and falls back to the first button for other modals. `modalKind` is a fresh read inside the `.then` callback, so there is no stale narrowing. Both focus paths now land on Collect (this one, and `closeModal` at `:229`).
- **Nit 3.** `fmtMoneyCeil` traced by hand:
  - 99,950 → `$999.50`
  - 123,450 → ceil 1,235 → `$1,235`
  - 100,000 → `$1,000`
  - 99,999,901 → ceil 1,000,000 → 100,000,000 cents → `fmtCount(1e6)` = `1M` → `$1M`
  - 100,000,000 → `$1M`
  - 0 → `$0.00`
  - The updated test expectation matches, and the test run passes.
- **Nit 4.** The rename to `hg` removes the shadow of the `h()` HTML helper. `heldHidden = null` now runs before `showWelcome(hg)` on the direct path, so a stale grant cannot resurface.
- **Nit 5.** Base `.welcome-v2 .wb-sub{margin-top:-4px}` (`:470`) and the new `.welcome-v2 .wb-sub{margin-top:0}` in the media block have equal specificity, and the media rule is later, so it wins. Net gap under 480 px tall is 4 px (the `.wb-body` gap), the same as the 8 − 4 net at normal height. The `100vh` line precedes the `100dvh` line, as at `:458`.
- **Nit 2.** `for (const f of [...subs])` iterates a copy, so a subscriber that unsubscribes during the call is safe.
- **Major 1 recap.** `game.ts:108-111` is unchanged. The `finally` still releases the freeze. The stub's swallow means a subscriber throw no longer reaches that `finally`, but the null path is still covered by the older test.

## Findings

### Blocker
None.

### Major
None.

### Minor
**A. The fade-mask check is conditional and probably never executes.** `scripts/rc0-browser.mjs:560-561`
- `welcomeShort` runs at 360×420 and 320×568. The commit message says the card now fits at 360×420, and 568 px is ample, so `t.scrolls` is false in both. The mask assertion sits behind `if (t.scrolls)` and prints nothing when skipped.
- Result: deleting the `.wb-body.scrolls:not(.at-end)` mask rule leaves the script green, which was the e3daa15 Minor 1 scenario.
- The rule-active check (`h < 480`) is good. It asserts card height is above 0.8·vh + 1 and at most vh − 24 + 1, and the old 80vh cap fails it. It does depend on the content being taller than 337 px at 360×420. If that holds, the check passes. I cannot confirm it without a run.
- Fix: add a viewport where the body must scroll (for example 568×320, a landscape phone, cap 296 px), and assert `t.scrolls` there instead of skipping. Also print or fail when the guard is skipped, so a silent skip is visible.

### Nit
A. `src/save/hidden-time.ts:24`: the catch swallows silently. A broken popup subscriber (say, a throw inside `showWelcome`) now vanishes in dev and QA. Add `console.error` (or a telemetry call) in the catch, and make sure Saves' real module does the same.

B. `tests/offline-popup-v2.test.ts`: no test pins the `finally` against a throw from the accounting call itself. Because the stub now swallows subscriber errors, the new test passes with or without `finally`; only the null-path test needs it. A one-line spy that makes `accountHiddenPeriod` throw would cover it. Optional.

C. `src/ui/app.ts:260`: `{ once: true }` removes the listener only when a `loadingdone` event fires. Once the fonts are loaded and cached, no more events fire, so each popup still leaves a closure holding a detached card on `document.fonts`. Remove both `loadingdone` and `resize` in `closeModal`, or in `fit`'s early-return branch.

Carried, unchanged:
- `format.ts:2,9`: dead `K` tier and `i === 0`.
- The `fmtMoneyCeil` comment says deficits are "rounded UP from $1,000". That holds below $1M only: at $1,234,001 the short form shows `$1.23M`, under the need. This predates the diff.

## Title icon (e3daa15 Minor 3), still to confirm
- The new assertion makes the browser check fail if the icon is hidden. The question to Art & UX is still not answered in the diff.
- My earlier arithmetic: the card is 320 px wide at every viewport from 360 up. After padding and the head's 2 × 32 px inline padding, about 148 px remain for "Welcome back!" next to the 48 px icon and 8 px gap. Fredoka at 23–28 px likely needs about 150–200 px, so `fit()` would add `no-icon` at all four widths in `welcomeTitle`.
- This is an estimate, not a measurement. If your run is green, the estimate was wrong and this item is closed. If it is red, the icon cannot show at these widths and the product question stands.
- Please attach the browser output for `welcomeTitle` and the 360×640 shot.

## Suggested before merge
- Run `npm run build:qa` and `tsc --noEmit`; I could not.
- Run `rc0-browser.mjs` (`welcomeTitle`, `welcomeShort`) and share the results.
- Add a must-scroll viewport for the mask (Minor A).
- Confirm the 3 failing economy tests are unrelated to this PR.
- Remaining carry-overs (Minor 5 of e3daa15) are unchanged.

Counts: 0 Blocker, 0 Major, 1 Minor, 3 Nit open; e3daa15 items: 6 fixed, 3 partly fixed, 1 needs a run, carry-overs unchanged.
