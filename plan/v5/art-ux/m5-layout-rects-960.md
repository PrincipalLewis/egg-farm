# M5.0 layout rects at the 960 boundary: GE-16 · BH-k · GE-17 · SS-G6 — RC 5d9efa6 · v1.0 · 2026-10-24
UI/Visual Designer · 17:30 CEST (UTC+2) · for Head of Art & UX and PM Market (m5-interaction-plan row 11).
- **Build:** RC `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463`, `build:qa`.
- **Engine:** Chromium 155, one run under the browser lock; my server was stopped afterwards.
- **Seed:** F12/H10, 12 hens drawn, Full! and the ×155 pill forced visible, worst-case toast. This is the `scratch/m5-layout-recheck-5d9efa6` method.
- **Data:** `shots/ge16-17/rects-chromium.json` and `manifest.json` (sha256 per PNG). Overlays are `shots/ge16-17/ge16-chromium-<size>-overlay.png`.
- **Scripts:** `scratch/ge16-17/{measure.mjs, ge16.py}`. `v11.py` holds the zones and clearances, and its `broody_ok` implements m5-broody-hen-art §2.
- **Detailed backup:** `reviews/ge16-ge17-5d9efa6.md`.
- **Method check:** the same code reproduces the published 360×640 and 1280×800 broody lists (360 shown: Y0 Y5 Y8–Y11; 1280 shown: Y0 Y5 Y7–Y11).

**Summary: all PASS.** GE-16 has ≥2 golden spots at every size, BH-k has ≥1 eligible broody slot (≥2 at every size), and the #goal clear space is ≥2px on both sides everywhere. The chip fits on one line inside #goal. There are 2 spec-text Minors (§F) and no build issue.

## A. Layout mode (confirmed ruling 17:06: dock only at min-width 960 AND landscape)
| Size | `(min-width:960px)` | landscape | `#app` columns | Mode | |
|---|---|---|---|---|---|
| 959×600 | no | yes | 959px | **phone** | ✓ expected |
| 960×600 | yes | yes | 560px 400px | **docked-compact** (FW 560 < 880, vh 600 < 700) | ✓ |
| 960×1280 | yes | no | 960px | **phone** | ✓ |
| 1024×1366 | yes | no | 1024px | **phone** | ✓ |
| 1280×800 (ref) | yes | yes | 880px 400px | docked | ✓ |

## B. GE-16 golden-egg spots (centre x,y; 56px hit box + 16px clearance, m4-timed-collectible §2.1)
| Size / mode | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | Valid |
|---|---|---|---|---|---|---|---|---|---|
| 959×600 phone | 242,224 ✓ | 242,264 ✓ | 242,305 ✓ | 242,345 ✗ meter 15px, ×N pill −22 | 718,224 ✓ | 718,264 ✓ | 718,305 ✓ | 718,345 ✗ meter 15px | **6/8** (pill hidden 6/8 too) |
| 960×600 docked-compact | 70,189 ✓ | 70,294 ✓ | 70,400 ✗ ×N pill −17 | — | 504,189 ✗ Full! 14px | 504,294 ✓ | 504,400 ✓ | — | **4/6** (5/6 pill hidden) |
| 960×1280 phone | 242,533 ✓ | 242,608 ✓ | 242,684 ✓ | 242,760 ✓ | 718,533 ✓ | 718,608 ✓ | 718,684 ✓ | 718,760 ✓ | **8/8** |
| 1024×1366 phone | 274,576 ✓ | 274,652 ✓ | 274,727 ✓ | 274,803 ✓ | 750,576 ✓ | 750,652 ✓ | 750,727 ✓ | 750,803 ✓ | **8/8** |
- Every spot is inside `#scene`.
- The stricter "in scene and off the yard" reading gives 2 / 3 / 4 / 4 valid spots. Hens aren't a spec no-spawn zone, though.
- **Worst case with a broody hen** (her hit box + 16, pill shown):
  - 959×600: ≥4/8;
  - 960×600: ≥2/6 (broody at Y5);
  - 960×1280 and 1024×1366: ≥6/8.
  
  The **floor of ≥2 holds everywhere.**

## C. BH-k Broody nest slots (m5-broody-hen-art §2: 56px hit box; ≥16 from tap targets and toast, ≥8 from readouts, ≥8 inside the viewport)
| Size / mode | Pill hidden (≤12 hens) | Pill shown (>12 hens) | Why the others drop |
|---|---|---|---|
| 959×600 phone | **Y0 Y5** (2) | **Y0 Y5** (2) | Y1–Y4 overlap the coop box (−8/−10) and the nest (Y2/Y3 −17). **Y6–Y11 overlap the coop `#meter` (−5)**: the short phone-landscape scene puts row 2 on the meter. Y6 also overlaps the ×N pill (−35). |
| 960×600 docked-compact | Y0 Y5 Y6–Y11 (8) | Y0 Y5 Y7–Y11 (7) | Y1–Y4 coop (−8/−10), nest (−19). Y6 ×N pill (−22). |
| 960×1280 phone | Y0 Y5 Y6–Y11 (8) | Y0 Y5 Y7–Y11 (7) | Y1–Y4 2–3px from the coop (<16), nest −17. Y6 ×N pill (−8). |
| 1024×1366 phone | Y0 Y5 Y6–Y11 (8) | Y0 Y5 Y7–Y11 (7) | Same as 960×1280. |

