# GE-16 spawn spots + GE-17 Sales-stopped chip fit — paper/render check on RC 5d9efa6

**Verdict: GE-16 PASS · GE-17 PASS.** 0 Blocker / 0 Critical / 0 Major / 2 Minor (spec text) / 2 Nits.
UI/Visual Designer · 2026-10-24 17:20 CEST (UTC+2) · RC `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463` `build:qa` (worktree `art-ux/scratch/rc1-5d9efa6`) · Chromium 155 only (Firefox/WebKit skipped to keep the lock free; the layout values are CSS-deterministic) · one run under `flock …/.browser-test.lock`, own server :8774 stopped.
Method: `scratch/m5-layout-recheck-5d9efa6` (same seed F12/H10, Full! + ×155 pill forced visible, worst-case toast). Script `art-ux/scratch/ge16-17/measure.mjs`, analysis `ge16.py` (v11.py zones/clearance) → `shots/ge16-17/` (7 farm + 4 overlay + 7 chip PNG, `rects-chromium.json`, `manifest.json` with sha256).
Rules: `m4-timed-collectible.md` v1.1 §2.1 + decisions 2026-10-24 17:06 (dock only at min-width 960 AND landscape; docked-compact when FW < 880 or vh < 700).

## GE-16 — layout mode actually used
| Size | `(min-width:960px)` | landscape | CSS docked (`#app` cols) | Mode used | Expected | |
|---|---|---|---|---|---|---|
| 959×600 | no | yes | no (`959px`) | **phone** | phone | ✓ |
| 960×600 | yes | yes | **yes** (`560px 400px`) | **docked-compact** (FW 560 < 880, vh 600 < 700) | docked-compact | ✓ |
| 960×1280 | yes | **no** | no (`960px`) | **phone** | phone | ✓ |
| 1024×1366 (GE-17 add-on) | yes | no | no | **phone** | phone | ✓ |

## GE-16 — spots (centre x,y; 56px hit box + 16px clearance; ✓ valid per spec)
Spec zones: HUD, toast, queue, coop img, nest, Full!, meter, streak box (Collect.b+12), #goal, Collect, nav, docked column; ×N pill 0px. "Yard" = hit box intersects `#yard` (hens are **not** a spec no-spawn zone; the egg draws above them).

**959×600 phone** — scene 199.5,153–759.5,376, sky ends y 224. **6/8 valid** (strict, also off the yard: 2).
| Spot | x,y | Valid | Reason / notes |
|---|---|---|---|
| S1 | 242,224 | ✓ | sky/grass edge, off yard |
| S2 | 242,264 | ✓ | grass, over yard |
| S3 | 242,305 | ✓ | grass, over yard |
| S4 | 242,345 | ✗ | meter 15px (<16), ×N pill overlap −22 |
| S5 | 718,224 | ✓ | sky/grass edge, off yard |
| S6 | 718,264 | ✓ | grass, over yard |
| S7 | 718,305 | ✓ | grass, over yard |
| S8 | 718,345 | ✗ | meter 15px (<16) |

