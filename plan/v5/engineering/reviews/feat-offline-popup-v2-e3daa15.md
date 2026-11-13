# Review: feat/offline-popup-v2 @ e3daa15 (PR #16, base 7d52952)
Previous pass: feat-offline-popup-v2-0470045.md. Spec: product/collection/offline-popup-v2-spec.md v0.3.1. Reviewer: Sonnet 5.5 (code review). 2026-10-17.

**Result: 0 Blocker, 0 Major, 5 Minor, 7 Nit.** The Major (freeze release) is fixed correctly. Minors 1, 3, 4 and 7 are fixed, and Minor 2 is half fixed. Nits 1, 2, 3 and 5 are fixed; nit 4 is half fixed. The new short-screen CSS and the fade mask are sound. The new browser checks barely test them (Minor 1 below).

## What was and wasn't run
- I read `git diff 0470045..e3daa15` in full (src, tests, both browser scripts, the new font file entry) plus the surrounding `game.ts`, `main.ts`, `app.ts`, `styles.css`, `format.ts`, `hidden-time.ts` and `welcome-v2.ts`.
- **I did not run `vitest`, `tsc --noEmit` or `npm run build:qa`.** The session's permission mode denied them, as it did last pass. Please run `npm test` and `npm run build:qa` before merge. Every claim below that a test "passes" is a hand trace of the code, not a run.
- No browser was run, as instructed. Layout statements are arithmetic from the CSS.
- I could not check the new `nunito-latin-800-normal.woff2` byte by byte. The tool denied the `cmp` against `@fontsource/nunito`. The diff shows it as a 16,520-byte binary, and `public/fonts` already holds `LICENSE-nunito-OFL.txt` and `OFL.txt`. Please confirm it comes from `@fontsource/nunito` (latin, 800) and is not a copy of the 700 file.
- "Saves PR #25" in the stub header is unverified; I have no access to that PR.
- `ReportFindings` was not used; this file is the report.

