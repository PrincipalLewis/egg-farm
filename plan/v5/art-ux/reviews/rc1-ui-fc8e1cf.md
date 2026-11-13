# Art & UX review: m3/rc1-ui @ fc8e1cf (112 PNGs, Chromium + WebKit, 360/375/390/960/1280)
Reviewed Fri Oct 16 2026 by Head of Art & UX.

## Verdict: APPROVE WITH FIXES (no gates; Thu merge can go ahead)

## Engineering's five rulings
1. Strip 9px taller: **accepted**. At 360x640 (rc1-queue-full-9of9-360x640-*), strip, coop, hens, progress bar, next-goal row, Collect and nav all fit above the fold.
2. Toast 2.5s: **accepted**. layout-spec §1 (queue strip) and §4.7 now say 2.5 s; no 1.5 s left.
3. Nav label "Refill": **accepted** (app.ts nav-lbl "Refill", becomes "0:30" during cooldown).
4. Sold line = one Market Hand cycle after Collect: **accepted**.
5. Market dot 14px box: **accepted** as long as only the 10px #B83B37 dot is painted. The red dot is visible on Market in queue-full shots.

## Checked and passing
- Full queue 9/9: 4 chips + "+5" (9−4) at all widths. "Queue full" tag sits on the strip top edge at 390+, "Full" at 360/375. The tag doesn't cover any chip.
- Coop L5 red barn / L10 cream two-storey with blue roof and silo / L20 golden with tower and wings: matches assets/coop-l5/l10/l20.svg.
- "Coop upgraded!" toast shows above the open Upgrades sheet (rc1-toast-over-sheet-*).
- Welcome-back: "Market Hand sold 339 right away · +$1,118.70" in muted brown, wraps cleanly at 360.
- Money pill: "▼ −$0.12/s" in red under the balance; "$0/s" neutral.
- Worker panel: "Refill tired (0)", "Ready in 30s" caption, greyed buttons, "Wage $0.04/s".
- No stray yellow particle at top-left at 375 (rc1-coop-l5-375x667-*). Small sparkle dots near hens are the §4.7 tier sparkles.
- No clipping or overlap found. Text contrast looks AA throughout.

## Issues
| # | Screenshot | Severity | Issue | Exact fix |
|---|---|---|---|---|
| 1 | rc1-refill-cooldown-farm-360x640-*, -375, -390 | rc2 (fix-if-cheap) | Nav Refill during cooldown shows "0:30" with the green ring, but the icon stays full colour, so it doesn't read as disabled. | `.nav-manage.is-cooldown .manage-ico img{filter:grayscale(1);opacity:.55}`. Keep the timer text #3E2C23 (AA). |
| 2 | rc1-refill-cooldown-farm-1280x800-*, -960x600-* | fix-if-cheap | Docked Upgrades-header Refill pill ("Ready in 30s") looks about 34–36px tall, under the 44px target. | `.desk-manage-all{min-height:44px}`. Confirm in the Thu build. |
| 3 | rc1-coop-l20-360x640-*, rc1-coop-l5-375x667-* | rc2 | "Coop upgraded!" toast covers the top of the coop sprite (hides the L20 flag) for its 2.5 s, right when the new tier should be shown off. | Anchor the toast just below the queue strip (`top: strip bottom + 8px`), or start the sprite bounce after the toast hides. |
| 4 | rc1-refill-cooldown-*, cooldown caption | rc2 | Caption is "Ready in 30s" while the nav shows "0:30". Two formats for the same timer. This is allowed by m2-workers-layout v1.3. | Leave as is for rc1. Pick one format in rc2 (prefer m:ss everywhere). |

Net-rate glyph check: the code emits `▼` + U+2212. Confirm in Firefox that no extra hyphen renders (non-blocking).
