# rc1 Cut A UX review: build ccd7bf9
2026-10-16 · Art & UX review pass · checklist: art-ux/claude-review/rc1-cutA-checklist.md (rev 2, v1.4)
Screenshots: `engineering/screenshots/rc1ux-{360,375,1280,asleep-360,goalstrip-L25-360}.png` (360/375 phone shots are 2× DPR; px measurements below are converted to CSS px). Contrast was measured from the screenshot pixels (WCAG 2.x, dominant bg vs. darkest glyph colour). Claude calls: 0.

**Summary:** 0 Blocker · 0 High · 3 Medium · 4 Low · 3 Info (needs verification). **No merge blocker.**

## Findings (by severity)

### M1 · Medium · Workers tab badge covers the label
- **Screen/width:** Upgrades › Workers tab, 360 · `engineering/screenshots/rc1ux-asleep-360.png`
- **Element:** the asleep count badge "1" on the Workers tab
- **Issue:** the badge sits on top of the label's last letter, so it reads "Worker" with the "s" hidden. The mock (rc1-asleep-card-360.png) puts it clear of the text, top-right.
- **Breaks:** LS:219 (tab labels never clipped), UV:72 (badge top-right), UV:83 (UV-2 no clipping).

### M2 · Medium · HUD income at $0.00/s uses ▼ instead of ⚠
- **Screen/width:** HUD, 360 · `engineering/screenshots/rc1ux-asleep-360.png`
- **Element:** `#rate` "▼ $0.00/s" in red
- **Issue:** the spec asks for a ⚠ icon when income is ≤0. The arrow is a weaker, trend-style cue. Text is present, so this isn't colour-only, but the icon is wrong.
- **Breaks:** AS:14, AS:30, checklist C16.

### M3 · Medium · Raw-effect line shown at phone widths
- **Screen/width:** Collection card, 360 and 375 · `engineering/screenshots/rc1ux-360.png`, `engineering/screenshots/rc1ux-375.png`
- **Element:** "+12% egg price · +5/tap" (wood text) under the title
- **Issue:** raw effects are "960+ only". At 360/375 they repeat the before→after list, add a line, and aren't in the 360/375 mocks. This makes the card more crowded, against the goal of a clearer value message.
- **Breaks:** UV:45, UV:58, checklist A8.

### L1 · Low · Goal label spacing at 1280
- **Screen/width:** goal strip, 1280 · `engineering/screenshots/rc1ux-1280.png`
- **Element:** label "★Collection L5· +8% income"
- **Issue:** the space after ★ and the space before "·" are both missing. At 360 (goalstrip-L25) the spacing is correct, so this is probably a span-join or whitespace issue in the desktop path.
- **Breaks:** UV:47, UV:82 (UV-1 exact spacing).

