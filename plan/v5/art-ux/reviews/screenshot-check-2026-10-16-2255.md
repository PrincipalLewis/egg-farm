# UI screenshot spec check · 2026-10-16 22:55 · UI/Visual Designer
Routine run. New screenshots since the 22:31 run (log: reviews/screenshot-check-log.md).
Build: **7d52952** (fix/rc1-qa-bugs-v4), WebKit extras pass (qa/m3-recheck/rc1-qa-bugs-v4-7d52952/extra-webkit.log, summary.txt 22:51 "extra webkit exit=0 NO FAILS").

## Verdict: PASS (nothing fails against my specs). No coverage change for M4-A, B-1, B-3, 'Limited by collecting', v1.6.1.
| # | Item | Spec | Result |
|---|---|---|---|
| 1 | B-1 Coop full @7d52952, WebKit 360 + 1280 | b1-coop-full-copy.md §1–§5 | **NOT IN BUILD** (b1BuildPresent:false), same as Chromium/Firefox; badge fit passes |
| 2 | M-1 `Sell 181.2B` button label, WebKit 360/375/390/430/1280 | m3-customer-queue-spec.md | PASS |
| 3 | TUT-1 card tap highlight, WebKit docked 1024×474 / 1280×720 / 1366×768 | m3-customer-queue-spec.md | PASS |
| 4 | B-4 release perf overlay absent, WebKit | (QA functional) | PASS, out of my spec scope |

## 1. B-1 Coop full @7d52952 WebKit: not in build
Evidence: webkit-b1-coopfull-{360,1280}.png, webkit-b1-badge-{360,1280}.png, extra-webkit.log lines "B-1 live-rect" / "b1 360" / "b1 1280".
- Badge reads `Full!` (39.7px), no ⚠, aria null, no rate chip, no hint. Spec wants `⚠ Full!`, aria "Coop full", rate aria ending "Coop full.", one hint, badge ~54px (b1-coop-full-copy.md:57 checklist). Not a fail: the B-1 build isn't on this branch.
- At 360 the badge sits in the sky to the right of the roof peak (badge l257 t250 r297 b270 inside coop box l8 t235 r352 b493), clear of the roof, no overlap in 8 samples ✔. 1280 same ✔.
- Still need PM Workers' B-1 SHA for the 360 hint-vs-roof clearance and the aria suffix wording (`$12.3 thousand`).

## 2. M-1 `Sell 181.2B` @7d52952 WebKit: PASS
Evidence: webkit-m1-181B-{360,375,390,430,1280}.png.
- Two-line button `Sell 181.2B` / `+$1T`, label 65px inside a 68px content box (padding 10/10, button 88px) at every width ✔. Compact suffix numbers (181.2B, $1T) per layout-spec.md:65 ✔. Row text `0/181.2B eggs · $1T` on one line at 360 ✔. Matches the Firefox render from the 21:45 run.

## 3. TUT-1 card tap @7d52952 WebKit docked: PASS
Evidence: webkit-tut1-cardtap-{1024x474,1280x720,1366x768}.png.
- Tapping a customer card outlines the matching order row (blue focus-style outline on `0/3 eggs · $7.68`), clears after ~1.2s, sheet stays closed ✔. Docked Market/Upgrades panel fits at 1024×474 with no clipping of the order row or `Sell all (8 eggs · $20.48)` ✔. Sell button ~88×44 ✔.

## Out of scope / no review needed
- webkit-b4-release-perf.png: release build has no perf overlay (QA functional check).
- qa/scratch/pr1-96c4a1e/docs/readme/*.png (4): md5-identical to pr1-cf66ce5 README copies.

## Still waiting on
M4-A sign-off captures (locked `Needs Farm L{n}` row + aria, MAX row, `Balanced farm 5/5 · +30%` + toasts, Farm tab at 360 and 1280 docked, strip text-alternative DOM dump); B-1 Coop full SHA (PM Workers); B-3 compact Farm card SHA (UI engineer); 'Limited by collecting' overlap fix (rc2-notes-b2-b3.md); v1.6.1 goal label (rc1-upgrade-value.md v1.6.1 §4).
