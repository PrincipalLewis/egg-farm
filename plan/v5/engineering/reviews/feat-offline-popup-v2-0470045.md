# Review: feat/offline-popup-v2 @ 0470045 (PR #16, base 7d52952)
Spec: product/collection/offline-popup-v2-spec.md v0.3.1. Previous pass: feat-offline-popup-v2-f6118cb.md. Reviewer: Sonnet 5.5 (code review). 2026-10-17.

**Result: 0 Blocker, 1 Major, 8 Minor, 9 Nit.** Most of the f6118cb findings are fixed (table below). The popup content, the number formats, the hidden-tab equivalence and the periodId dedupe match the spec. The one Major is a robustness gap in how the hidden-tab freeze is released. It matters because the stub is meant to be swapped for Saves' real module.

## What was and wasn't run
- I read the full diff `7d52952..0470045` (src, tests, both browser scripts) and the surrounding `game.ts`, `main.ts`, `app.ts`, `styles.css` and `format.ts`. I also read the spec and the f6118cb report.
- **I did not run `tsc --noEmit`, `vitest run` or `npm run build:qa`.** The session's permission mode denied them. It also denied my attempt to read the font metrics with a Python script. Please run `npm test` and `npm run build:qa` before merge. Everything below comes from reading the code.
- No browser was run, as instructed. Layout claims are arithmetic from the CSS, marked "estimate". The 360×640 numbers in Minor 2 need a screenshot to confirm.
- The `ReportFindings` tool was not used; this file is the report.

## f6118cb findings: status
| f6118cb | Status at 0470045 |
|---|---|
| Minor 1 (rate-line check on the wrong layout) | **Fixed.** The hero text is laid out in a ghost slot (`app.ts:243`), so the card never grows during the count-up. `fit()` is re-run on `resize`. Residual: not re-run when the web fonts finish loading (Minor 2). |
| Minor 2 (hidden popup over other dialogs, no focus) | **Mostly fixed.** `recoveryOpen`/other dialogs are respected and `#wbCollect` is focused (`app.ts:679-681`). Residual: Minor 1 below. |
| Minor 3 (grant before the tab-ownership check) | **Fixed** (`game.ts:114`) with a test. |
| Minor 4 (stub seam, page loaded hidden) | **Partly fixed.** `main.ts:122` handles a page loaded hidden. The Game-side ownership with Saves is still open (Major 1, Minor 5). |
| Minor 5 (deficits understated) | **Fixed** with `fmtMoneyCeil`; the new function has no unit test (Minor 7). The Sell-all/order-card mix of full digits and K-form was accepted last time. |
| Minor 6 (wide strings outside the HUD) | **Not addressed.** Minor 6 below. |
| Minor 7 (weak HUD assertions) | **Fixed.** The script now measures the text width of $111,111, $800,008 and $999,999 and the pill width. |
| Minor 8 (test strength) | **Partly fixed.** The C-AC36 cases are much stronger (pending settle, boundary, disk equality, 59.9 s). C-AC37/38/39 are still source greps (Minor 7). |
| Minor 9 (spec erratum) | **Fixed** by spec v0.3.1. The 683 s case is tested. |
| Minor 10 (`fmtCount` scope) | **Resolved** by spec v0.3.1. |
| Minor 11 (docs) | **Partly fixed.** The `frame()` comment is updated. `sim-rules.md` is still stale (Minor 8). |
| Nits 1, 3, 4, 5, 6 | Fixed (unit "egg"/"eggs"; duplicate `.sr-only` gone; Close no longer scrolls, because the body scrolls; `moneyWords` guards; SVG clock). |
| Nits 2, 7, 8 | Still open: fixed 1.5 s server wait and hard-coded `rgb(138, 85, 40)`; `justify-items:end` gap; `fmtAway` kept for old tests (`tests/ui-logic.test.ts`). |

