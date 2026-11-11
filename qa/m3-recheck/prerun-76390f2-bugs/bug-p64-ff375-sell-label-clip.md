# BUG DRAFT (to UI engineer e80556fd) — Firefox 375: Sell button label overflows its box by 1-2 px (QA4-1)
Status: draft for UI eng, filed per HoQ QA-D-1030-PRERUN-TRIAGE (2). Severity: **Minor, non-blocking** (HoQ). **Fold into #83 (M4.1 patch 2, manifest row 3) if cheap.**
Build: m4.1+76390f2 (SHA 76390f2834b98e981ef52a3e165436acd9170654), pre-run PROVISIONAL evidence (not an RC gate).
Engine/size: Firefox (Playwright firefox-1555), 375x667. Chromium 360/375/390 and WebKit 375 PASS the same cases (sw == cw exactly).

## Repro
1. dist-qa of 76390f2, Firefox, viewport 375x667.
2. Harness p64 `head ra,huge` (artifacts/v5-ui/harness/p64/p64.mjs:91): Market sheet open with orders #900/#901 set to each huge-number fixture: 999.9K, Qa, Dc-999.9, sci-1.00e36, huge-max.
3. Measure each order's `.order .btn.sell`: scrollWidth vs clientWidth (p64.mjs:48: `sw <= cw + 0.5`) and every part (p64.mjs:47).

## Expected
Sell label never clipped/ellipsised: MK-24-1 v3 / Art & UX (styles.css:387 "always two-line Sell … shared width via --sell-w … never ellipsis the button"; MK-24-1 approved art-ux/decisions.md:49); QA4-1 Minor (qa/decisions.md:98-100). scrollWidth <= clientWidth.

## Actual (5 cases x 2 checks = 10 FAILs; text-overflow clip, ws normal, font 800 14px)
| Case | Button text | scrollWidth | clientWidth | button w | FF shot |
|---|---|---|---|---|---|
| 999.9K #900 | Sell 876.4K / +$876.4K | 86 | 84 | 88 | shots/p64/firefox/head-ra-huge-999.9K-w375.png |
| Qa #901 | Sell 8.99Qa / +$8.9Qa | 89 | 87 | 91 | shots/p64/firefox/head-ra-huge-Qa-w375.png |
| Dc-999.9 #900 | Sell 900No / +$900No | 86 | 84 | 88 | shots/p64/firefox/head-ra-huge-Dc-999.9-w375.png |
| sci-1.00e36 #901 | Sell 734Dc / +$734Dc | 85 | 84 | 88 | shots/p64/firefox/head-ra-huge-sci-1.00e36-w375.png |
| huge-max #901 | Sell 8.00e37 / +$8.00e37 | 94 | 92 | 96 | shots/p64/firefox/head-ra-huge-huge-max-w375.png |
Same cases in Chromium 375 / WebKit 375: sw == cw (84/84, 87/87, 84/84, 84/84, 92/92) — i.e. no slack at all in any engine; Firefox lays the Nunito 800 label 1-2 px wider.
(Side note in the 2nd column: `+$8.9Qa` vs `Sell 8.99Qa` is as shipped; not part of this bug.)

## Evidence (all under artifacts/v5-rc-ui/prerun-p2/p64/)
- logs/p64-firefox-375.log lines 1-10 (FAIL records with sw/cw)
- p64/p64-head-firefox-375-ra.jsonl (section QA4-1, per-card btn sw/cw); compare p64/p64-head-chromium-375-ra.jsonl, p64/p64-head-webkit-375-ra.jsonl
- shots/p64/firefox/head-ra-huge-*-w375.png (5)

## Likely location (not verified in a browser)
- `src/ui/order-list.ts:57-71` syncSellWidth: shared width = max(88, max `b.scrollWidth` at `width:max-content`), capped at 45% of the row, `Math.ceil`. It sizes the button to the measured content with zero slack, so a 1-2 px wider font render in Firefox (or integer rounding of scrollWidth) clips.
- `src/ui/styles.css:388-392` (`.order .btn.sell{width:var(--sell-w,88px);min-width:88px;…;padding:4px 10px}`, `.sk/.sy` nowrap, text-overflow clip), with `*{box-sizing:border-box}` (styles.css:18).
- Cheap fix candidates for UI eng to choose: measure with getBoundingClientRect().width (fractional) + border, or add 2 px slack before ceil. Re-check Cr/WK stay unchanged at 360/375/390.
