# Code review (recheck): fix-rc2-minors-sell-states @ a39375f

Reviewer: Code Reviewer · Range: `5d8a058..a39375f` (branch `fix-rc2-minors-sell-states`, base `rc1/ux-clarity-v3`) · Worktree `/workspace/review-a39375f` (not modified)
Topic: recheck of `engineering/reviews/fix-rc2-minors-sell-states-69c606e.md` (3 nits).
Changed since 69c606e: one commit, `a39375f`: `scripts/rc0-browser.mjs` (+3/-1), `src/ui/app.ts` (comment only), `tests/rc2-minors-sell-states.test.ts` (one added `expect`). The rest of the 5d8a058..a39375f range was already covered by earlier reviews. I re-read the diff for anything that regressed and found nothing.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 0 |
| Minor | 0 |
| Nit | 2 |

Verdict: approve. Nothing is wrong in the shipped code. Two of the three earlier nits are closed. The third is closed only in part (finding 2), and one new rc0 check is weaker than its title (finding 1). **Caveat: I could not run vitest or tsc.** Bash was denied part-way through this review (see "What I ran"). I checked the new vitest assertion against `styles.css` by reading it. Please have the owner or CI confirm that the test file passes and `tsc` is clean. The only TypeScript source change is a comment edit, so the type risk is nil.

## Status of the 69c606e nits

| # | Was | Status |
|---|---|---|
| 1 | Font change has no vitest guard | **Closed.** `tests/rc2-minors-sell-states.test.ts:27` now asserts the rule. See "Checked and found fine". |
| 2 | Mid-file import, duplicated `base`, misleading "drops unseen" comment | **Partly closed.** The `app.ts:375` comment now reads "takes the normal removal path". The mid-file import and the duplicated `base` are untouched (finding 2). |
| 3 | rc0 font check reads the declared stack; `bw` and `lines` captured but not asserted; commit message mismatch | **Partly closed.** `document.fonts.check` and `lines <= 2` are added and the commit message is corrected. The `bw` check cannot detect a change (finding 1). |

## Findings

### 1. [Nit] The "chip width unchanged" check compares against the chip's own first frame, so it cannot fail
`scripts/rc0-browser.mjs:1003-1004`

Evidence:
- Line 1003: `const preBw = withRow.find(x => !/^Sold!/.test(x.txt ?? ''))?.bw ?? sold[0]?.bw;`
- Line 1004 asserts `Math.abs(x.bw - preBw) < 0.5` for every freeze frame.
- The sampler (lines ~989-996) takes its first `snap()` immediately after `.click()`, with no pre-click sample. In `app.ts`, the `g.on` handler (`customer_served` case, line 375) calls `orderList.sold(...)` synchronously. `OrderList.sold` (`order-list.ts:113-121`) rewrites the button's text and class in the same task. So the first sampled frame already reads "Sold! +$X".
- The sibling check at line 1005 also asserts `sold[0].t <= 40`, which says the same thing.
- No row frame has non-"Sold!" text, so `.find` returns `undefined` and `preBw` falls back to `sold[0].bw`.
- The check therefore only asserts that `bw` is constant within the Sold frames. It does not compare against the width of the pre-click "Sell" button, which was the point of the earlier nit and of the commit message ("chip width unchanged over the freeze").

Impact: low. The button is fixed at 80/88/112 px by CSS, and the existing `fit` check at line 1005 (`scrollWidth <= clientWidth`) would still catch overflow. A regression that changed the button width on the Sold swap would not be caught by this assertion. The silent `??` fallback also hides the fact that the pre-click value was never captured.

Fix (optional): capture the button width before the click and pass it into the page, for example `const preBw = await page.locator('.order[data-id="777"] button').evaluate(b => b.getBoundingClientRect().width)` just before the sampler `evaluate`. Remove the `?? sold[0]?.bw` fallback so a missing value fails loudly. That also makes the `NaN` case in the comparison fail rather than pass by accident.

### 2. [Nit] Test tidiness: mid-file import and duplicated `base` are still there (carry-over nit 2)
`tests/rc2-minors-sell-states.test.ts:42` (mid-file `import { planRemovals, startAbovePoint, riserTop, emptyHidden }`), `:43` and `:55` (two separate `const base = { inQueue: …, t: 1000, … }` objects in different `describe` blocks)