## Spec conformance (static)
| AC | Verdict | Note |
|---|---|---|
| C-AC27 | OK | `welcomeModel` plus `expOffline(683, 15)` give "Away 11m 23s" and "+2,732 eggs" (L15 offline rate = 4/s). Tested. |
| C-AC28/32 | OK | `awayS >= capS`; at 7,200 s the cap text shows, at 7,199 s it does not. Never "2h+". The hidden path uses `capped: r.capped \|\| grantedMs < elapsedMs`. |
| C-AC29/30/34 | OK | Full digits. Whole dollars from $1,000. Worth = `saleValueCents`. "+1 egg" and the single-egg price are right. |
| C-AC31 | OK | Tested, including the on-disk basket. |
| C-AC33 | Not verifiable here | See Minor 2. The browser script was not run. |
| C-AC35 | OK | Unchanged. |
| C-AC36 | OK in logic, wiring unproven | Resume equals reload for H = 60 s, 671 s and 11,520 s on the fields tested. The popup path (gate, dedupe by `periodId`) is tested at unit level. The DOM wiring is only regex-checked (Minor 7). See Major 1. |
| C-AC37 | OK | Pop and count-up only when `!rm()`; the CSS covers `.rm`, `.reduced-motion` and the media query. |
| C-AC38 | OK | `aria-describedby` points at the full-text span; the button name starts with "Collect". |
| C-AC39 | OK, one caveat | Formatter outputs match the spec, including egg counts at 999,999 and 1,000,000. Weight 800 is not served (Minor 3). The HUD ghost slots reserve the width. |

Contrast was computed by hand last pass: the cap line is about 5.7:1 and the rate line about 5.9:1. Both are unchanged and pass AA.

## Findings

### Major
1. **The hidden-tab freeze is released only inside a collaborator's call, so a swap can freeze the game and disable saving.** `src/game.ts:104,108,111-112`, `src/save/hidden-time.ts:19-20`
   - `hiddenSince` makes `frame()` return (`:179`) and makes `save()` a no-op (`:119`). It is cleared in exactly one place: inside `resumeFromHidden`.
   - `endHidden()` clears it only if `accountHiddenPeriod` happens to call `game.resumeFromHidden`.
   - The stub does call it. But `hidden-time.ts` is going to be replaced by Saves' file ("take their file, delete this one"). Saves wrote their file without knowing that `Game.resumeFromHidden` and `Game.balance` exist.
   - Failure scenario A: the real module does its own accounting, or throws, and never calls `resumeFromHidden`. After the first tab hide the sim stays frozen, autosave, `pagehide` and `beforeunload` saves are skipped, and everything the player does after returning is lost on close. Nothing logs it.
   - Failure scenario B (works in the stub today): `accountHiddenPeriod` returns `null` for an already-accounted `startAt` (`:19`). `endHidden` then returns without clearing `hiddenSince`, and the game stays frozen.
   - Fix: in `endHidden`, read `startAt`, clear `hiddenSince`, then call `accountHiddenPeriod` in `try/finally`. Make the grant a separate step the module is told about, or have `endHidden` perform the grant itself and pass the result to the module. Add a contract test with a fake `accountHiddenPeriod` that returns `null`, throws, or never calls Game, and assert the game unfreezes and `save()` writes again.
   - Related: the stub imports `Game` and calls `resumeFromHidden`/`balance`/`inactive` (`hidden-time.ts:3,18`). Check that Saves' file does not import `Game` in a way that creates a cycle with `game.ts`, which now imports `accountHiddenPeriod`.

### Minor
1. **The hidden-return popup is silently dropped when Settings or the reset confirm is open.** `src/ui/app.ts:679-681`, `:227`, `src/game.ts:111-117`
   - `welcomeFromHidden` returns early for `modalKind` `settings`/`confirm` and relies on "the pending eggs show on the next open".
   - Nothing opens the popup again: `showWelcome()` is called only at boot and after the recovery dialog (`:669,671`). `closeModal` does not call it.
   - The eggs stay in `pendingOfflineEggs` with no UI. They are settled into the Basket silently at the next reload or the next hide of 60 s or more (`resumeFromHidden`).
   - The gate has already recorded the `periodId`, so a retry is also deduped.
   - Fix: in `closeModal`, if `pendingOfflineEggs > 0` and the closed kind was not `welcome`, call `showWelcome()`. Update the comment and add a test.
   - Related: if a Welcome popup is already open (the player did not Collect), a second hide of 60 s or more settles its eggs into the Basket without a Collect. The new popup shows only the new eggs. That is the same as close-and-reload, but the first popup's count vanishes without feedback.
