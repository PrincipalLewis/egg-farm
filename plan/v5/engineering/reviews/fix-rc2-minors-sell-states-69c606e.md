# Code review (recheck): fix-rc2-minors-sell-states @ 69c606e

Reviewer: Code Reviewer · Range: `5d8a058..69c606e` (branch `fix-rc2-minors-sell-states`, base `rc1/ux-clarity-v3`) · Worktree `/workspace/review-69c606e` (not modified)
Topic: recheck of `engineering/reviews/fix-rc2-minors-sell-states-9677d26.md` (2 nits), plus the new work since 9677d26: Sold! chip text in Nunito 700 12px (`97ca9ad`), the rc0 computed-font check, and the rc0 check fix (`69c606e`).
Changed since 9677d26: `src/ui/styles.css` (1 line), `scripts/rc0-browser.mjs` (3 lines). No `src/*.ts` or test changes.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 0 |
| Minor | 0 |
| Nit | 3 |

Verdict: approve. The CSS change is correct and in scope. I found nothing Minor or worse. The three nits are low-risk: two carry over unfixed from 9677d26 and one concerns the strength of the new rc0 check. `vitest` passes (21 tests). `tsc` was not run (see "What I ran"). The rc0 checks are browser-only and were not run, so I checked them by reading.

## Status of the 9677d26 nits

| # | Was | Status |
|---|---|---|
| 1 | Nit: wiring covered only by regexes; rc0 case outside vitest | **Open, unchanged** (finding 1; the new CSS adds one more unguarded line) |
| 2 | Nit: mid-file import and duplicated `base` in the test; `app.ts:375` comment says "drops unseen" | **Open, unchanged** (finding 2) |

Neither was fixed in these commits. Both were marked optional last time, so I keep them as nits.

## Findings

### 1. [Nit] The font change has no vitest guard, and the wiring is still regex-only (carry-over nit 1)
`src/ui/styles.css:375`, `tests/rc2-minors-sell-states.test.ts:30-31`

Evidence: the vitest CSS assertion checks only `\.order \.btn\.sell\.sold[^{]*\{background:#3D7F33;color:#fff` (the colour rule, line 374). Nothing in vitest covers `font-family:var(--f-body);font-weight:700;font-size:12px` on line 375. Reverting that line to the previous `font-size:12px` with the inherited Fredoka (the thing the designer flagged) leaves all 21 tests green. Only the browser-only `rc0` section would catch it. The `OrderList.sold`, `leavingN` and `srcLive` wiring from nit 1 is still covered only by `readFileSync` regexes.

Impact: low. The designer-minimum regression would be caught only if the rc0 browser job runs in CI.

Fix (optional): add one regex next to the existing CSS assertion, for example `expect(css).toMatch(/\.order \.btn\.sell\.sold\[aria-disabled\]\{[^}]*font-family:var\(--f-body\);font-weight:700;font-size:12px/)`. Confirm that the rc0 browser job gates merges, or add `happy-dom` as discussed in the previous report.

### 2. [Nit] Test tidiness and a slightly misleading comment (carry-over nit 2)
`tests/rc2-minors-sell-states.test.ts:42` (mid-file `import`), `:55` (second `base` repeats the first), `src/ui/app.ts:375` (comment)

Evidence: the mid-file `import { planRemovals, … }` and the duplicated `base` are untouched. The comment still says a hidden row "drops unseen on the next update". A single stale row still plays the plain 240 ms leave fade, which is the pre-existing, non-Sold behaviour (the rc0 comment already says this).

Impact: none functionally.

Fix: move the import to the top, share `base`, and reword the comment to "takes the normal removal path".

### 3. [Nit] The new rc0 font check is weaker than its title; the fix commit message does not match its diff
`scripts/rc0-browser.mjs:1002` (check), `:991-992` (sampler), commit `69c606e` message

