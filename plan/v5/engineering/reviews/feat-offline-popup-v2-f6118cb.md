# Review: feat/offline-popup-v2 @ f6118cb (base 7d52952)
Spec: product/collection/offline-popup-v2-spec.md v0.3 (C-AC27..C-AC39). Reviewer: Sonnet 5.5 (code review). 2026-10-16.

**Result: 0 Blocker, 0 Major, 11 Minor, 8 Nit.** The popup content, the number formats and the hidden-tab equivalence all match the spec. The Minors are edge cases, layout verification gaps and test strength.

## What was and wasn't run
- I read the full diff `7d52952..f6118cb` and the surrounding code in `game.ts`, `main.ts`, `app.ts`, `format.ts`, `offline.ts`, `payout.ts` and `autosave.ts`. I did the contrast maths by hand.
- **I did not run `tsc --noEmit` or `vitest run`.** My first attempt was denied by the session's permission mode, and Bash stayed denied after that. Please run `npm test` and `npm run build:qa` before merge.
- I did not grep other `scripts/*.mjs` (smoke, screenshot, release-globals) for old money strings (`$12.3K`, `$1,234.50`) or `.coins .num` selectors. The new `ghost` span is the first `.num` inside `.pill.coins`, so check them.
- Browsers were not run, as instructed.

## Spec conformance (static)
| AC | Verdict | Note |
|---|---|---|
| C-AC27 | OK, with a spec erratum | The code gives 2,684 for 671 s (L15 = 4 eggs/s). The spec's 2,732 is 683 s. See Minor 9. |
| C-AC28/32 | OK | `welcome-v2.ts` uses `realAwayS >= cap`. The cap line, the "capped at 2h" text and the exact-cap boundary are right. Never "2h+". |
| C-AC29/30/34 | OK | Full digits. Worth = `saleValueCents` (the one payout function: Collection and Grader, no frenzy/streak/ad). Floored to whole dollars from $1,000, which matches the spec's own "$8,196" example. |
| C-AC31 | OK | `collectOffline` is unchanged. The sub-line is fixed text. |
| C-AC33 | Not verifiable here | Layout was not checked. See Minor 1. |
| C-AC35 | OK | Unchanged. |
| C-AC36 | OK in logic | Resume and reload give the same state. See "Hidden-tab equivalence". |
| C-AC37 | OK | Pop and count-up only when motion is on. The reduced-motion CSS covers `.rm`, `.reduced-motion` and the media query. |
| C-AC38 | OK | `aria-describedby` points at the sr-only full-text span, and the button is `aria-label="Collect N eggs"`. WCAG 2.5.3 is fine because the name starts with the visible "Collect". |
| C-AC39 | OK | Formatter outputs match the four spec values. Tabular-numeral and width behaviour are unverified. See Minor 7. |

Contrast, computed by hand: the cap line `--c-wood-text #8A5528` on cream `#FFF6E5` is about 5.7:1. The rate line `--c-muted #6B5D52` is about 5.9:1. Both pass AA.

## Hidden-tab equivalence (`Game.suspendForHidden` / `resumeFromHidden`)
- `suspendForHidden` saves once and then sets `hiddenSince` (`src/game.ts:103`). `save()` is a no-op while hidden (`:113`) and `frame()` returns early (`:172`). So the state on disk and in memory both stay as of the hide, and `savedAt` is the hide time. This is exactly what a close at hide time leaves behind.
- `resumeFromHidden` follows the constructor sequence (`:106-111`): settle the unclaimed pending eggs, one `grantOffline`, `lastFrameAt = now`, `accMs = 0`, then save. `applyOffline` only touches `pendingOfflineEggs`, so worker energy and customers are frozen on both paths, as the spec requires.
- The `pagehide` → `endSession` save and `flushForHandover` are both skipped while hidden. That is correct, because they would otherwise overwrite the hide-time `savedAt`.
- Under 60 s: `hiddenSince` clears and the next `frame()` simulates the gap online, capped at 60 s, as before.
- The `ui.render(); ui.showWelcome()` wiring is right. The popup reads `g.offline.realAwayS`, which is the hidden duration.

## Findings

### Minor
1. **Rate-line drop and count-up are measured on the wrong layout.** `src/ui/app.ts:239,247-248`
   - In motion mode the hero starts as "+0 eggs" and the "rate line drops first" check runs against that short layout. The hero reaches its final text at 900 ms.
   - At 360 px a content width of about 268 px means "+1,234,567 eggs" at 32 px probably wraps to two lines, so the card grows after the check.
   - My estimate is a band of viewport heights (around 520 px at 360 wide) where the rate line is kept at open but the final card exceeds 80%. The card then scrolls (`overflow-y:auto`) and Collect can drop below the fold.
   - The Collect button also moves down when the hero wraps at the end of the count-up, under a finger that is about to tap it.
   - The check is also never re-run on resize or rotation.
   - Fix: lay the final `m.hero` out first, measure and decide, then swap in "+0 eggs". Keep the height with a hidden ghost of the final text, as the HUD slot does. Re-check on `resize`.
   - The browser script only measures the final state, and only at 360×420 for the drop case.