2. **Title icon is probably never visible, and the layout checks are not re-run when fonts load.** `src/ui/styles.css:460-461`, `src/ui/app.ts:253-256`, `scripts/rc0-browser.mjs` (`welcomeTitle`)
   - Estimate. The card is 320 px: content width 268 px, minus `padding-inline:32px` on `.wb-head` gives 204 px. The 48 px icon plus its 8 px gap leaves about 148 px for the title.
   - "Welcome back!" in Fredoka 700 is roughly 7 em wide (13 glyphs at an average of about 0.55 em, my estimate). That is about 155 px at 22 px, and 200 px at the 28 px cap. At every width the icon is probably hidden by `no-icon`, and at 1280 the title has only a few px to spare.
   - The `welcomeTitle` check reports the icon's `display` but does not assert it, so it passes either way.
   - Ask Art & UX whether "icon hidden on overflow" was meant to apply at 360 px and above. If not, reduce the 32 px side padding or place the icon above the title.
   - `fit()` runs once on open and on `resize`. With `font-display:swap`, if Fredoka or Nunito arrives after the popup opens, the widths change and nothing re-measures. Re-run `fit` on `document.fonts.ready` and `loadingdone`.
   - Please attach a 360×640 and a 1280 screenshot of the final title.
3. **Nunito 800 is not shipped, so the "Nunito 800" ruling is not met.** `src/ui/styles.css:1-4,475`, `public/fonts/`
   - Only Nunito 400 and 700 exist. `.money-slot{font-weight:800}` resolves to the 700 face. The CSS comment and the Art & UX ruling both say 800.
   - Either ship `nunito-latin-800-normal.woff2` (OFL) and add the `@font-face`, or ask Art to accept 700. The digit equality in the browser check should be re-run once the choice is made.
   - The ghost width and the fallback `system-ui` face may differ if Nunito fails to load. Proportional digits there make the ghost less than the widest string (the tabular rule helps on most platforms).
4. **A read-only game (refused newer save) grants and shows the popup on hidden return.** `src/game.ts:104,113`
   - For a refused newer save, `readOnly` is set but `inactive` is not (the constructor `r.newer` branch), so `suspendForHidden` and `resumeFromHidden` proceed. A hide of 60 s or more grants offline eggs onto the throwaway state and shows "Welcome back" to a player whose real save is untouched. Close-and-reload would show the newer-save dialog instead.
   - Fix: add `this.readOnly` to both guards.
5. **Integration risk with Saves' branch, not verifiable here.** `src/game.ts:120,179`, `src/main.ts:119-125`
   - Both this branch and `fix/hidden-tab-offline` change `Game.frame()` and `Game.save()`. Agree who owns the Game side before the swap, to avoid a double grant or a double freeze.
   - `engineering/sim-rules.md` (M4-19 rev 3, 2026-10-17) says closing the tab now writes a close-time copy to IndexedDB `eggfarm/save/unload`, and offline time is measured from the newest copy. That code is not in this base. If it writes outside `Game.save()`, a tab that is closed while hidden would stamp the close time. The hidden period would then be lost on reload, which breaks C-AC36 for the common mobile "swipe away a hidden tab" case.
   - After the merge, add a test: hide, wait H, `pagehide`, reload gives the same N as H.
   - Put the ticket id in the stub header (still open from the last pass).
6. **Wider number strings are still unverified outside the HUD.** `src/ui/app.ts:190,484,541`, `src/ui/workers-ui.ts:58,68`, `src/ui/orders.ts`
   - `fmtCount` and `fmtMoney` now reach 7 to 8 characters ("999,999", "$999,999") where the old worst case was about 6. This is the same concern as f6118cb Minor 6, still not addressed.
   - The coop meter is small (capacity is 50 + 50 per level), so it is low risk. The exposed ones are the Basket-driven and money labels: the Sell-all/collect bar, Buy buttons, "Hire $…" and "Grade ×n $…", order-card Sell buttons, "Egg price a → b" rows, and the `+N` floaters.
   - Please add 360×640 screenshots with coins ≈ $999,999 and a basket of 99,999 or more.
7. **Test coverage gaps.** `tests/offline-popup-v2.test.ts`, `scripts/offline-v2-browser.mjs`
   - C-AC37, C-AC38 wiring and C-AC39 markup are still source-text regex greps (`:90-93`, `:106-114`). They pass on dead code and break on harmless refactors.
   - The browser script injects state and calls `showWelcome()` directly (`popup()`, line 29). The real path (`visibilitychange` → `endHidden` → subscriber → `welcomeFromHidden`, with the focus move) is never exercised in a browser. `welcomeFromHidden` gating (recovery open, other modal, already-open welcome) has no test at all.
   - `fmtMoneyCeil` and `moneyWords` have no unit tests. Boundary cases to add: $999.50 / $999,999.01 / $1M deficits, 0 cents, 1 cent, and 1 dollar.
   - The comment at `tests/offline-popup-v2.test.ts:62-63` says the $3.00 case is built "from a $1.50 base with a 2x sale multiplier", but the code just formats the number. The `welcomeModel` path at $3.00 is untested. The test passes whether or not a matching F/C pair exists.
   - The browser script is not in `package.json` or CI, so a regression in the layout rules is not caught. The server wait is a fixed 1.5 s (poll the port instead).