### L2 · Low · Payback chip has no 1px outline
- **Screen/width:** Collection card, 360/375/1280 · `engineering/screenshots/rc1ux-360.png`
- **Element:** "Pays back in ~1 min 13 s" chip
- **Issue:** the pixels go straight from white to cream (#FFF6E5) with no `--c-slot-outline` border, so the chip almost disappears on the white card. Text contrast is fine (12.31:1).
- **Breaks:** UV:28.

### L3 · Low · Dimmed asleep-card text is below 4.5:1
- **Screen/width:** Coop Hand card, 360 · `engineering/screenshots/rc1ux-asleep-360.png`
- **Element:** "Coop Hand · Asleep", "Energy 0%", "Wage $3.50/min" at opacity .5
- **Issue:** these measure 2.91:1 and 2.18:1. Dimming is per spec (UV:74), and the banner carries the state at 5.65:1. The dimmed text is still informational, though, so the spec should either accept this as disabled-style (exempt) or move the dim to 0.6+.
- **Breaks:** layout-spec §7 "contrast AA" (LS:199) vs UV:74. This is a spec decision, not a build bug.

### L4 · Low · "build ccd7bf9" HUD label has low contrast
- **Screen/width:** HUD, all widths · `engineering/screenshots/rc1ux-goalstrip-L25-360.png`
- **Element:** build tag on wood
- **Issue:** it measures 3.2:1 (and 1.95:1 under the sheet scrim). It's acceptable if this is a debug-only tag that's removed for release. Otherwise it fails AA.
- **Breaks:** LS:199.

### I1 · Info · Upgrades nav badge not visible
In `engineering/screenshots/rc1ux-asleep-360.png` the open sheet covers the nav, so I can't verify the count badge on the Upgrades nav button (UV:72, UV:87, LS:83). Please add a sheet-closed asleep screenshot.

### I2 · Info · Unpaid and Grader banners not captured
The "⚠ Unpaid, production stopped" and "Asleep, bonus down to 15%" banners aren't in any screenshot (UV:73, checklist C15). These variants are untested.

### I3 · Info · Hit areas can't be proven from pixels
The 44px rule (UV:86, D10) needs getBoundingClientRect. Visible sizes:
- Buy is 48 px ✔ and the asleep Refill is 48 px ✔.
- The goal pill is 40 px visual. A 44 px hit area needs the padding, which pixels can't show.
- The panel close circle is 22 px visual (LS:86 needs a 44×44 hit area).
- The tab pills are about 33 px visual (LS:91).
- The "Limited by collecting" link and the "Affordable in" ETA aren't on screen (the Farm tab wasn't captured).

Please supply a DOM-rect dump.

## Passed (measured)
- Effect chip #2F6B27 on #E8F4E4: **5.68:1** ✔ (v1.4 fix landed, UV:14).
- Payback text: 12.31:1 ✔. Best buy chip: 8.61:1 ✔. Ready! chip (1280): 8.61:1 ✔.
- Buy: white on #3D7F33, 4.90:1 ✔. Level meta (muted): 6.34:1 ✔. Raw-fx wood text: 6.16:1 ✔.
- Asleep banner: #B83B37 with white text, 5.65:1 ✔ (--c-danger). Tab badge: 5.65:1 ✔.
- Goal label: 13.21:1 ✔. Goal status (muted): 6.34:1 ✔. "Coop upgraded!" toast: 4.90:1 ✔.
- Best buy = ★ chip text + 2px yolk-dark outline (not blue) ✔ (UV:30). There's only one Best buy on screen ✔ (UV:84).
- Asleep card: 💤 + text banner, banner and Refill at full opacity, rest dimmed ✔ (UV:73–74). The Market Hand Refill is disabled with the caption "Rested, refill below 40%" ✔ (AS:36).
- Goal strip L25 at 360: `★ Collection L25 · +12% income` fits with no truncation, short status `~1:09` ✔ (UV:48), chevron hidden < 380 ✔ (NG:44). At 1280 the strip shows the Ready! chip and chevron ✔.
- No horizontal overflow in any shot ✔ (LS:218).

## Pass/fail per checklist section
| Section | Result | Why |
|---|---|---|
| A. Clipping/ellipsis | **FAIL** | M1 (Workers label clipped), M3 (raw fx at phone), L1 (spacing) |
| B. AA contrast | **PASS with notes** | All v1.4 chips/banner/badge pass. L3 (dimmed text) and L4 (build tag) are below 4.5 but outside the chip scope |
| C. Not colour alone | **PASS with notes** | Best buy, asleep, Ready and disabled all have text/icon. M2 (▼ instead of ⚠). I2 untested |
| D. Tap targets ≥44 | **INCONCLUSIVE** | Visible Buy/Refill ≥48 ✔. Close, tabs, goal and link need DOM rects (I3) |
| E. Next-goal clarity | **PASS with notes** | Best-buy target matches the starred row, ✔ Ready/ETA. L1 spacing at 1280 |

**Merge blockers: none.** Recommend fixing M1–M3 before rc1 sign-off and getting the I1–I3 evidence.