At H0 (5 hens drawn: Y0–Y4), **Y0 is eligible at all four sizes**, so the BH-AC13 ≥1 check passes. 959×600 is the tightest size (2 slots, outer row 1 only), but it is valid.
Hen centres: 959×600 row 1 y≈310 / row 2 y 365 at x 246…713; 960×600 row 1 y≈347 / row 2 y 405 at x 57…503; 960×1280 row 1 y≈689 / row 2 y 774; 1024×1366 row 1 y≈731 / row 2 y 816.

## D. #goal rects, pill, and clear space (Head's ruling: the hit area extends 2px past a 40px pill, so each side needs ≥2px clear)
| Size | Mode | #goal x–x (w) | y–y (h) | `.goal-pill` y–y, h, inset top/bottom | Above: `#meter`.b → gap | Below: `#collect`.t → gap | ≥2 | PM x range |
|---|---|---|---|---|---|---|---|---|
| 959×600 | phone | 12–923 (911) | 412–456 (44) | 414–454, 40, 2/2 | 404 → **8** | 460 → **4** | PASS | n/a (full column) |
| 960×600 | docked-compact | **24–536 (512)** | 472–516 (44) | 472–516, **44**, 0/0 | 464 → **8** | 524 → **8** | PASS | **✗ PM expects 12–548** |
| 1024×1366 | phone | 12–1012 (1000) | 1178–1222 (44) | 1180–1220, 40, 2/2 | 1170 → **8** | 1226 → **4** | PASS | n/a |
| 1280×800 | docked | 160–720 (560) | 672–716 (44) | 672–716, **44**, 0/0 | 664 → **8** | 724 → **8** | PASS | ✓ 160–720 |
| 960×1280 | phone | 12–948 (936) | 1092–1136 (44) | 1094–1134, 40, 2/2 | 1084 → 8 | 1140 → 4 | PASS | n/a |
| 360×640 (ref) | phone | 8–328 (320) | 456–500 (44) | 458–498, 40, 2/2 | 448 → 8 | 504 → 4 | PASS | ✓ SS-16 |
| 390×844 (ref) | phone | 8–358 (350) | 660–704 (44) | 662–702, 40, 2/2 | 652 → 8 | 708 → 4 | PASS | |
- The meter above and Collect below are the nearest painted or interactive neighbours.
- At docked sizes the pill is 44px (`--goal-h-lg`, `styles.css:500`) with no 2px inset, so the 2px extension exists only at phone widths.
- The M5.0 48px Collect keeps Collect's top edge, so these gaps don't change.

## E. GE-17 / SS-G6 Sales-stopped chip (spec §4.4: chip = `#goal` box; icon 16 + 6 gap, 12px side padding, 2px border, Fredoka 600 14px)
The chip isn't in 5d9efa6, so I injected a prototype at the live `#goal` rect.
- **SS-G6 chip rects = the #goal rects in §D:**
  - 959×600: 12,412 · 911×44
  - 960×600: 24,472 · 512×44
  - 960×1280: 12,1092 · 936×44
  - 1024×1366: 12,1178 · 1000×44
  - 1280×800: 160,672 · 560×44
  - 360×640: 8,456 · 320×44
  - 390×844: 8,660 · 350×44
- The chip is always ⊆ #goal (±0px) and 44px tall (≥44 tap target).

| String | Needed width (text + icon + gap + padding + border) | Narrowest slot (360: 320) | Lines | Fits at all 7 sizes |
|---|---|---|---|---|
| `Market Hand on break · Sell all` (longest) | 242.0 | 78 spare | 1 | ✓ |
| `Market Hand unpaid · Sell all` | 229.6 | | 1 | ✓ |
| `Market Hand asleep · Sell all` (cooldown, longest) | 228.2 | | 1 | ✓ |
| `Coop Hand unpaid · Collect` | 218.8 | | 1 | ✓ |
| `Market Hand asleep · Refill` | 218.5 | | 1 | ✓ |
| `Coop Hand asleep · Collect` (cooldown) | 217.4 | | 1 | ✓ |
| `Coop Hand asleep · Refill` | 205.3 | | 1 | ✓ |
| `Sales stopped · Sell all` | 190.0 | | 1 | ✓ |
| `Eggs waiting · Sell all` | 182.5 | | 1 | ✓ |
- No horizontal overflow and no wrap anywhere.
- The labels have no digits, so the longest strings are the worst case.
- The 17:06 "short label" fallback is never needed at ≥360. The spec's ≈295px estimate was high; the measured worst is 242px.

## F. Findings
- **m1 Minor (spec text):** m4-timed-collectible §2.1 says phone = "vw < 960", so ≥960 portrait matches no key. `v11.py:6` would put 960×1280 and 1024×1366 in docked-compact, but CSS renders them as phone. Fix: define phone as "not `(min-width:960px) and (orientation:landscape)`" and derive the key at runtime from that `matchMedia` query. The 17:06 ruling already says this; the spec text doesn't yet.
- **m2 Minor (PM numbers):** at 960×600, `#goal` is **x 24–536 (512 wide)**, not PM's 12–548. The cause is that `.collectbar{max-width:min(560px, calc(100% − 24px))}` (`styles.css:300`) sits inside the 12px farm padding. Fix: amend SS-16 to "960×600: x 24–536". The chip = #goal rule already makes the build correct.
- **n1 Nit:** in phone mode on tablets the chip spans the full #goal (911–1000px wide) around a 242px label. A centring or max-width tweak is a polish item.
- **n2 Nit:** the spec says Fredoka 600, but only the 500 and 700 woff2 files ship, so 600 renders with the 700 face. That makes the widths above the heavier worst case.
- **Gap:** none. The renders were Chromium only; this layout is CSS-deterministic.