**960×600 docked-compact** — scene 12,153–548,436, sky ends y 246. **4/6 valid** (strict: 3).
| Spot | x,y | Valid | Reason / notes |
|---|---|---|---|
| S1 | 70,189 | ✓ | sky, off yard |
| S2 | 70,294 | ✓ | grass, off yard |
| S3 | 70,400 | ✗ | ×N pill overlap −17 (valid while hens ≤ 12) |
| S4 | — | — | not used in docked-compact |
| S5 | 504,189 | ✗ | Full! badge 14px (<16) (valid while the coop isn't full) |
| S6 | 504,294 | ✓ | grass, off yard |
| S7 | 504,400 | ✓ | grass, over yard |
| S8 | — | — | not used |

**960×1280 phone** — scene 200,398.5–760,818.5, sky ends y 462. **8/8 valid** (strict: 4).
| Spot | x,y | Valid | Notes |
|---|---|---|---|
| S1 / S5 | 242,533 / 718,533 | ✓ ✓ | grass, off yard |
| S2 / S6 | 242,608 / 718,608 | ✓ ✓ | grass, off yard |
| S3 / S7 | 242,684 / 718,684 | ✓ ✓ | grass, over yard |
| S4 / S8 | 242,760 / 718,760 | ✓ ✓ | grass, over yard |

(1024×1366 phone, bonus: 8/8, S1–S8 at x 274/750, y 576/652/727/803.)
**Floor ≥2: met at all sizes**, also under the stricter "in scene and off the yard" reading (2 / 3 / 4). All spots sit inside `#scene`. The worst case with the ×N pill visible is 959×600 (S4 dropped) and 960×600 (S3 dropped). Overlays: `shots/ge16-17/ge16-chromium-{959x600,960x600,960x1280,1024x1366}-overlay.png`.

## GE-17 — Sales-stopped chip inside #goal (chip prototype = #goal box, spec §4.4: icon 16 + 6 gap, 12px side padding, 2px border, Fredoka 600 14px)
The chip isn't in the 5d9efa6 build, so I injected a prototype at the measured `#goal` rect. The labels carry no digits (the 7 strings + 2 cooldown labels have no counters), so "worst case" = the longest strings.
| Width | #goal w×h | `Market Hand on break · Sell all` (longest normal) | `Market Hand asleep · Sell all` (longest cooldown) | `Coop Hand asleep · Collect` (cooldown) | Result |
|---|---|---|---|---|---|
| 360 | 320×44 | needs 242.0px, 1 line, no h-overflow, inside | 228.2px, 1 line, inside | 217.4px | **PASS** (78px spare) |
| 390 | 350×44 | 242.0, 1 line, inside | 228.2 | 217.4 | **PASS** |
| 1280 | 560×44 | 242.0, 1 line, inside | 228.2 | 217.4 | **PASS** |
All 9 strings fit on 1 line with the chip box = #goal box at all 7 sizes (959/960/960p/1024p as well). No wrap, so the 17:06 "drop to the short label" fallback is never reached at ≥360. The spec's ≈295px estimate was high: the measured worst is 242px.

## GE-17 add-on (PM Market) — #goal rect, pill and clear space
| Size | Mode | #goal x–x (w) | y–y (h) | Pill (`.goal-pill`) y, h, inset in #goal | Above: `#meter`.b → gap | Below: `#collect`.t → gap | ≥2 above / below | PM x range |
|---|---|---|---|---|---|---|---|---|
| 959×600 | phone | 12–923 (911) | 412–456 (44) | 414–454, **40**, 2 / 2 | 404 → **8** | 460 → **4** | PASS / PASS | (phone, full column) ✓ |
| 960×600 | docked-compact | **24–536 (512)** | 472–516 (44) | 472–516, **44**, 0 / 0 | 464 → **8** | 524 → **8** | PASS / PASS | **✗ PM 12–548 (536)** |
| 1280×800 | docked | 160–720 (560) | 672–716 (44) | 672–716, **44**, 0 / 0 | 664 → **8** | 724 → **8** | PASS / PASS | ✓ 160–720 |
| 1024×1366 | phone | 12–1012 (1000) | 1178–1222 (44) | 1180–1220, **40**, 2 / 2 | 1170 → **8** | 1226 → **4** | PASS / PASS | (phone) ✓ |
| (360×640) | phone | 8–328 (320) | 456–500 (44) | 458–498, 40, 2 / 2 | 448 → 8 | 504 → 4 | PASS / PASS | ✓ SS-16 |
| (390×844) | phone | 8–358 (350) | 660–704 (44) | 662–702, 40, 2 / 2 | 652 → 8 | 708 → 4 | PASS / PASS | |
| (960×1280) | phone | 12–948 (936) | 1092–1136 (44) | 1094–1134, 40, 2 / 2 | 1084 → 8 | 1140 → 4 | PASS / PASS | |
Nearest neighbours are the coop-fill `#meter` above and `#collect` below; nothing else is painted in between. M5.0 keeps Collect's top edge (layout-spec draft), so these gaps don't change with the 48px Collect.

## Findings
- **m1 Minor (spec text, GE-16):** `m4-timed-collectible.md` §2.1 defines **phone = "vw < 960"** and docked-compact as "landscape vw ≥ 960 …". A ≥960 **portrait** viewport (960×1280, 1024×1366) matches no key as written. `v11.py` `spots()` (line 6, `if vw<960`) would put it in docked-compact (6/6 docked-compact spots, wrong layout), but the CSS renders phone. Fix: change §2.1 phone to "not `(min-width:960px) and (orientation:landscape)`", mirror `styles.css:157/297` (and `v11.py`), and Engineering must derive the key from the same `matchMedia` query, not from vw. The 17:06 ruling already says this; it just isn't in the spec text yet.
- **m2 Minor (PM x range, GE-17):** at 960×600 `#goal` is **x 24–536 (512 wide)**, not PM's 12–548 (536). Cause: `.collectbar{max-width:min(560px, calc(100% − 24px));margin-inline:auto}` (`styles.css:300`) sits inside the farm column's 12px padding, so it's inset 12 + 12. Fix: amend sales-stopped-spec SS-16 to "960×600: x 24–536" (the chip = #goal rule already makes the build right; only the literal numbers are off). 1280 (160–720) matches.
- **n1 Nit:** at phone-mode tablets the chip would stretch to the full `#goal` width (911px at 959×600, 1000px at 1024×1366) with a 242px label. It still passes; consider left-aligned content or a max-width in a later polish pass.
- **n2 Nit / ambiguity:** the spec says Fredoka **600**, but only the 500 and 700 woff2 ship (`public/fonts`), so browsers use the 700 face for 600. The widths above are therefore the heavier worst case. Either ship 600 or say 700.
- Note: at docked sizes the pill is 44px (`--goal-h-lg`) with 0px inset, so the 2px hit-area extension of Head's 40px-pill ruling only exists at phone widths. The clear space is still ≥2 (8px) above and below.