## 0470045 findings: status
| 0470045 | Status at e3daa15 |
|---|---|
| **Major 1** (freeze released only inside the collaborator) | **Fixed.** `endHidden` now clears `hiddenSince` in `finally` (`game.ts:108-110`). Details below. |
| Minor 1 (hidden grant dropped while Settings/confirm is open) | **Fixed in code.** `heldHidden` is set (`app.ts:684`), and `closeModal` shows it and focuses `#wbCollect` (`app.ts:228-229`). The recovery path consumes it too (`:673`). Only the browser script covers it (Nit 2, Minor 1 below). Residuals are in Minor 5. |
| Minor 2 (icon never visible; no re-fit on font load) | **Half fixed.** `fit` re-runs on `document.fonts.ready` and `loadingdone` (`app.ts:260`). The icon question to Art & UX is still open (Minor 3 below). |
| Minor 3 (Nunito 800 not shipped) | **Fixed.** The `@font-face` is at `styles.css:5` and the file is in `public/fonts`. See the "unverified" note above. |
| Minor 4 (read-only game grants and shows the popup) | **Fixed.** `readOnly` is in both guards (`game.ts:104,117`) and a test covers it (`tests/offline-popup-v2.test.ts` "Minor 4"). |
| Minor 5 (integration risk with Saves' branch) | Header now carries the ticket id (`hidden-time.ts:4`). The Game-side ownership and the "close while hidden" check are still open (Minor 5 below). |
| Minor 6 (wide strings outside the HUD) | Not addressed (Minor 5 below). |
| Minor 7 (test gaps) | **Partly fixed.** `fmtMoneyCeil` and `moneyWords` are unit tested, and the $3.00 comment is corrected. C-AC37/38/39 are still source greps, `welcomeFromHidden` gating has no vitest test, and the browser script is not in CI (Minor 5 below). |
| Minor 8 (docs stale) | Not addressed. `engineering/sim-rules.md:11` still says a hidden gap of 60 s or more is frozen "No in-session grant". |
| Nit 1 (`fromHidden` stale) | **Fixed.** It is now a `showWelcome(hg)` parameter. |
| Nit 2 (orphaned doc comment) | **Fixed.** |
| Nit 3 (`h` shadowed in `showWelcome`) | **Fixed there.** `welcomeFromHidden` still has `const h = gate(r)` (Nit 4 below). |
| Nit 4 (`format.ts` dead tier, comment, `$1,000,000`) | **Half fixed.** The comment is updated. The dead `K` tier and the boundary case remain (Nit 3 below). |
| Nit 5 (`done` keyed by `startAt`, never pruned) | **Fixed enough for a stub.** It is now a `WeakMap<Game, Set>`. The doc comment is stale (Nit 1 below). |
| Nits 6, 7, 8, 9 | Untouched, as expected. |

## Major 1: verification
`game.ts:106-111`: `startAt` is read, then `try { return accountHiddenPeriod(...) } finally { this.hiddenSince = null }`. I traced the four cases:
- **Module calls `resumeFromHidden`** (the stub today): `hiddenSince` is cleared inside it, and the `finally` is a no-op. Same behaviour as before.
- **Module returns `null`** (already accounted): no callback happens, and the `finally` unfreezes. `frame()` and `save()` work again.
- **Module never calls back into Game** (a real module that does its own accounting): same as above.
- **Module throws, or a subscriber throws:** the `finally` runs and the exception reaches the `visibilitychange` handler. The game is not left frozen.

Two things to know. Neither blocks merge.
- On the null, throw and never-calls-back paths nothing is granted and `lastFrameAt` is old. The next `frame()` takes the existing visible-gap path (`game.ts:185-190`): it simulates 60 s and drops the rest. The hidden time is lost silently, but the game keeps running and saving, which is what the Major was about. The Saves contract should say so.
- `hiddenSince` is cleared after the module returns. If the real module does not call `resumeFromHidden`, its subscribers run while the game is still frozen, and any `save()` they trigger is a no-op. The stub does not hit this. To be robust, clear `hiddenSince` before the call and have `resumeFromHidden` read the start time from a parameter. That is a design choice, not a defect today.

The new test ("Major (CCR 0470045)") exercises the null path. I traced it against the old code (no `finally`): `frame()` returns early, `coop` stays 0, and the test fails. So it does catch a regression. It does not cover the throw path (Minor 2).

## Minor 1/4/7: verification
- **Minor 1.** `closeModal` captures `was`, clears the modal, and then shows the held grant if `was !== 'welcome' && !recoveryOpen && pendingOfflineEggs > 0` (`app.ts:228-229`). It is not re-entrant: its only callers are `grantWelcome` (`was === 'welcome'`, skipped), the generic close click (`:288`) and Escape (`:301`). `cCancel` goes through the same click path, so a reset-confirm Cancel also works. `dismissOffline` and `collectOffline` both clear `pendingOfflineEggs` (`actions.ts:64`), so closing the welcome never re-triggers it. The browser check (`offline-v2-browser.mjs`, "CCR Minor 1") is the right shape: Settings open, `welcomeFromHidden`, Escape, then a popup that is focused on `wbCollect`, shows "Away 11m 23s" and "+2,732 eggs". The same `periodId` again returns `false`. I could not run it.
- **Minor 4.** The guards are in both `suspendForHidden` and `resumeFromHidden`. `refuseNewer` also sets `inactive`, so a later newer-save refusal is covered too.
- **Minor 7.** Boundary values in `fmtMoneyCeil` and `moneyWords` are right by hand trace: 99,950 → `$999.50`, 123,450 → `$1,235`, 100,000 → `$1,000`, 100,000,000 → `$1M`, 8,640,000 → `86,400 dollars`, 81,240 → `812 dollars 40 cents`, and the NaN case. The $3.00 comment now matches the code.

## Art & UX short-screen CSS and fade mask
`styles.css:478-480`.
- **`@media (max-height:479px){.welcome-v2{max-height:calc(100dvh - 24px)} .wb-body{gap:4px}}`.** It overrides the base `.welcome-v2{max-height:80vh;80dvh}` at `:458` because it is later in the file at equal specificity. `#modal-layer` has no padding, so the card gets 12 px above and below. At 360×420 the cap rises from 336 to 396 px (estimate). `.wb-body` is already `flex:1 1 auto; min-height:0; overflow-y:auto`, so the Collect button stays pinned and the body is the part that shrinks. That is the right structure.
- **Mask.** `.wb-body.scrolls:not(.at-end)` fades the bottom 16 px. A CSS mask on a scroll container is positioned against the element box, not the scrolled content, so the fade stays fixed at the bottom edge, which is what you want. The fade shows the card background through the body, which has no background of its own. `edge()` runs on `scroll`, on `fit()` (open, resize, fonts), and after the rate line is hidden or shown, so `scrolls` reflects the final layout. The `at-end` test uses `scrollTop + clientHeight >= scrollHeight - 1`, so it tolerates fractional scroll on high-DPI. At the end the mask is removed, so the cap line (about 5.7:1) is not faded when it can be read. The `-webkit-` and unprefixed declarations are identical. I see no defect.
- **`.wb-sub{margin-top:-4px}` (`:470`) is not adjusted.** With `--s-2` = 8 px, the old gap net of the margin was 4 px. With the new 4 px gap it is 0, so the sub-line touches the hero under 480 px tall (Nit 5).
- **No `100vh` fallback for `calc(100dvh - 24px)`.** The base rule has one. On a browser without `dvh` support the declaration is dropped and the 80vh rule stays. That is safe, but the 396 px cap is not reached.
- **Pointer behaviour.** The mask does not affect hit-testing, and nothing in the body is interactive. Fine.

## rc0 `welcomeTitle` / `welcomeShort`
- **`welcomeTitle`** is unchanged since 0470045 (reported there). It still reports the icon's `display` without asserting it, and it still waits only 300 ms (Minor 3).
- **`welcomeShort`** (`rc0-browser.mjs:545-560`) is well built. It uses the same `open`/`DONE` setup as `welcomeTitle`. It checks truncation on the right set of lines (`h2`, line A, hero, sub, worth, cap, Collect). It waits 1,300 ms so the count-up is over. It scrolls the body to the end and checks the cap line inside the body rect, the card on screen, and Collect at least 48 px tall and inside the card. The data gives `awayS` 11,520 against a 7,200 cap, so the cap line exists and `cap` is not null. A missing cap would show up as "welcomeShort threw", not a silent pass.
- **It does not test the new rule or the mask.** The checks are an upper bound on card height (`k.bottom <= innerHeight`), and a card capped at the old 80vh (336 px at 420) passes them as well as one capped at 396 px. Nothing asserts `scrolls`/`at-end`, the computed `mask-image`, or that the fade is gone at the end (Minor 1).
- **320×568 is not under the media query** (568 ≥ 480). That shot tests the 80dvh rule, not the new one. It is still a useful narrow-width case, but the name "short" is misleading. The 360×420 and 375×… cases carry the new CSS.

## Spec conformance (static)
Unchanged from 0470045 except where noted. C-AC33: the short-height wording ("rate line is the first to drop") still holds: `fit()` hides the rate only when the body overflows, and the browser check now accepts `!bodyScrolls || rateHidden`. That relaxation is correct, because the new cap can leave room for the rate line at 360×420. C-AC36: the freeze is now released on every path (Major 1). C-AC39: weight 800 is served (Minor 3). C-AC27/28/29/30/31/32/34/35/37/38: no change in this diff.

## Findings

### Blocker
None.

### Major
None.

### Minor
1. **The new short-screen checks do not detect the new CSS or the mask.** `scripts/rc0-browser.mjs:545-560`, `scripts/offline-v2-browser.mjs:64-65`
   - Both only assert an upper bound on card height (`<= vh - 24` or `<= 80%`), which the old 80vh rule also meets. Neither asserts `.scrolls`/`.at-end`, a non-`none` `mask-image` while scrolled partway, or `none` at the end.
   - Failure scenario: someone deletes the media rule or the mask and both scripts stay green.
   - Fix: in `welcomeShort`, before scrolling, assert `body.scrollHeight > body.clientHeight` implies `scrolls` and `!at-end` and `getComputedStyle(body).maskImage !== 'none'`. After scrolling to the end, assert `maskImage === 'none'`. Add one assertion that fails on the old rule: at 360×420 the card is taller than 0.8·vh, or the body does not scroll.
2. **The freeze-release contract test covers only the null case.** `tests/offline-popup-v2.test.ts` ("Major (CCR 0470045)")
   - The throw path and the "subscribers run while frozen" order are not tested. My 0470045 review asked for null, throw and never-calls-back.
   - The first line (`accountHiddenPeriod({resumeFromHidden: () => 0, …} as any, …)`) has no assertion. It reads like a per-game-dedupe check but checks nothing.
   - Add: a fake `accountHiddenPeriod` (or a subscriber) that throws, then assert `endHidden` rethrows, the game is unfrozen and `save()` writes. Delete the unasserted line or give it an expect.
3. **The title icon question is still open.** `src/ui/styles.css:462-463`, `src/ui/app.ts:255-256`, `scripts/rc0-browser.mjs:540`
   - Carried from 0470045 Minor 2. The re-fit on fonts is done, but nobody has said whether the icon should show at 360 px.
   - By my estimate (content 268 px, minus 64 px side padding, minus the 48 px icon and 8 px gap, leaves about 148 px), "Welcome back!" at 22 px plausibly overflows and the icon is hidden at every phone width.
   - `welcomeTitle` reports `icon` but does not assert it, so it passes either way.
   - Ask Art & UX, and attach 360×640 and 1280 screenshots of the final title.
4. **After the recovery dialog, focus lands on Close, not Collect.** `src/ui/app.ts:673`
   - The commit message says the held grant is "shown + focused when it closes (incl. recovery)". The recovery branch focuses `modal.querySelector('button.btn, button')`. In the welcome card the first `button` in document order is `.icon-btn.close`, which comes before `#wbCollect`.
   - Enter on Close calls `dismissOffline`, which credits the same eggs without flyers, so nothing is lost. But it is not the Collect focus that the other two paths give, and the browser script never exercises this path.
   - Fix: after `showWelcome(...)` in this branch, focus `#wbCollect` if `modalKind === 'welcome'`.
5. **Still open from 0470045; this diff does not touch them.**
   - Game-side ownership with Saves' branch (0470045 Minor 5). Agree who owns `frame()`/`save()`, and add the "hide, wait H, pagehide, reload gives the same N" test after the swap. `sim-rules.md` says a close-time copy is written to IndexedDB, and a tab closed while hidden could stamp the close time.
   - Wide-string screenshots (0470045 Minor 6): `fmtCount`/`fmtMoney` now reach "999,999" and "$999,999" in the Sell-all bar, Buy buttons, "Hire $…", order-card Sell buttons and floaters. Needed at 360×640 with coins near $999,999 and a basket of 99,999 or more.
   - Test gaps (0470045 Minor 7): C-AC37/38/39 are still source greps. `welcomeFromHidden` gating (recovery open, other modal, welcome already open) has no vitest test. The browser scripts are not in `package.json` or CI.
   - A second hide of 60 s or more while a hidden-return popup is still open settles that popup's eggs into the Basket without Collect (`resumeFromHidden`, `game.ts:118`), and the first popup's count disappears without feedback. With Minor 1 fixed, `heldHidden` can now also be overwritten by a second grant while Settings is open. Same effect, same cause.
   - `engineering/sim-rules.md:11` and `:43` are stale (0470045 Minor 8).

### Nit
1. `src/save/hidden-time.ts:26`: the comment on `__resetHiddenTimeStub` still says it forgets accounted periods; it now only clears subscribers. `done` is a `WeakMap`, so it cannot be cleared and only new `Game` objects start clean. Update the comment. A test that reuses one `Game` across a reset will now get `null` for a repeated `startAt`.
2. `src/save/hidden-time.ts:24`: `subs.forEach(f => f(r))` stops at the first throwing subscriber, so a throwing popup subscriber starves the others (telemetry in the final module). `endHidden` now releases the freeze, but the later subscribers are skipped. Wrap each call in try/catch in the stub, and say so in the contract for Saves.
3. `src/ui/format.ts:2,9,23`: the `K` tier and the `i === 0` branch of `dp` are dead after the `n < 1e6` shortcut. `fmtMoneyCeil(99_999_901)` returns `"$1,000,000"` while `fmtMoneyCeil(100_000_000)` returns `"$1M"`; the new test pins the long form at the boundary (`tests/offline-popup-v2.test.ts`, "fmtMoneyCeil rounds deficits up…"). The spec rule is short form from $1M. Ceil first, then format, so `$999,999.01` shows `$1M`.
4. `src/ui/app.ts:682`: `const h = gate(r)` shadows the module-level `h()` HTML helper (`:34`). Harmless here, because no `h()` call is in scope, but it is the pattern nit 3 asked to remove. `heldHidden` is also not cleared by `welcomeFromHidden` when it shows a popup directly, so a stale held grant could survive until the next `closeModal` with pending eggs. It cannot happen on the paths I traced; clear it there anyway.
5. `src/ui/styles.css:470,479`: under 480 px tall `.wb-sub{margin-top:-4px}` plus the 4 px gap leaves 0 px between hero and sub-line; adjust it in the media block or confirm with Art. Add a `max-height:calc(100vh - 24px)` line before the `dvh` one, like `:458`.
6. `src/ui/app.ts:260`: `document.fonts.addEventListener('loadingdone', fit)` is never removed. `fit` removes only its `resize` listener when the card is gone. Each popup opened leaves a closure holding a detached card on `document.fonts`, and every later `loadingdone` runs all of them. Small, but a hidden-return popup can open many times in a mobile session. Remove it in the same early-return branch, or use `{ once: true }` with the `fonts.ready` promise only.
7. `src/ui/app.ts:228-229`, `:301`: closing Settings now reveals a welcome popup whose Close button is in the same place. A double-tap on Settings' X, or a held Escape (auto-repeat), dismisses the new popup at once. Nothing is lost (`dismissOffline` credits the eggs), but the player never sees it. A short ignore window after `showWelcome` from `closeModal` would fix it. Also `sfx('uiClose')` and `sfx('welcomeBack')` play together on the click path.

## Suggested before merge
- Run `npm test`, `tsc --noEmit` and `npm run build:qa` (I could not).
- Confirm the Nunito 800 file is the real `@fontsource/nunito` latin 800 and that no asset list or precache lists fonts by name (grep `nunito-latin-700` across the repo and the build scripts).
- Get Art's answer on the title icon (Minor 3) and the 0-px sub-line gap (Nit 5), with the 360×420, 320×568, 360×640 and 1280 shots.
- Strengthen `welcomeShort` (Minor 1) and add the throw case to the contract test (Minor 2). Both are small.
- Fix Minor 4 (one line).

Counts: 0 Blocker, 0 Major, 5 Minor, 7 Nit.
