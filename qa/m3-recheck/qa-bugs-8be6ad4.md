# QA recheck: fix/rc1-qa-bugs @ 8be6ad4 (replaces 8468101; 2 commits on main 4aadcbf), 2026-10-16 (CEST)

**Verdict: FAIL. One Major defect (MK-24-1).** The money logic is correct: BUG-1/2/3/4/5 are fixed and there are no regressions. But the new per-row Sell button label "Sell k · +$X" is truncated at 390px and wider, desktop included, so players can't read the new +$X amount. That has to be fixed before merging.

Setup: fresh clone /workspace/qa-8468101/qb, my own ports (4291/4292), one engine at a time, all on the loaded box. The only local change is the rc0-browser port (4181→4291), stashed for the release build. The release build id is `m3-rc1-pre+8be6ad4` (clean).
Reuse from 8468101: the 8468101→8be6ad4 diff touches only src/ui/orders.ts, order-list.ts, styles.css and tests. payout.ts, actions.ts, format.ts, app.ts and the economy files are unchanged, so the BUG-3 formatter check and the pacing run were not redone (their logs are in qa-bugs-8be6ad4/superseded-8468101/). Everything else was rerun on 8be6ad4.

## Defects
### MK-24-1 (Major, new in 8be6ad4): order-row Sell button cuts off "Sell k · +$X" at ≥390px and on desktop
- Repro: build:qa, 390×844 (also 430 and 1280×800), open Market with any ready or partial order. Even the shortest label, "Sell 3 · +$3.00", shows as "Se… +$…".
- Cause: at ≥390px the button computes to width 88px (min-width 88px; `width:auto` doesn't grow it because the ellipsis spans shrink). The spans are clipped: "Sell 3" 37/47px, "+$3.00" 31/40px (sellbtn-truncation.log).
- At ≤375px the stacked layout (72px) fits short amounts like "+$3.00" (40px). Longer ones ($170.10 or $1,234.50) will likely clip at 96px max-width; I didn't measure this.
- Evidence: shots/sellbtn-{360,375,390,430,1280}.png, shots/390-*-1-before.png, shots/desktop-*-1-before.png.
- The aria-label text is correct, so the logic is fine; this is a CSS fix.

### Low / observations (not blocking)
- FMT-1 (Low): fmtCount/fmtMoney above 1e15 give "1000T", "1000000T"; Infinity gives "InfinityT"/"$InfinityT"; NaN gives "NaNT"/"$NaNK". There's no tier above T and no non-finite guard. M1 can't reach these values.
- FMT-2 (known, rc2): 9,995,000 → "9.99M" is confirmed. The same float case exists at every tier: 9.995e9 → "9.99B", 9.995e12 → "9.99T". 9,995,100 → "10M" is correct. I found no other wrong boundary: 999→"999", 9,999→"9,999", 10,000→"10K", 99,950→"100K", 999,499→"999.5K", 999,950/999,999→"1M", 999,950,000→"1B", 999,950,000,000→"1T", 1e12→"1T", 9.995e12→"9.99T", 1e13→"10T". No "1000K/M/B" anywhere, and the error is under 1% across a 1e4–1e14 sweep.
- FMT-3 (Low, cosmetic): fmtMoneyShort (served chip and queue "+$X" pop) floors (999,950 → "$999.9K") while fmtMoney rounds ("$1M"). It only differs at $1K and up, and is pre-existing Art & UX compact style.
- Design note, not a defect: each row's Sell button shows what that tap would sell on its own, min(basket, remaining). With a shared basket, the row buttons can add up to more than "Sell all". Example: basket 8 with two rows, each showing "Sell 7 · +$18.48". This matches Product's per-tap ruling. My script's "sum of row buttons == Sell all" assertion was wrong for that reason, which explains the 6 FAIL lines in bug12-browser.log; everything else in those cases passed.
- S2-REL-1 (known, unchanged): the release still exposes window.eggfarm and window.eggfarmOrderList besides eggfarmExportTelemetry. It's identical on 4aadcbf, and the fix arrives with the rc1-ui merge.
- BUG-4 porting note: the bug exists only on rc1-ui (2490c79), not on main. When rc1-ui merges onto this, the guard test (qa-rc1-bugs.test.ts) must still pass.

## Results
| Check | Result |
|---|---|
| BUG-1/2 browser, 390px + desktop 1280, 6 cases each (Grader off; Grader T1 working = original repro; T2 working; T3 tired; T5 asleep; 1–4 orders, partial and ready) | **PASS.** In all 12 contexts: row Sell "+$X" = credited `e.value` = '+$X' popup = coin delta, to the cent. Sell all label = Σ credited = coin delta. Each popup = its credit. HUD delta = credit. Income rate ×60 = Σ credited exactly. 0 page errors. Original repro (F20 C7, 58 eggs, Grader T1): row "58/58 eggs · $320.16", Sell "Sell 58 · +$320.16", Sell all, popup and delta all $320.16. Grader off gives $213.44, a ratio of exactly 1.5×. (These are current-economy prices; rc1-pt1 had $278.40.) bug12-browser.log, shots/ |
| Product ruling MK-24 | Card line shows the full order value (e.g. "10/10 eggs · $26.40" while the button reads "Sell 7 · +$18.48"). Partial and ready rows read "Sell k · +$X" with X = that tap's credit. Wait reads "Need N" (unit-tested; no wait row came up in the browser cases). **Logic PASS, display FAIL (MK-24-1).** |
| One payout path | PASS. rg shows that sellTo (credit, also used by Sell all and the Market Hand), the Sell all preview, row values and buttons, the popup (e.value) and the income rate (e.value) all go through sim/payout.ts saleValueCents. The other eggPriceCents uses are display-only: the upgrade-row price preview (app.ts:425) and the debug panel. |
| BUG-3 formatter | PASS with known issue FMT-2 (bug3-format.log, run on 8468101; format.ts unchanged) |
| BUG-5 merged '+N' floater | PASS in C/F/W. Taps 200ms and 240ms apart in a chain of about 1s: one floater ("+30"/"+25") is removed 750ms after the **last** tap, not 750ms after the first. bug45-*.log |
| BUG-4 leaving customer | PASS in C/F/W. Partial and "Sold out!" ghosts wave, then slide and fade (opacity 1→0 with a transform) and live about 1500ms. |
| Unit tests | 410/410 pass, matching Engineering's claim. (8468101 gave 409 for Engineering's claimed 407; the 2-test gap is likely the economy-copy test, which skips without ../product.) |
| typecheck / sync --check / economy CSV match | PASS / PASS / PASS (32 lines) |
| Release build + check-release-build | PASS (m3-rc1-pre+8be6ad4). Globals: known S2-REL-1. |
| rc0-browser | Chromium 56/56, Firefox 56/56, WebKit 56/56, all first try with no crashes |
| Pacing | Identical to 4aadcbf/20f6bd0 apart from runtime: L18 at 30:00, L30 at 243.8 min (run on 8468101; sim unchanged) |

Scripts: qa-bugs-8be6ad4/{bug12.mjs, qa-bug45.mjs, qa-sellbtn.mjs, fmt.ts}.
