# Screenshot spec check: Cut A v3, PR #3 @ eb27707 · UI/Visual Designer · 2026-10-17 02:50 CEST
Evidence: /workspace/wt-ui-shots/cuta3/ (60 PNGs, Chromium/Firefox/WebKit). Viewed with Read (montages + 3–4× crops); px measured from the PNGs with PIL.
Specs: rc1-upgrade-value.md v1.6.1 §4, rc2-notes-b2-b3.md B-3, rc2-order-sell-preview.md v1.0 (+ MK-35 note), b1-coop-full-copy.md, style-direction.md, prior reviews 21:03 / 22:31 / 23:25.

## Verdict: FAIL, 2 Major, 4 Minor, 3 Nit
**Provenance flag:** every screenshot HUD reads `build c231c02`, not eb27707. Either the build label is stale or the shots are from another build. Confirm before sign-off. Results below are for what the pixels show.

| # | Item | Result | Sev | Evidence |
|---|---|---|---|---|
| 1 | B-3 compact Farm card (≤260px, or ≤282 with ETA) at 360/375/390 | **FAIL** | **Major** | cuta3-farmcard-{affordable,unaffordable}-{360,375,390}-*.png |
| 2 | Goal label short-name (last resort) at 360 | **FAIL** | **Major** | cuta3-goal-short-name-360-{chromium,firefox,webkit}.png |
| 3 | Order card 0-eggs button copy (`No eggs`, MK-35) | **FAIL** | Minor | cuta3-order-need-360-*.png, cuta3-order-line-360-*.png |
| 4 | Order row: drop ` eggs` before value is cut / at ≤375 | **FAIL** | Minor | cuta3-order-sell-360-*.png, -need-, -line- |
| 5 | Order value ellipsised even with ` eggs` already dropped (`181.2B/181.2B · $1…`) | **FAIL** | Minor | cuta3-order-sell-360-*.png row 1 |
| 6 | Number abbreviations | **FAIL** | Minor | cuta3-order-sell-360-* HUD `1000B`; cuta3-refillbar-1280-*/full-1280-* `Next customer soon... (1000000000s)` |
| 7 | Sticky Refill bar backing, 360 + 1280 docked | PASS (Nit) | Nit | cuta3-refillbar-{360,1280}-*.png |
| 8 | 'Limited by collecting' overlap (21:03) | PASS | — | cuta3-farmcard-*-360-*.png, cuta3-full-*.png |
| 9 | Goal label one-line / two-line at 360 | PASS | — | cuta3-goal-{one-line,two-line}-360-*.png |
| 10 | Need button height / wrap (22:31 #3) | PASS (Nit) | Nit | cuta3-order-need-360-*.png |
| 11 | Sell button / preview, tap targets | PASS (Nit) | Nit | cuta3-order-sell-360-*.png |
| 12 | Farm card 1280 | Not verifiable | — | cuta3-farmcard-*-1280-*.png (crop 382×250 cuts off at `Level 6 / 30`, no Buy/link) |
| 13 | Full pages 360/375/390/1280 | PASS apart from 1, 6 | — | cuta3-full-*.png |

## 1. FAIL Major: B-3 compact Farm card not applied
Card is **368px tall** (border rows y=8→376) at 360, 375 and 390 in all 3 engines, both affordable and unaffordable. The target is ≤260 (≤282 with ETA). None of the B-3 changes are visible: still 5 single-column fx rows, separate `Level 6 / 30` line, effect + payback chips on two rows, coop note on its own line, 16px padding. The affordable card also has an empty band (~30px) between Buy and the link, which suggests a fixed min-height.
Fix: apply rc2-notes B-3 table rows 1–5. Level goes into the title row (`Farm · L6/30`). fx becomes a 2-col grid with short labels at 13px. Put the chips on one row with the short payback `~3 min 43 s`. Coop note moves into the tier line. Use gap 6 and padding 12 at ≤375, and remove any min-height. Re-shoot at 360/375/390, plus 1280 with the full card in frame.

## 2. FAIL Major: short-name goal label clips its gain line
In the short-name (large-text) case, `★ Coll. L30` renders large, line 2 `· +999% income` is cut by the strip's bottom edge and runs under the Collect button. The flag icon drops to the bottom-left. The gain span must never be truncated (v1.6.1 §4, Product C-AC26b).
Fix: §4 CSS: `.goal{height:auto;min-height:var(--goal-h)}`, `.goal-label{white-space:normal;overflow:visible}` and let the strip grow when 2 lines exceed 40px. Centre the flag and status (`align-items:center`). Re-shoot short-name at 360.
(Resize/dock refit is a known fix in progress. No missing-space artifact is visible in these shots, so it is not failed.)

## 3. FAIL Minor: 0-eggs button still reads `Need N`
With 0 eggs the buttons read `Need 181.2B`, `Need 1.8M`, `Need 8.76M`, `Need 5`, `Need 999`. MK-35 / rc2-order-sell-preview v1.0 note: 0 eggs → `No eggs` (disabled, `aria-disabled`). The long labels are shrunk to ~8px (`Need 181.2B`, `Need 8.76M`), which is illegible. `Need 1.8M` / `Need 999` touch or overrun the pill border in Chromium and WebKit.
Fix: render `No eggs` for k=0 (fixed width, no font shrinking). This also removes the shrink-to-fit path.

## 4. FAIL Minor: ` eggs` not dropped at 360
`5/5 eggs · $5.00`, `0/999 eggs · $999.00`, `0/1.8M eggs · $7.2M` keep ` eggs` at 360. The spec says to drop it at ≤375, and at every width when the value would be cut. `$999.00` and `$7.2M` sit flush against the button.
Fix: apply the drop at ≤375 unconditionally, and when the value span overflows at any width.

## 5. FAIL Minor: value cut even after dropping ` eggs`
Row 1 reads `181.2B/181.2B · $1…` in all engines, so the order value is unreadable.
Fix: the value has priority over the count. Shrink the count first, e.g. `181.2B/181.2B` → `Full` or `181.2B` when have=want, or abbreviate to 3 significant digits (`181B/181B`). Never ellipsise the `$` value. Spec addendum for Head of Art & UX to rule on.

## 6. FAIL Minor: number formatting
HUD egg count shows `1000B` (should be `1T`). The Market empty state shows raw `(1000000000s)` at 1280 docked. Fix: the formatter rolls over at 1000 → next suffix. The customer timer uses the short duration format (`~m:ss` / `~1h 59m`), and is hidden or `—` when it is effectively never. (Fixture extremes, but this is the shipping formatter path.)

## 7. PASS (Nit): sticky Refill bar backing (closes 23:25 #6)
At 360 and 1280 docked, `Refill 2 tired workers` now sits on an opaque cream strip (sampled #FFF6E5 at both edges). No banner slivers left or right, and the cards scroll under it. Nit: a ~1px pink tick shows just under the strip (≈x142,y333 at 360), from the hidden card's red banner edge. Extend the strip's bottom padding by 2px or add a 1px cream box-shadow. Also Nit at 1280: the header pill `Refill 2 tired workers` duplicates the sticky green CTA right below it. Consider hiding the header pill while the sticky bar is visible.

## 8. PASS: 'Limited by collecting' overlap (closes 21:03 Major)
The link now sits in flow under Buy / `Affordable in ~0:41` in all engines and widths, with no overlap with the payback chip.

## 9. PASS: goal label one-line and two-line
`★ Farm L30 · +999% income` on one line. `★ Collection L30` / `· +999% income` breaks before `.g-gain` as specified, ★ kept, no ellipsis, fits in the 40px strip in all 3 engines.

## 10. PASS (Nit): Need button height (closes 22:31 #3)
The pill measures 44px (y=284→327) in Chromium and WebKit, with no wrap, so it is no longer 46px. Nit: achieved by font shrink. Superseded by fix 3 (`No eggs`).

## 11. PASS (Nit): Sell state
Sell buttons are 44px+, with the full-order meadow outline. Bars show full fill (fixture has have=want). The preview segment is not exercised in any shot. Nit: the label reads `Sell`, not `Sell {k}`. Fix: show `Sell {k}` per v1.0 §4, and add a mid-fill fixture (e.g. 4/17, basket 8) to the shot set so the hatch preview and 4px min can be checked.

## Prior open items
- 21:03 'Limited by collecting' overlap: **CLOSED**.
- 23:25 sticky Refill bar no backing: **CLOSED** (Nit 7 remains).
- 22:31 #3 `Need 181.2B` wrap / 46px: **CLOSED** on height. Replaced by item 3 (`No eggs`).
- 22:31 #2 Need-state line cut: **CLOSED as reshaped**. The count is no longer `e…`-cut, but it is replaced by items 4/5.
- 22:31 #1 WebKit order-card cut: **OPEN** as item 5 (`$1…`, now all engines).
- B-3 compact card: OPEN (item 1).
