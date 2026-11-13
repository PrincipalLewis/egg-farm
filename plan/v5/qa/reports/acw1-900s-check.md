# QA: pacing-acw1 "F10 at exactly 900 s" check. PR #44 @ 4ccb9fd and rc/m4-t3-l30plus @ 2275c54
Run 2026-10-19 03:52-04:05 CEST, M4 on, the casual model exactly as in tests/pacing-acw1.test.ts (poisson_arrivals, demand x0.75, runM2 seller15, sellEvery 20, managed, all workers). Script: reports/acw1-900s-check.script.ts.
rc/m4-t3-l30plus @ 2275c54 contains c27fdfb, uses the same CSV (b48be8a4) and maxLevel 30, and has byte-identical tests/bot-m2.ts and pacing-acw1.test.ts. Its results are identical to #44 on every number below.

## Answers
1. **Cap:** no. runM2 runs T = 7200 s (default, `o.T ?? 7200`). The sim has no 900 s cap. With T = 1200 s every seed's F10 time is unchanged, so the run horizon doesn't matter.
2. **Cadence:** no variance bot is passed, so check-ins sit on a fixed grid: `sellT = sellEvery` then `+= 20` (bot-m2.ts), at t = 20, 40, …, 880, 900, 920. Every F10 time is a multiple of 20 (0 off-grid). 900 = 45 × 20, so a check-in lands exactly on 900. The tick is 10 Hz and t is rounded to 0.1.
3. **Comparison:** the test uses `t <= 900` (pacing-acw1.test.ts:19). The bot buys when `t >= sellT` and `coinsCents >= cost` (inclusive), and records reach at the check-in time. So a seed that first affords F10 between 880 and 900 buys at the 900 check-in and counts as a pass.
4. **Real?** Yes. Extended to 1200 s, the same seeds reach F10 at exactly 900.0 s. These are genuine buys at the 900 s check-in, not an artefact. The pass/fail line is, however, sensitive to the 20 s check-in grid.
5. **Shares** (F10 within 15 min: `<=900` / strict `<900` / within 16 min `<=960`):
| seeds | <=900 (test) | <900 | exactly 900 | <=960 |
|---|---|---|---|---|
| 0-99 (repo test) | 91% | 85% | 6 | 97% |
| 1-200 | 182/200 = 91.0% | 166/200 = 83.0% | 16 | 196/200 = 98.0% |
| 201-299 | 90/99 = 90.9% | 83/99 = 83.8% | 7 | 96/99 = 97.0% |
Seeds at 900 (1-200): 21, 41, 42, 50, 61, 98, 105, 117, 125, 135, 144, 148, 151, 152, 182, 198. Seeds at 900 (201-299): 203, 222, 228, 232, 263, 290, 293.
**Discrepancy:** I count 16 seeds at exactly 900 on seeds 1-200, not 23. 23 is the total across 1-200 and 201-299 (16 + 7).
F10 times around the line (1-200): 840: 20, 860: 13, 880: 15, 900: 16, 920: 8, 940: 4, 960: 2, 980: 2.
6. **Median F18:** 25.0 min on 0-99, 1-200 and 201-299 (gate <= 40: PASS; Python reference 21.33, +17%). Median F10 is 13.67 min (1-200) and 14.0 (201-299).

## Bottom line
The 900 s hits are real and are passes under the test's `<=`. With them counted, the share within 15 min is 91% on both seed sets, which fails the 95% gate. Strict `<` gives 83-84%, and within 16 min gives 97-98%, which would pass 95%. Branch rc/m4-t3-l30plus is identical.