2. **The hidden-return popup ignores UI state and does not move focus.** `src/main.ts:124`, `src/ui/app.ts:230-245`
   - `showWelcome()` overwrites `modal.innerHTML` unconditionally. It silently replaces an open Settings dialog or the "Reset all progress?" alertdialog.
   - It also opens while the save-recovery dialog is up, even though `ui.recoveryOpen` exists (`app.ts:668`) for exactly this. The boot path waits for that dialog (`app.ts:657-661`).
   - Nothing moves focus into the new `aria-modal` dialog. The boot path only does so in the recovery branch (`app.ts:661`). The mid-session popup appears over an unfocused page, so a screen reader may never announce the dialog or its description, which is the C-AC38 goal. A keyboard user's focus stays behind the dialog.
   - Fix: in the `main.ts` hook, skip or defer when `ui.recoveryOpen` or another modal is open (the pending eggs persist and the later `showWelcome()` picks them up). Then focus `#wbCollect` after open.

3. **`resumeFromHidden` grants before checking tab ownership.** `src/game.ts:108-110`
   - `inactive` only flips on a write attempt, or when the lease callback arrives (`main.ts` `TabLease(..., () => gRef?.deactivate())`).
   - If another tab took the save while this one was hidden and the lease message hasn't been processed, the grant runs, the popup shows, and then `save()` (`:110`) fails `canWrite` and deactivates. The tab-guard dialog then sits on top of a welcome popup whose Collect does nothing (`dispatch` returns when `inactive`).
   - Fix: test `this.canWrite?.() === false` before granting. Deactivate and return 0 in that case.

4. **Stub-to-real-hook swap risk, and one gap in the stub.** `src/save/visibility-hook.ts:17`, `src/main.ts:121-124`
   - The comment says the swap is "one import". But the Saves fix (`fix/hidden-tab-offline`) also touches `game.ts` `frame()` (the S2 defect location). If both land, the hidden gap could be granted twice or frozen twice.
   - Please agree who owns the Game side. Add a contract test at the seam: `onHide`/`onHiddenReturn` against a fake document, plus the Game methods.
   - If the page is loaded while already hidden, `hiddenAt` is set at construction (`:17`) but `onHide` never fires. `Game.hiddenSince` stays null, so frames are throttled and simulated online as before, which is the original S2 defect. Return then produces an ignored long `ms`. A background-opened tab is not covered.
   - The stub ships in production builds, which is intentional per the comment. Put the ticket id in the comment so it doesn't linger.

5. **"Need $X more" now understates the deficit.** `src/ui/app.ts:464`, `src/ui/format.ts:19`
   - `fmtMoney` floors from $1,000 up. A deficit of $1,234.50 reads "Need $1,234 more", and earning exactly that leaves the Buy button disabled (`coins >= cost*100`).
   - Use a ceiling variant for deficits and "Need …" copy.
   - Related: the Sell-all label (`app.ts:533`, `orders.ts:86`) lost its cents between $1,000 and $9,999.99. `payout.ts:1` states the rule "every money preview == amount credited, to the cent". Flooring never overstates, so this is acceptable, but it is a behaviour change worth recording. Order-card Sell buttons use `fmtMoneyPreview`, so the same screen now mixes full digits and K-form.

6. **Wider money strings are unverified outside the HUD.**
   - `fmtMoney` now reaches 8 characters ("$999,999"). The old worst case was about 6 ("$12.3K"). Callers: upgrade Buy buttons (`app.ts:476`), "Hire/Grade ×n" buttons (`workers-ui.ts:58,68`), the Sell-all label, order cards (`orders.ts:30`), and "Need …" and "Egg price a → b" rows.
   - The HUD pill now permanently reserves about +45 px, including for new players at "$0.00" (`app.ts:62`, `styles.css:472`).
   - Only the HUD slot at 390×844 was screenshotted. Please add 360×640 screenshots with coins ≈ $999,999 and a 5-digit basket, covering the HUD, the Sell-all/collect bar, a Farm upgrade row and the Hire buttons.

7. **The C-AC39 browser assertions are weaker than the AC.** `scripts/offline-v2-browser.mjs` (HUD block)
   - "Tabular numerals" checks only that `font-variant-numeric` contains `tabular-nums`. It does not check that the glyphs have equal advance. The pill uses `--f-display` (Fredoka). If that face has no `tnum`, "$999,999" is not guaranteed to be the widest string, and the ghost reservation can be exceeded.
   - The "slot width constant" check measures the slot, which always equals the ghost width by construction, so it cannot fail. Measure the `#coins` text width for "$111,111", "$800,008" and "$999,999", or the pill width.