Evidence:
- **Declared, not rendered.** The title says "Nunito 700 at >= 12px rendered". The check reads `getComputedStyle(b).fontFamily.split(',')[0]` and matches `/Nunito/i`. That is the declared stack. If the Nunito 700 woff2 failed to load, the browser would draw `system-ui` and the check would still pass. The `fontSize >= 12` and `fontWeight === '700'` parts are the same kind of declared value. The family match is the only part that distinguishes the new CSS from the old (Fredoka 12px, weight 700 from `.btn`). An optional rendered check is `document.fonts.check('700 12px Nunito')`.
- **Scale covers the button only.** `tr` is the button's own transform. During the 240 ms leave, the ancestor `.order.leaving` runs `scale(.96)`, so the drawn text is about 11.5 px. These frames are in `sold` (text still reads "Sold!") and pass the check. The leave frames are fading out and not a reading state, so this is acceptable. The title's "(no scale)" is therefore true only for the freeze frames.
- **Captured but never asserted.** `bw` (button width) and `lines` (wrapped line count) are collected in each sample and never used. "Row width unchanged" is asserted on the row (`rowW`), which the list layout fixes regardless of the chip. The real "chip does not change the button" evidence is `bw`, compared with its pre-click value, and `lines <= 2`. Overflow is still caught by the existing `fit` check.
- **Commit message.** `69c606e` says "NBSP-normalised order text", but the diff contains no NBSP handling. It only restricts the `rowW` comparison to `freeze` frames (`x.t <= 220`) instead of comparing with `withRow[0]`, which the leave scale had been shrinking. The change itself is right. I confirmed the stale-text check does not need NBSP handling: the order button and `.l1` text are built with ordinary spaces (`orders.ts:22-23`, `soldLabel`). The NBSP is only in the Sell all label.

Impact: low. The check does catch the old Fredoka CSS and a size or weight regression. It would not catch a failed font load, or a chip that grew wider than its button, other than through `fit`.

Fix (optional): assert `document.fonts.check('700 12px Nunito')` once, assert `sold.every(x => x.lines <= 2 && x.bw === pre-click bw)`, and correct the commit message in the PR description.

## Checked and found fine

- **CSS `styles.css:375`.**
  - Specificity is `.order .btn.sell.sold[aria-disabled]` (0,5,0). It beats `.btn` (font: 700 Fredoka), `.order .btn.sell` at line 582 (height, nowrap) and `.btn[aria-disabled=true]`. `sold()` sets `aria-disabled="true"`, so the rule applies.
  - Nunito 700 is declared (`styles.css:4`, latin subset, same file the `.l1` 800 rows already use), so no new font request is added. `--f-body` is `"Nunito",system-ui,sans-serif`.
  - The chip is `class="btn sell sold"`, so it never carries `.long`. No competing `font-size`.
- **Layout.**
  - The button is fixed at 80 px (≤375 px viewports, covering 360), 88 px (390) and 112 px (docked 1280), with a fixed 44 px height (line 582) and `padding-inline:0`.
  - The longest label is `Sold! +$999.99` (`fmtMoneyShort` caps at `$999.99` or `$999.9K`/`M`/`B`). A wrap at the space gives "Sold!" over "+$999.99", about 52 px wide, which fits even the 80 px button's content box.
  - At two lines of 12 px × 1.1 (26.4 px) the text sits inside the 44 px height. `white-space:normal` allows a wrap and `overflow:visible` prevents clipping. I did not measure in a browser (not allowed). Nunito is narrower than Fredoka, so this should wrap no more than before.
  - The row width is unchanged: the button width is fixed and `.order` keeps its fixed height and `overflow:hidden`.
- **Contrast.** White on `#3D7F33` is about 4.9:1, which passes AA for 12 px bold text.
- **Scope.** The commits touch only the one CSS line and the rc0 checks, as stated. Nothing unrelated changed. Reduced-motion and the removal logic are untouched.
- **`rowW` fix.** Restricting the width comparison to the 220 ms freeze frames is correct. Comparing with `freeze[0]` is safe on an empty array because `every` does not evaluate the callback, and `freeze.length > 0` is asserted by the next check. The tolerance of 0.5 px is reasonable.

## What I ran

- `git diff 5d8a058..69c606e` (src, tests, and the rc0 diff since 9677d26), `git show 97ca9ad` and `git show 69c606e`, the previous report, and the surrounding `styles.css` (lines 30-34, 349-396, 575-585), `orders.ts`, `format.ts` and the rc0 `rc2minors` section.
- `npx vitest run --pool=forks --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1 tests/rc2-minors-sell-states.test.ts tests/art-ux-rc0.test.ts`: **2 files, 21 tests, all passed.**
- **Not run: `npx tsc --noEmit`.** The Bash permission was denied for this command, as in the previous round, and I did not work around it. This range has no TypeScript source changes (CSS and a `.mjs` script only), so the type-level risk is nil, but the owner or CI should still confirm.
- Not run, per the constraints: browsers and the rc0 sections. The rc0 verdicts above come from reading the code.
