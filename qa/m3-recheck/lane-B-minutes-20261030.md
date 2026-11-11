# Lane B (Chromium + WebKit) minutes for the final gate: re-count of the v2 additions - UI QA group A, 2026-10-30 (rev 2, 15:1x CET)
TASK uiqa/M5-groupA. rev 2 (HoQ 14:58 item 4): **#7 abilities and #5b sales-stopped re-counted**, every assumption updated with the measured figures of `qa/m3-recheck/meas-20261030/RESULTS.md` (sha256 `3908dc28…`, record-only run 14:43–14:56 CET). rev 1 (14:24 CET, HoQ 14:19 (2)) counted #9 and #12 only; its text is superseded where this file says so.
Inputs (read-only, nothing in HoQ's files was edited): `qa/v5-final-gate-estimate.md` now **v3** sha256 `b0feef988c7b7b7ea501295df60b1fca692afcfe7dda817c16050ba4d448b200` (rev 1 read v2 `05891340…`); `qa/m5/test-plan-abilities.md` v0.10.2 sha256 `ef94f478…` §2a Q-AB-N1…N19; `qa/m5/test-plan-sales-stopped.md` v0.14.1 sha256 `99654090…` SS-17/17b, SS-23f, SS-37…SS-49, SS-RATE, SS-TEL. Arithmetic: `qa/m3-recheck/recount-7-5b-20261030.py` (pure; writes `recount-7-5b-20261030.table.md`).

## Headline
| | HoQA v3 (Cr / WK min) | UI QA re-count rev 2 (Cr / WK min) | basis |
|---|---|---|---|
| #7 abilities | 27 / 32.4 | **17.0 / 28.0** (Cr high 22.3) | bottom-up per Q-AB row; 72 % of Cr is runFor (N9, N11, N13, N17, N18), so WK is 1.64× here, not 1.2× |
| #5b salesStopped | 30 / 36.0 | **6.7 / 8.6** (Cr high 13.4) | bottom-up per SS row; cell-type (runFor 1.3 min) |
| #9 BBv2 runs (BB-N8 + NEW zg-on/zg-on-bb0 snapshots) | 0.4 / – | **1.5 / 1.7** (high 3.1) | +1.1 Cr min for the HoQ 14:58 same-build ZG-AC12 and Card #9 P3 snapshots (assumption A9) |
| #12 BBv2 (B1–B5) | 5.8 / – | **3.9 / 6.5** (high 5.2) | measured runFor (B1(b) 2 × 80.6 s Cr / 148.3 s WK); dead zone is frame 0 (HoQ 14:20), no 10 s runFor |
| **All v2 additions** | **63.1 / 77.6 = 140.7 min (2.35 h)** | **29.1 / 44.7 = 73.8 min ≈ 1.23 h** (high ≈ 43.9 / ≈ 62.5 = 106 min ≈ 1.77 h) | |
| **Lane B total** (v3 16.10 h, other v3 lines unchanged) | 16.10 h | **≈ 14.98 h** (−1.12 h); high ≈ 15.52 h (−0.58 h) | |

The BBV2-UI1 45 shots stay counted as PLANNED time (Chromium share 15 shots in #12 B5); they are BLOCKED-BUILD on rc/v5 `65a7443`. Q-AB-N7/N8 (BLOCKED-ON-BUILD #86) are counted as planned too.

## Measured rates (rev 2; record-only run `meas-20261030/ev-20261030-144325`, SHA256SUMS `bb9ff2aa…`)
| id | Chromium | WebKit | WK/Cr | source |
|---|---|---|---|---|
| cell = load + shot + check + axe (UI1 proxy, median of 9) | **0.730 s** | **0.878 s** | **1.20×** | RESULTS.md "UI1 PROXY per cell" |
| axe per scan (+ inject) | 0.077 s (+0.095) | 0.112 s (+0.068) | 1.45× | RESULTS.md |
| `runFor(240000)` wall | **80.6 s** (0.336 s per sim s) | **148.3 s** (0.618 s per sim s) | **1.84×** | RESULTS.md (single; chunked 48×5000 + 2000 = 80.6 / 146.3 s) |
| browser launch / close | 152–208 / 35–48 ms | 59–97 / 5–9 ms | – | RESULTS.md (launch is not the cost) |
| r_inv probe invocation (launch + server + 1 load) | 2 s | 2 s (assumed equal) | – | rev 1, `dryrun-m5-pause-c8c5d0c/steps.tsv` |
| CELL_HIGH (old rate with DOM/rect checks) | 1.98 s | ×1.2 | – | rev 1 r_load 1.9 s (`dryrun-m5-streak-c8c5d0c`) + measured axe; used only for the "high" column |

## Assumptions (rev 2: A1/A2 replaced by measurements; flagged where still assumed)
- ~~A1 runFor 60 s per call~~ **MEASURED:** 80.6 s Cr / 148.3 s WK per 240 s sim (0.336 / 0.618 s per sim s). Every sim-time wait in #7/#5b is charged at that rate.
- ~~A2 axe 1.5 s~~ **MEASURED:** 0.08 s Cr / 0.11 s WK per scan (+0.07–0.10 s inject), inside the 0.73 / 0.88 s cell.
- A3 ★-move layout-shift check = one extra cell per UI1 shot (0.73 s). ASSUMED.
- ~~A4 dead zone via 10 s runFor~~ **superseded** (HoQ 14:20: dead zone = FX-L17 $3,000 at frame 0). The L17-3000 row runs to the first Hens star (Econ probe t = 10.1 s sim).
- A5 B1–B4 at 390×844 only on Chromium. ASSUMED (unchanged).
- A6 BB-N8 inside the existing zg-on loads. ASSUMED (unchanged).
- A7 B4 = 26 loads; R11 tests are vitest. ASSUMED (unchanged).
- **A8 (new)** in-page state step (`ability.set`, resize, a tap with no reload) = 0.1 s. Used only for Q-AB-N4's 480 steps (0.8 min). ASSUMED.
- **A9 (new)** zg flagoff snapshot section on zg-on and zg-on-bb0 ≈ 12 fixtures × 3 sizes × (1 load + 2 tab opens) per variant. ASSUMED (fixture count comes from zg-unit precheck at the RC).
- **A10 (new)** per-row counts for #7/#5b are read off the plan rows (states × sizes × inputs, sim waits from the stated timings: 30 s call, 45 s combo, 10 s window, 5 s show hold, 2 s clear hold, SS-40c idle 10 + 60 s). Where a row gives no size list, 3 sizes; where it gives no state count, the count in the table. These are the main source of error; the "high" column uses the old 1.98 s cell to bound it.
- WK factor: **MEASURED** 1.20× per cell and 1.84× on runFor (rev 1's 2.3× was a launch-dominated lane-run hold and is withdrawn; v3 never applied it). Applied per row here, so a runFor-heavy card (#7) gets 1.64× overall.
- Contention: one run at load ≈ 5.9 (WK) / < 12 checked (Cr); gate-day load ≥ 12 pauses are in no figure.

## Line-by-line (rev 2; minutes; Cr = cells × 0.730 + steps × 0.1 + sim × 0.336 + real + inv × 2, WK = cells × 0.878 + steps × 0.1 + sim × 0.618 + real + inv × 2)

### #7 abilities (HoQA v2/v3: +27 Cr min)
| row | cells | in-page steps | sim s (runFor) | real s | probe inv | Cr min | WK min |
|---|---|---|---|---|---|---|---|
| Q-AB-N1..N3 names/aria-label/DOM order (4 calls x ~8 states + 3 Activate-all, x 3 sizes) | 99 | 0 | 12 | 0 | 3 | 1.37 | 1.67 |
| Q-AB-N4 fit set 0:30..0:01 (30 values x 4 roles x 4 configs) | 4 | 480 | 0 | 0 | 2 | 0.92 | 0.93 |
| Q-AB-N5 disabled Activate-all (2 states x 3 widths, 1 s tick) | 6 | 0 | 3 | 0 | 1 | 0.12 | 0.15 |
| Q-AB-N6 only timer (t 0/15/29 x 3 widths) | 9 | 0 | 87 | 0 | 1 | 0.63 | 1.06 |
| Q-AB-N7 Shift sheet = menu (20 s x 3 widths; BLOCKED-ON-BUILD #86, planned) | 3 | 0 | 60 | 0 | 1 | 0.41 | 0.70 |
| Q-AB-N8 Shift sheet closing (3 widths) | 3 | 0 | 0 | 0 | 0 | 0.04 | 0.04 |
| Q-AB-N9 Boost flag gate (4 configs x 3 widths; 30 s call in (1,0)/(0,1)) | 12 | 0 | 180 | 0 | 4 | 1.29 | 2.16 |
| Q-AB-N10 Boost event + auto-close | 3 | 0 | 3 | 0 | 1 | 0.09 | 0.11 |
| Q-AB-N11 combo paths (~5 paths x 3 widths, 45 s boost) | 15 | 0 | 675 | 0 | 1 | 3.99 | 7.21 |
| Q-AB-N12 Boost name + focus (8 states x 3 widths) | 24 | 0 | 0 | 0 | 1 | 0.33 | 0.38 |
| Q-AB-N13 combo boundary 9900/10000/10001/10050 ms x 3 widths (window + 30/45 s) | 12 | 0 | 660 | 0 | 1 | 3.87 | 7.01 |
| Q-AB-N14 resting Paused slot | 6 | 0 | 30 | 0 | 1 | 0.27 | 0.43 |
| Q-AB-N15 combo-eligible name + expiry | 6 | 0 | 30 | 0 | 1 | 0.27 | 0.43 |
| Q-AB-N16 one sheetclosecomplete per close (5 sizes x 4 close kinds, 0.5 s animation) | 20 | 0 | 0 | 10 | 1 | 0.44 | 0.49 |
| Q-AB-N17 auto refill no combo (3 deltas + control) | 4 | 0 | 150 | 0 | 1 | 0.92 | 1.64 |
| Q-AB-N18 card call after manual refill (2 deltas + control, 2 widths) | 8 | 0 | 300 | 0 | 1 | 1.81 | 3.24 |
| Q-AB-N19 AB-UI-15 row layout (3 widths x ~6 chip states) | 18 | 0 | 0 | 0 | 1 | 0.25 | 0.30 |
| **#7 abilities total** | | | | | | **17.0** (high 22.3) | **27.9** |

runFor share of the Cr total: 12.3 min (72 %). WK/Cr on this card: 1.64x.

### #5b salesStopped (HoQA v2/v3: +30 Cr min)
| row | cells | in-page steps | sim s (runFor) | real s | probe inv | Cr min | WK min |
|---|---|---|---|---|---|---|---|
| SS-37 golden-egg reach (6 vps x popover open/closed x flag on/off) | 24 | 0 | 0 | 0 | 2 | 0.36 | 0.42 |
| SS-38a threshold DOM (6 heights x shown/hidden; 5 s hold) | 12 | 0 | 30 | 0 | 1 | 0.35 | 0.52 |
| SS-38b breakpoint constant / rAF / rotate | 6 | 0 | 0 | 0 | 1 | 0.11 | 0.12 |
| SS-38c resize mid-cue (4 legs x open-chip/open-Manage/closed) | 12 | 0 | 0 | 18 | 1 | 0.48 | 0.51 |
| SS-38e viewport_h bucket (6 fresh sessions) | 6 | 0 | 0 | 0 | 1 | 0.11 | 0.12 |
| SS-38f wide height-only (4 vps x popover closed/open + flag-off spots) | 12 | 0 | 0 | 0 | 1 | 0.18 | 0.21 |
| SS-39 / SS-39a icon-only state + chip name | 12 | 0 | 0 | 0 | 1 | 0.18 | 0.21 |
| SS-40a popover open (2 vps x 4 inputs) | 8 | 0 | 0 | 0 | 1 | 0.13 | 0.15 |
| SS-40c dismissal (6 paths; idle 10 + 60 s fake clock, 10 s real) | 6 | 0 | 72 | 10 | 1 | 0.68 | 1.03 |
| SS-40p1..p3 pass-through (golden x3 spots x2 inputs + control; buy; Sell all) | 20 | 0 | 0 | 0 | 3 | 0.34 | 0.39 |
| SS-40d / SS-40e Manage + reduced motion | 4 | 0 | 0 | 0 | 1 | 0.08 | 0.09 |
| SS-41 top bar (2 vps x shown/hidden) | 4 | 0 | 0 | 0 | 1 | 0.08 | 0.09 |
| SS-42 / SS-42r variant taps (21 taps) + tap after resize (4 legs) | 25 | 0 | 0 | 4 | 2 | 0.44 | 0.50 |
| SS-RATE / SS-TEL (6 fixtures; Rule 2 show/clear at 2 vps) | 8 | 0 | 14 | 0 | 2 | 0.24 | 0.33 |
| SS-23f (a)(b)(c) slot rects (2 builds x 6 vps; 5 vps x 6 states; 3 vps x 6 states + flag-off) | 78 | 0 | 80 | 0 | 4 | 1.53 | 2.10 |
| SS-17 extra shots (9 labels x 7 vps) + SS-17b (4 vps x 2) | 71 | 0 | 0 | 0 | 2 | 0.93 | 1.11 |
| SS-47 / SS-48 / SS-49 stall-during-cue, Manage target, once per episode | 13 | 0 | 42 | 0 | 3 | 0.49 | 0.72 |
| **#5b salesStopped total** | | | | | | **6.7** (high 13.4) | **8.6** |

runFor share of the Cr total: 1.3 min (20 %). WK/Cr on this card: 1.29x.

### #9 BBv2 runs (HoQA v2/v3: +3 Cr min)
| row | cells | in-page steps | sim s (runFor) | real s | probe inv | Cr min | WK min |
|---|---|---|---|---|---|---|---|
| #9 BB-N8 BBv2 rows at 2 zero-gain states x 3 sizes (inside zg-on loads) | 6 | 0 | 0 | 0 | 3 | 0.17 | 0.19 |
| #9 NEW HoQ 14:58: flagoff snapshots on zg-on + zg-on-bb0 (A9: ~12 fixtures x 3 sizes x 2 variants, 2 tabs each) | 72 | 144 | 0 | 0 | 6 | 1.32 | 1.49 |
| **#9 BBv2 runs total** | | | | | | **1.5** (high 3.1) | **1.7** |

runFor share of the Cr total: 0.0 min (0 %). WK/Cr on this card: 1.13x.

### #12 BBv2 (HoQA v2/v3: +18 Cr min)
| row | cells | in-page steps | sim s (runFor) | real s | probe inv | Cr min | WK min |
|---|---|---|---|---|---|---|---|
| #12 BB-B1 (a) $37,300 first frame | 1 | 0 | 0 | 0 | 1 | 0.05 | 0.05 |
| #12 BB-B1 (b) $3,000 runFor(240000), RC dist + build:qa | 2 | 0 | 480 | 0 | 2 | 2.78 | 5.04 |
| #12 BB-B2 FX-TIE | 1 | 0 | 0 | 0 | 1 | 0.05 | 0.05 |
| #12 BB-B3 dead zone (frame 0, HoQ 14:20: no runFor) | 1 | 0 | 0 | 0 | 1 | 0.05 | 0.05 |
| #12 BB-B4 B1-10 / F4-19 re-runs flag-on | 26 | 0 | 0 | 0 | 1 | 0.35 | 0.41 |
| #12 BB-B5 BBV2-UI1 Cr share 15 shots (+1 star-move state each; L17-3000 Hens star at sim 10.1 s x 3 sizes) | 30 | 0 | 30 | 0 | 3 | 0.63 | 0.85 |
| **#12 BBv2 total** | | | | | | **3.9** (high 5.2) | **6.4** |

runFor share of the Cr total: 2.9 min (73 %). WK/Cr on this card: 1.65x.

**All v2 additions (#7 + #5b + #9 + #12): Cr 29.1 min (high 43.9), WK 44.7 min, lane B Cr+WK 73.8 min = 1.23 h** (HoQA v3: Cr 63.1 + WK 77.6 = 140.7 min).

## Open
- **zg-on-bb0** (HoQ 14:58 item 3) is now in the harness as a comparison build (zeroGainUi = 1, bestBuyV2 = 0); its lane cost is in #9 above (snapshots only). Its build time is outside lane B (variant builds precede the lanes).
- **ZG-AC12** (HoQ 14:58 item 2): graded zg-on vs zg-off on the same build; the base comparison is recorded and routed to Card #12. No lane-time change (the base leg already ran).
- **#7/#5b** figures are bottom-up from the plan rows, not measured on their probes (BLOCKED-ON-BUILD / not built). The proxy cell is a farm-screen load; rows with CDP full-tree reads or many rects (Q-AB-N1–N3, SS-37, SS-23f) may sit nearer the high column.
- rev 1's "WK factor 2.3×" open point is closed by the measurement (1.20× / 1.84×).
