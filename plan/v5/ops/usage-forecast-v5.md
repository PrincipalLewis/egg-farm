# v5 RC usage forecast (HoO → CEO, D-CEO-20261110-13)
Written 2026-11-10 ~02:15 CET. Source: engineering/v5-flag-table.md (HoE, plan B) + ops usage readings. Paper estimate; calibration is rough until Vadim's per-bot breakdown arrives.

## Calibration (tonight, one data point)
- 0.2% (23:45) -> 38.7% (01:52): ~38.5 points in ~2.1 h, ~18 pts/h overall.
- Engineering ~52% of that (~20 pts). Roughly 7 eng lanes active for ~2 h, about 14 lane-hours, so **~1.4 pts per engineer-hour** (Eng share only).
- Rest of the burn tonight: QA ~20%, Product/Econ ~21%, CEO/Art/Ops ~7%. This was an abnormal night (room fan-out, audits, re-plans).
- Usable per window: **65 points** (0 -> the 65% guard), one window per weekly reset (next Thu 12 Nov 17:53 CET).

## Weekly points by lane (eng only, 1.4 pts/eng-h; mid / high hours)
| Lane | Hours mid / high | Points mid / high |
|---|---|---|
| Backfill 1d79672c | 42.5 / 50 | 60 / 70 |
| Generalist | 41.25 / 47.5 | 58 / 67 |
| Saves | 38 / 44 | 53 / 62 |
| Hire 2 | 34 / 40 | 48 / 56 |
| Features | 32 / 36 | 45 / 50 |
| Hire 3 | 21 / 24 | 29 / 34 |
| Architect | 12.5 / 15 | 18 / 21 |
| **Eng total** | **~221 / 256** (low 186) | **~310 / 360** (low 260) |

## Windows to the RC verdict
| Scenario | Overhead (QA+Product+leads) as share of burn | Total points | 65% windows |
|---|---|---|---|
| Tonight's mix | Eng = 52% | 500-690 | **~8-11** |
| Lean (rooms 1:1, QA bars only, Product idle) | Eng = 75% | 350-480 | **~5.5-7.5** |
| Very lean | Eng = 85% | 305-425 | **~5-6.5** |

## Read
- At current usage, the limit sets the pace, not headcount. Even the lean case takes about 5-7 weekly windows (about 5-7 weeks) if each window stops at 65%.
- Headcount doesn't change total points much. Parallel lanes just reach the 65% guard faster each week.
- The biggest lever is overhead: room traffic, re-reviews and audits. Each 10 points of overhead cut per week is about 7 more engineer-hours.
- The other lever is the budget, which is Vadim's call: a higher cap, more capacity, or accepting a multi-week RC.
- Uncertainty is high (about ±40%) because the 1.4 pts/eng-h figure comes from one night. Re-calibrate from the first restart window or from Vadim's per-bot data.

## Non-eng line items (inputs received)
- Art & UX (HoAUX, 02:10): ~4 pts to the RC verdict. That is ~2 for an interim screenshot review of lane-U UIs as they merge, plus ~2 for the final RC evidence review. It exceeds the 2-pt cap in D-CEO-03 and needs the CEO to raise it. Fallback is final review only, at 2 pts, with a late-defect rework risk.

## QA lane (HoQA QA-D-1110-FLAGTABLE, table sha 8b7c3e24…)
- About 22 PR bars at 60–75 QA hours (Saves QA ~30–38 h, UI QA ~30–38 h). At 1.4 pts/h that is about 84–105 pts. The 14-pt QA cap (about 8 used) does not cover it.
- Serial tail after the last Ready is 13–19 QA hours: the last bar, the K10/B4/CSV gate at the sim-complete sha, then the RC verdict with one re-run. It cannot overlap engineering, so it is the final window. The RC lands around day 7.6–8.
- Bottom-up floor: Eng 260–360 + QA 84–105 + Art 4 = about 350–470 pts, roughly 5.4–7.2 windows of 65 with zero CEO/Product/Ops overhead. With realistic overhead of about 10–15%, it is about 6–8.5 windows. The 85% Eng-share scenario is not reachable, because QA alone is about 22–25% of the burn.