Evidence: I re-read the file at a39375f. The import still sits between the two `describe` groups. The second `describe` redefines `base`, with `soldUntil` typed as `Map<number, number>` and `lastLeave: 0`, whereas the first uses `lastLeave: -Infinity`. The two differ slightly, so merging them needs a little care.

Impact: none functionally. The test is slightly harder to read.

Fix (optional): hoist the import into the top import block and share one `base` helper. Keep the `lastLeave` difference explicit in the cases that need it.

## Checked and found fine

- **New vitest assertion (`tests/rc2-minors-sell-states.test.ts:27`).** The regex is `\.order \.btn\.sell\.sold\[aria-disabled\]\{[^}]*font-family:var\(--f-body\);font-weight:700;font-size:12px`. `styles.css:375` reads `.order .btn.sell.sold[aria-disabled]{white-space:normal;font-family:var(--f-body);font-weight:700;font-size:12px;line-height:1.1;…`. The regex matches that line, and the three declarations are in the order it expects. A revert to Fredoka or a smaller size (the original defect) would fail it. It guards the declared rule only and is whitespace- and order-strict, so a harmless reorder of declarations would also fail it. That is acceptable for a source-text guard of this kind. `--f-body` is `"Nunito",system-ui,sans-serif` (`styles.css:13`), and `@font-face` for Nunito 700 exists (`styles.css:4`).
- **`document.fonts.check('700 12px Nunito')` (`rc0-browser.mjs:1002`).** This is a real improvement. It returns false when the matching face exists but is not loaded, so it answers the earlier "declared, not rendered" point. It would return true for a family that is not declared at all. The computed `fontFamily` regex on the same line covers that, so the two together are sound. The `@font-face` rules have no `unicode-range`, so the default test text (a space) matches the face. It runs after the sampling window, which is fine because the chip uses the face during the frames.
- **`lines <= 2` (`rc0-browser.mjs` sampler).** It counts distinct rounded tops of the text rectangles via `Range.getClientRects()` on the button's contents. A single line gives one value and a wrap gives two. This is a reasonable proxy and matches the "may wrap, never clipped" decision. Overflow is still covered by `fit`.
- **Row width over the freeze frames.** The `rowW` comparison against `freeze[0]` is unchanged from 69c606e, which I had already accepted.
- **Layout at 360 / 390 / 1280.** The CSS is unchanged since 69c606e, which I reviewed last round. The button stays fixed at 80 px (360), 88 px (390) and 112 px (docked 1280), at 44 px height, `padding-inline:0`. The longest label, `Sold! +$999.99`, wraps to "Sold!" over "+$999.99", about 52 px wide, which fits. rc0 only exercises 360 (touch, portrait, reduced-motion) and 1280. 390 has no direct coverage, but its button is wider than 360's, so the 360 case is the tight one.
- **Scope.** `a39375f` touches only the three files named in its message, and nothing outside the nits. The `app.ts` change is a comment edit inside the `customer_served` case. The vitest regex for that case (`case 'customer_served':[^\n]*if \(open === 'market' …`) still matches, because the code before the comment is unchanged.

## What I ran

- `git log`, `git diff --stat 5d8a058..a39375f`, `git show a39375f` (all files), and the 69c606e report.
- Read `src/ui/styles.css` (lines 1-4, 13, 370-377), `src/ui/order-list.ts` (`sold()`), `src/ui/app.ts` (lines 340-370 and the `customer_served` case), `tests/rc2-minors-sell-states.test.ts` in full, and `scripts/rc0-browser.mjs` lines 960-1010.
- **Not run: `npx vitest run … tests/rc2-minors-sell-states.test.ts tests/art-ux-rc0.test.ts` and `npx tsc --noEmit`.** I issued them in one command and the Bash permission was denied (the session is in don't-ask mode). I did not retry or work around the denial. The previous round's result (21 tests passing at 69c606e) does not cover the new `expect` at line 27, which I checked by hand against `styles.css:375` as described above.
- Not run, per the constraints: browsers and the rc0 sections. My rc0 conclusions come from reading the code, so I cannot confirm that the new `fonts.check` passes in Chromium, Firefox and WebKit.