8. **Test strength.** `tests/offline-popup-v2.test.ts`
   - C-AC37, C-AC38 (wiring), C-AC39 (markup) and the clock icon in C-AC28 are source-text regex greps (`:31,89-93,102,112-114`). They pass on dead code and break on harmless refactors.
   - Behaviour (count-up, no pop under reduced motion, button name, ghost width) is covered only by the manually run browser script. That script is not wired into `package.json` or CI.
   - `:58` (`$3.00 → $3,703,701`) swallows the "no state with price" error, so it silently passes if no F/C pair has that price. Assert the pair exists or build the state directly.
   - The title at `:59` says "incl. Grader" but the state has no grader tier. Add a case with `graderTier > 0` and the worker hired. `saleMultipliers` is the only place that diverges from `N × eggPrice`.
   - The C-AC36 cases (`:118-134`) use the default `workers`, so "worker energy identical" is trivially true. They don't cover:
     - the unclaimed-pending settle (`game.ts:109`);
     - the next `frame()` after resume not re-simulating the gap;
     - on-disk equality of the two saves;
     - `endSession` and `flushForHandover` while hidden;
     - the 59.9 s / 60 s boundary.
   - The "< 60 s" case (`:131`) is titled "simulated online on the next frame" but asserts only `pending === 0`. Assert that customers or coop changed.
   - Nothing tests `main.ts` wiring (that the hook calls `showWelcome`).
   - The C-AC38 expected value (`:100`) rounds with `maximumFractionDigits:0`, but the implementation floors. They agree only because that value is a whole number of dollars.

9. **The C-AC27 example in the spec is wrong.** `tests/offline-popup-v2.test.ts:20-24`
   - "Away 11m 11s at L15 → +2,732" conflicts with the spec's own formula (2,684, the formula result for 671 s). The author flagged this ("see PR"), but the spec file still says 2,732.
   - PM should issue an erratum, or reword the AC to 11m 23s (683 s) as in `bug-offline-overcredit.md`. Add a 683 s → "+2,732 eggs" model test so the original report is covered. The browser script's 2,684 and 671 s are consistent with the code.

10. **Scope question for PM: `fmtCount`.** `src/ui/format.ts`
    - Spec §2 names "`fmtMoney`/`fmtCount`" as the global change, but its body specifies money only. `fmtCount` is unchanged, so the HUD Basket still reads "28.8K" after collecting "+28,800 eggs".
    - Pain #2 was "short-form numbers made totals uncheckable". Confirm whether Basket full digits are wanted.

11. **Product and docs note.**
    - Any tab-hide of 60 s or more now grants offline eggs at 25%, with no online sim of the first 60 s, and shows the Welcome modal on return (every tab switch of a minute or more). That follows C-AC36, but it is a visible behaviour change for idle players who keep the game in a background tab. Make sure Head of Product has seen this consequence.
    - The `frame()` doc comment and `engineering/sim-rules.md` still describe "hidden gap ≥ 60 s simulates the first 60 s online then freezes", and the new code no longer does that.
    - The hidden-tab path skips `telemetry.poll()` while hidden. Check the telemetry-spec v0.6.1 timers.

### Nit
1. `src/ui/app.ts:239,250`: the initial text is "+0 eggs", but the first frames for N=1 show "+0 egg". Use one unit throughout.
2. `scripts/offline-v2-browser.mjs` (Collect-width assertion): `m.card.width - 2*32 - 2` is about 12 px looser than the real padding (24 + 2 border). Assert `btn.width >= content width - 1`. The hard-coded `rgb(138, 85, 40)` and the fixed 1.5 s server wait are brittle. Poll the port instead.
3. `src/ui/styles.css:457`: `.sr-only` duplicates the existing `.sr` (`:153`). Reuse one.
4. `src/ui/styles.css:458`: `.welcome-v2{overflow-y:auto}` makes the absolutely positioned Close button scroll away with the content (`.card .close` is positioned inside the scroller).
5. `src/ui/format.ts:30-35`:
   - `moneyWords` has no non-finite guard ("NaN dollars"), unlike `fmtMoneyFull`.
   - Under $1,000 it can say "0 dollars 50 cents".
   - It uses `round(cents) % 100` while `fmtMoneyFull` uses `toLocaleString` rounding, so fractional cents ≥ .5 can disagree between the visual and the spoken text. `saleValueCents` returns integers, so this is theoretical.
6. `src/ui/app.ts:243`: "⏱" (U+23F1) renders as a coloured emoji on iOS and ignores the accent colour. Prefer an SVG clock asset (spec: "clock icon + accent colour").
7. `src/ui/styles.css:472`: `justify-items:end` leaves a gap between the coin icon and short values ("$0.00"). Confirm with Art & UX, or use `start` with the ghost for width.
8. `src/ui/format.ts:49`: `fmtAway` is kept only for old tests. Delete it with them, since app.ts no longer imports it.

## Suggested before merge
- Run `npm test` and `npm run build:qa` (I could not).
- Fix Minors 2, 3 and 5, which are small and local.
- Add a 360×640 screenshot with large HUD values (Minor 6) and re-run the layout block after any Minor 1 change.
- Agree the Game-side ownership with Saves (Minor 4).

Counts: 0 Blocker, 0 Major, 11 Minor, 8 Nit.
