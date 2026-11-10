# Screenshot check: PR #16 offline popup v2 @ 5248dd9 (2026-10-17 ~03:00 CEST)
Reviewer: UI/Visual Designer. Spec: product/collection/offline-popup-v2-spec.md (now v0.3.1; the v0.2 content was folded into v0.3 and approved). Also the HoA&UX calls: HUD money in Nunito + tabular-nums, cap line uses an SVG clock instead of ⏱.
Shots: /workspace/offline-v2-shots/offline-v2-*.png (sizes checked: 360x640, 375x700, 390x844, 1280x800 docked, 360x420, 390x844 rm, HUD 360x640). Source: game/ @ 5248dd9 (branch feat/offline-popup-v2, author Senior Engineer, UI & rc1 Fixes).
Note: the 1280 shot is shown downscaled to 1024 in the viewer; the file is 1280x800.

## Verdict: FAIL (1 Major, 3 Minor)

| # | Item | Result | Sev | Evidence | Fix |
|---|---|---|---|---|---|
| 1 | Cap line clock is an SVG, not ⏱ (HoA&UX call) | **FAIL** | Major | capped-1234567-360x640 / -1280-docked; app.ts:243 `<span class="wb-clock">⏱</span>` | Replace it with an inline SVG clock (16px, `aria-hidden`, stroke `currentColor` = --c-wood-text #8A5528, 5.7:1 on the cream, so it clears 3:1), `vertical-align:-3px`, 4px gap. Drop the emoji. The spec text still writes "⏱" as shorthand for the icon. |
| 2 | Build label visible and = 5248dd9 | **FAIL (unverifiable)** | Minor | No build label shows in any offline-v2-* shot | Re-shoot with the HUD build label visible (or put the SHA in the filename/README), as the other PRs do. |
| 3 | Short height: Collect visible without scrolling (C-AC33) | **FAIL** | Minor | capped-short-360x420: the rate line drops correctly, but Collect is cut off by the bottom nav and the card is taller than the viewport | Keep the card at max-height 80vh. After the rate line drops, let the body scroll inside the card with Collect pinned (sticky bottom), or shrink the hero to 28px when the height is under 480. 420 is below the app's 640 min-height, so this is low risk. |
| 4 | HUD egg count full digits under 1M (spec v0.3.1, C-AC39 ext.) | **FAIL** | Minor (spec changed 02:53, after this build) | hud-999999-360x640 basket shows "100K" | Show "100,000" with fmtCount full digits under 1M, tabular, slot reserved for "999,999". |
| 5 | HUD money full digits under $1M | PASS | – | hud-999999-360x640 "$999,999"; others "$0.00" | – |
| 6 | HUD money slot: Nunito + tabular-nums, width reserved | PASS (source) | – | styles.css:472 `.money-slot` font-family var(--f-body)=Nunito; app.ts:62 `.num` (tabular-nums, styles:21) and the ghost "$999,999" | Only one non-zero HUD frame was captured, so there's no visual jitter proof. Nice-to-have: shots of $1,111 / $888,888 at the same position. |
| 7 | Title, line A "Away 3h 12m · capped at 2h", hero on its own line | PASS | – | capped 360/1280 | – |
| 8 | Hero full digits "+1,234,567 eggs", no K/M/B in popup (C-AC29) | PASS | – | capped 360/1280 | – |
| 9 | Sub-line "added to your basket", no "no limit" | PASS | – | all popup shots | – |
| 10 | Money line "Worth up to $1,234,567 when sold", whole $ | PASS | – | capped 360/1280; uncapped "$2,684" | – |
| 11 | Rate line small, drops first | PASS | – | present in 360x640, dropped in 360x420 | – |
| 12 | Cap line only when capped, accent colour | PASS | – | absent in uncapped-rm-390x844 | – |
| 13 | Collect full width, ≥48px (styles:470 min-height 48) | PASS | – | all popup shots | – |
| 14 | Close × tap target ≥44px | PASS | – | .icon-btn 44x44 (styles:42) | – |
| 15 | Contrast | PASS | – | cap #8A5528 5.74:1, rate #6B5D52 5.91:1, body #3E2C23 12.3:1 on #FFF6E5 | – |
| 16 | No clipping/truncation at 360/375/390/1280 | PASS | – | capped-* (wraps, no ellipsis) | – |
| 17 | Aria spells amounts (C-AC38) | PASS (source) | – | dialog aria-describedby="wbAria", moneyWords, button aria-label=m.button; cap line aria-hidden but its text is in wbAria | – |
| 18 | Uncapped case values | PASS (note) | – | uncapped-rm: "Away 11m 11s / +2,684" is the old C-AC27 fixture, internally consistent | Re-shoot with v0.3.1 fixture 11m 23s → +2,732. |

Out of scope in this folder: m3-rc0-*, save-recovery-v4-* (not PR #16).
