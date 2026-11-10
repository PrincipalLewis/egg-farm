# UI screenshot spec check · 2026-10-16 22:31 · UI/Visual Designer
Routine run. New screenshots since 22:10 (log: reviews/screenshot-check-log.md).
Build: **7d52952** (fix/rc1-qa-bugs-v4, on main a01faea), WebKit leg of the QA run (layout-webkit.log, 22:30, QA "ALL PASS webkit").

## Verdict: FAIL, Minor (repeat of item 4 from screenshot-check-2026-10-16-2040.md, now confirmed in all 3 engines, plus 2 additions)
No new Major. The open Major from 21:03 ('Limited by collecting' overlap @1371305) is not covered by these shots and stays open.

| # | Item | Spec | Result |
|---|---|---|---|
| 1 | Order card line 1 at 360, Waiting + mixed states, WebKit | m3-customer-queue-spec.md:62 | **FAIL, Minor** (same as Chromium/Firefox) |
| 2 | Order card line 1 at 360, **Need** state (all engines) | m3-customer-queue-spec.md:62 | **FAIL, Minor** (new: cut is worse, `e…`) |
| 3 | `Need 181.2B` button label wraps to 2 lines, 46px tall (all engines, all widths) | m3-customer-queue-spec.md:62, :99, :105 | **FAIL, Minor** (new) |
| 4 | Everything else in the WebKit shots (375/390/430/1280) | m3-customer-queue-spec.md:57, :62, :99 | PASS |

## 1. Eggs count cut mid-word at 360 (WebKit confirms)
Evidence: qa/m3-recheck/rc1-qa-bugs-v4-7d52952/webkit-mixed-360.png, row 2 reads `0/1.8M eg… · $9.94M`. Same as chromium/firefox-mixed-360.png.
- Spec :62: the eggs count is never cut; at ≤360, if line 1 doesn't fit, drop the " eggs" word (`0/1.8M · $9.94M`). The value part is the one allowed to ellipsize.
- Note the DOM text is whole (layout-webkit.log `"l1":"0/1.8M eggs · $9.94M"`), so the QA layout check passes on text but the rendered line is ellipsized. The layout check should compare scrollWidth vs clientWidth on `.l1`, not textContent.

## 2. Need state cuts harder: `0/1.8M e…` at 360 (all engines)
Evidence: webkit-need-360.png and chromium-need-360.png, row 2. The secondary `Need …` button is 93px wide vs 88px for Sell, so line 1 loses 5px more and only `e` survives. I glanced past need-* at 21:03; this is a miss on my side, now logged.
- Same fix as item 1 covers it.

## 3. `Need 181.2B` wraps to two lines (all engines, every width)
Evidence: webkit-need-{360,375,390,430,1280}.png row 3 (`Need` / `181.2B` stacked); layout-{chromium,firefox,webkit}.log `"btn":"Need 181.2B" … "h":46` (other buttons 44).
- Spec :62 caps button labels at `Need 999K` length (compact numbers), :99 says long values never wrap, :105 fixes the chip at 44px so the row never resizes. 181.2B is past the cap and the button grows to 46px.
- `Sell 181.2B` fits on one line (its +$ sub-line is designed as line 2), so only the Need variant breaks.
- Tap target ≥44px is still met; this is a layout/consistency issue, not an a11y one.

**Change list (Eng):**
1. Line 1 at ≤360: implement the drop-" eggs" fallback (container query `(max-width:200px)` on `.txt`, or a JS width check), m3-customer-queue-spec.md:62, for both Sell and Need states.
2. Need button: `white-space:nowrap` on the label and let the button take its natural width up to the min-width budget, or drop to 12px for labels over 9 chars. Height stays 44px (:105).
3. Recheck at 360/375/390 + 1280 docked in all 3 engines; QA layout check should assert `.l1` scrollWidth ≤ clientWidth and button height = 44.

## 4. Passes (WebKit, 7d52952)
- Copy and states match :57 and :98: have 0 shows `Need N` (outline, #6B5D52 text, 6.34:1 on white), partial `Sell k` with `+$` line, money never truncates (`$9.94M`, `$1T`).
- 375/390/430/1280: line 1 whole (`0/1.8M eggs · $9.94M`, `0/181.2B eggs · $1T`) in every row.
- Sell buttons 88×44, Need 93×44 (except item 3); `Sell 181.2B / +$1T` fits; Sell all `Sell all (181.2B eggs · $1T)` fits at 360 and 1280 docked; disabled `No eggs to sell` reads as disabled.
- 1280 docked: Market panel and Upgrades panel lay out without overlap; aria labels spell full amounts (`Sell 1.8M · +$9,936,000.00`).

## Out of scope / no review needed
- qa/scratch/pr1-cf66ce5/docs/readme/{header,screenshot-desktop,screenshot-farm,screenshot-workers}.png: byte-identical (md5) to the pr1-e845cf3 README copies logged at 22:10.
