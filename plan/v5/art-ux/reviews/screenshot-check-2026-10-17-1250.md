# Screenshot spec check — 2026-10-17 12:50 (Europe/Belgrade)
Freeze rules: hold only on Blocker/Critical/Major; Minors/Nits logged, not held.

## Verdict: PASS (no Blocker/Critical/Major; nothing held; no new Minor/Nit)

## Checked
**PM4-P3 Collection card, QA corrected set (rev 2, 12:30)** — `qa/m3-recheck/p3-fix-462a071/corrected/`
- `dd52bfd/` = main "Merge #40" (contains 462a071), build label m3-rc1-pre+dd52bfd, manifest.json (full SHA, pushed, label checked, tab asserted in-probe). 32 PNGs: Firefox + WebKit × 360x800 / 375x800 / 375x700 / 390x844 × capped (F3/C19, $20) / normal (F3/C2, $1), card crop + full page.
- `462a071/` = PR #40 head, same matrix, own manifest. 32 PNGs.
- Opened: WK dd52bfd 375x700 capped full, FX dd52bfd 360x800 capped card, WK dd52bfd 390x844 capped card, FX dd52bfd 375x700 normal card; probe2 logs for all rows.

| Check | Result |
|---|---|
| Tab/state matches manifest | PASS — Collection tab active, "Collect per tap" card in every shot (closes 12:19 observation "Fx/WK full shots show Farm tab") |
| Copy | PASS — "Need $75.5K more", "Limited by coop · Upgrade Farm →", "Level 19 / 30", "Need $24.00 more" |
| Overlap / fit | PASS — Need (y504–520) and Limited (y528–544) stacked, Limited position:static, inside card, 0 intersections, sw==cw at all widths, both engines |
| Number format | PASS — $75.6K / $75.5K / $3.77 → $3.91 |
| Locked/unaffordable state | PASS — muted price button + Need line clear |
| Tap targets | Buy 224/239/254×48 PASS. "Upgrade Farm →" link 93×16 — already-logged Minor M-P3-1, unchanged on main, not held |
| Contrast | No token change vs 12:19 PASS set |

Not covered (still expected in the final RC set): 1280 docked, Chromium re-measure with tab assertion (original Chromium card crops were genuine Collection shots).

## Seen, out of scope / rejected
- `qa/m3-recheck/pr37-85e5bb1/shots/html-open-chromium.png` (1): #37 QA HTML-open smoke, no manifest, #37 dropped from rc; not a UI evidence set.
- `p3-fix-462a071/*-farmtab.png` + `before-af5e3ab/` relabeled as Farm tab (renames only, already seen 12:19).

## Still waiting on
Final RC 3-engine set on main dd52bfd (or HoE's RC SHA) with manifest incl. 1280 docked; worker-asleep display (only if merged); #12 only if UI changes.
