# Late Farm curve: handoff to PM Workers (M2) · v2 (M1-R1) · 2026-10-15 · PM, Farm Upgrades
Head of Product: farm costs stay ×1.35 in M1; Workers in M2 carry the late game. Data: `farm_stress_sim.py` v3 (reads economy.csv M1-R1), seller15 player (tap 1/s, Sell all every 15 s, AC7 buy rule), 50 seeds × 6 h, medians (`sim_results_v3.txt`). v1 version of this note (demand-bound economy, L30 ≈206 min) is superseded.

## Cause
Farm cost floor(100×1.35^F) grows ×1.35 per level. Income ≈ eggs sold/s × price, with price = (1+0.05F)(1+0.12C). Production grows only +5 hens per level (+~5% at F20, +~3% at F30), farm price grows +~2–3%, and Collection adds +12 points of bonus per level, but its cost grows ×1.6, so it slows too. Net income growth is about ×1.08–1.12 per Farm level, against ×1.35 cost growth.
**M1-R1 is production-limited, not demand-limited:** demand ≈ 1.2× the Farm's own production, and about 17% of customers are already lost to a full queue. Implications for Workers:
- Auto-collect alone does not speed up active players (tap rate barely matters: 0.25 taps/s costs +0.2 min to L10). It helps absent or idle players.
- Workers that add **eggs** only pay off up to the ~20% spare demand. Above that, the extra eggs pile up in the basket unless Workers also add **demand or sell-through** (more customers, a larger queue, a seller who serves full-queue arrivals).
- Workers that add **price or direct income** scale cleanly.

## Per-level time and income needed for a step of 180 s or less (seller15, M1-R1)
Steps alternate because Collection buys fall between Farm buys. Use the 2-level averages for planning.
| To F | Step (s) | Farm cost | Implied income $/s | Needed $/s | × current | 2-level avg × |
|---|---|---|---|---|---|---|
| 15 | 150 | 6,678 | 44.5 | 37.1 | 0.83 | — |
| 16 | 180 | 9,015 | 50.1 | 50.1 | 1.00 | 0.92 |
| 17 | 150 | 12,171 | 81.1 | 67.6 | 0.83 | — |
| 18 | 255 | 16,431 | 64.4 | 91.3 | 1.42 | 1.13 |
| 19 | 225 | 22,182 | 98.6 | 123.2 | 1.25 | — |
| 20 | 375 | 29,946 | 79.9 | 166.4 | 2.08 | 1.67 |
| 21 | 465 | 40,427 | 86.9 | 224.6 | 2.58 | — |
| 22 | 390 | 54,576 | 139.9 | 303.2 | 2.17 | 2.38 |
| 23 | 690 | 73,678 | 106.8 | 409.3 | 3.83 | — |
| 24 | 885 | 99,466 | 112.4 | 552.6 | 4.92 | 4.38 |
| 25 | 735 | 134,279 | 182.7 | 746.0 | 4.08 | — |
| 26 | 1,305 | 181,277 | 138.9 | 1,007.1 | 7.25 | 5.67 |
| 27 | 1,695 | 244,724 | 144.4 | 1,359.6 | 9.42 | — |
| 28 | 1,425 | 330,378 | 231.8 | 1,835.4 | 7.92 | 8.67 |
| 29 | 2,550 | 446,010 | 174.9 | 2,477.8 | 14.17 | — |
| 30 | 2,250 | 602,114 | 267.6 | 3,345.1 | 12.50 | 13.3 |
"Implied income" = Farm cost / step, so it is only Farm spending (Collection spend is excluded), and the multipliers are a slight under-estimate. Cumulative (p50): F10 10.0 min, F18 28.0, F20 38.0, F25 90.8, F30 ≈244.5 min (≈4.1 h).

## Implications
- Steps go over 3 min from F17→18. Keeping all steps ≤ 3 min needs Workers income of about ×1.1 at F18, ×1.7 at F20, ×2.4 at F22, ×4.4 at F24, ×5.7 at F26, ×8.7 at F28 and ×13 at F30. That's about ×1.25 compounding per Farm level, so it has to scale with Farm level (worker slots or tiers unlocked by Farm level). A flat bonus cannot do it.
- Suggested M2 target: Workers ×2 by F21 and ×4 by F24–25, which gives steps of about 3 min to F25 and about 5–10 min for F26–30.
- Compared with the v1 note: the scale of the multipliers is the same (×1.1 → ×13). The curve starts slightly earlier (×1.7 vs ×1.6 at F20) and is noisier. The main change is the lever: M1-R1 is production-limited, so a Workers boost needs matching demand or sell-through. In v1 the lever was demand alone.