8. **Docs are stale.** `engineering/sim-rules.md:11,43`
   - Line 11 still says a hidden gap of 60 s or more "simulates the first 60 s, then freezes, no in-session grant". Line 43 says the hidden-tab catch-up runs the normal tick, so workers work there.
   - After this branch a hidden tab is frozen and a hide of 60 s or more is an offline grant with a popup. Please update both lines, and note that a visible-tab gap of 60 s or more (device sleep, throttled window) still takes the old path with no popup, which the spec does not mention.

### Nit
1. `src/ui/app.ts:233,237,681`: `fromHidden` is set and then consumed in `showWelcome` only after the `eggs <= 0` early return. If that return is ever hit, `fromHidden` stays set and the next boot or recovery popup uses the stale `{eggs, awayS, capped}`. Pass it as a parameter.
2. `src/game.ts:105-107`: two stacked doc comments. The first describes `resumeFromHidden` and is orphaned above `endHidden`.
3. `src/ui/app.ts:235`: `const h = fromHidden` shadows the module-level `h()` HTML helper inside `showWelcome`. Rename it.
4. `src/ui/format.ts:2-6`: after the `n < 1e6` shortcut, the `K` tier and the `i === 0` branch of `dp` are dead, and the comment still says "K: 1 decimal". `fmtMoneyCeil` can give "$1,000,000" for a deficit between $999,999.01 and $999,999.99, which is the long form at the M boundary.
5. `src/save/hidden-time.ts:15,19`: `done` is keyed by `startAt` and never pruned. Key by `periodId`, or drop the set and make `endHidden` the idempotence point. Stub only.
6. `src/ui/app.ts:240`: the dialog name is "Welcome back!" and the description starts "Welcome back." again, so it is read twice. Start `m.aria` at "Away …", or drop the title from the description. The whole body is `aria-hidden`, so the dialog also has no heading in the accessibility tree; that is intended, but note it in the AC.
7. `src/ui/styles.css:463`: the hero is Fredoka, which the CSS comment itself says has no `tnum`. `tabular-nums` is a no-op there, so the count-up digits jitter in width. The ghost reserves only the final text's width, so an intermediate string (for example 1,888,888 against a final 2,000,000) can be a pixel or two wider.
8. `scripts/rc0-browser.mjs` (S2-4b): `z.hdr !== a.hdr` over 4 s now has whole-dollar resolution above $1,000. It is fine at $1,318 with the current income rate, but it can flake at a lower rate.
9. Carried: `styles.css:475` `justify-items:end` leaves a gap between the coin icon and short values like "$0.00" (confirm with Art & UX); `scripts/offline-v2-browser.mjs` hard-codes `rgb(138, 85, 40)`; `fmtAway` and its test remain.

## Hidden-tab equivalence (re-checked)
- `suspendForHidden` saves once, then sets `hiddenSince` (`game.ts:104`). `save()` and `frame()` are no-ops while hidden. The autosave `visibilitychange` listener, `pagehide` and `beforeunload` therefore cannot move `savedAt` (the new test asserts this on disk).
- `resumeFromHidden` mirrors the constructor: settle the unclaimed pending eggs, one `grantOffline`, `lastFrameAt = now`, `accMs = 0`, then save. It now checks `canWrite` first (fixed).
- A page loaded while hidden is now covered (`main.ts:122`).
- Under 60 s: the next `frame()` simulates the gap online (tested at 59.9 s).
- `realAwayS = gapMs / 1000` is the same for both paths. `periodId` dedupe works as the spec's note says: the same id shows once, and the same `startAt` with a different id shows both.

## Suggested before merge
- Run `npm test` and `npm run build:qa` (I could not).
- Fix Major 1 (release the freeze unconditionally and add the contract test) and agree the Game-side ownership with Saves (Minor 5).
- Fix Minors 1 and 4, which are small and local.
- Get Art's call on the icon and weight 800 (Minors 2 and 3), with 360×640 and 1280 screenshots, plus the large-value screenshots (Minor 6).

Counts: 0 Blocker, 1 Major, 8 Minor, 9 Nit.
