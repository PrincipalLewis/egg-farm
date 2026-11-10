# F1 mid-game stall: before/after (Economy, 2026-10-16)
Triage F1 (`playtest/triage/2026-10-15-session1.md`): from Farm L5, orders of 50–140 eggs against <10 eggs held, 1–2 min wait per Farm level.
**Before** = M1-R1 (`economy.pre-p1q.csv`, sim `proposal`, no P4). **After** = P1q+P3+P4 (`economy.csv`, sim `current`, P4 Manage ≤40%).
Method: `product/sim/m2_validation/f1_stall.py` runs `run_m2` (120 min, managed, workers W1–W4 on, same as `pt1_resim.py`), 30 seeds × 3 models. `run_m2` is instrumented at load time and its behaviour is unchanged. Raw output: `f1_stall_out.md`. "Held" = eggs in the basket at each Sell. Order outcomes are grouped by the Farm level the order spawned at.

## seller15 (the triage player's pattern), medians, B = before / A = after
| F | order | held@sale | fill/partial/lost % B | fill/partial/lost % A | s per level | × prev | $/s |
|---|---|---|---|---|---|---|---|
| 5 | 58/30 | 6/6 | 86/2/13 | 84/12/4 | 45/45 | — | 13.19/13.19 |
| 8 | 80/38 | 9/8 | 80/1/19 | 77/9/14 | 90/90 | 2.00 | 25.39/25.39 |
| 10 | 98/49 | 10/10 | 53/32/15 | 43/39/18 | 60/60 | 0.80 | 35.75/35.75 |
| 12 | 106/54 | 13/13 | 53/18/29 | 53/19/28 | 105/105 | 1.17 | 48.19/49.51 |
| 14 | 109/55 | 14/14 | 62/6/32 | 62/8/30 | 150/150 | 1.67 | 63.91/63.91 |
| 16 | 111/55 | 16/16 | 66/1/33 | 62/6/32 | 150/150 | 0.83 | 81.36/81.39 |
| 18 | 112/58 | 18/17 | 68/0/32 | 65/1/34 | 255/255 | 0.94 | 130.25/130.28 |
| 20 | 112/58 | 21/21 | 68/1/31 | 66/1/33 | 225/225 | 0.75 | 250.87/250.87 |
All 16 levels, plus the casual and cheapest models, are in `f1_stall_out.md`. Casual (Poisson arrivals, demand ×0.75, Sell every 20 s): orders go from 41–84 to 21–43, filled 90–100% both before and after.

## Conclusion
- **The order-size gap is about halved, not gone.** Median orders at F5–20 drop from 58–115 to 30–59 eggs (seller15/cheapest). A tapping player still holds only 6–21 eggs per Sell, so most orders still fill over several Sells. Fully filled orders don't go up: about 43–85% after vs 53–86% before. More orders end partially paid instead of lost, e.g. F5 lost 13%→4%, partial 2%→12%.
- **Time per level and income don't change.** In every model, median s/level and $/s are within 2% before and after at every level. Progress is limited by egg supply × price, and P1q only reshapes the orders. The 1–2 min per level from F5–13 (45–105 s) remains, rising to 150–300 s by F14–20. That is the pacing curve AC7 signed off, not something P1q introduced.
- **Is any level >2× the previous level's time?** Not for seller15: the worst jump is F8 at 2.00× (45→90 s), exactly 2×. Not for casual: the max is 1.75×. Cheapest-first does go over 2×, both before and after: F7 2.50×, F10 2.33×, F15 2.33×, F18 2.18×. These come from the alternating Collection/Farm buys, since the previous level is short (30–90 s).
- If F1 means the wait itself, the lever is supply or farm cost (eggs/s, F5–14 farm_cost), not orders. That is a separate proposal and needs a PM Farm Upgrades check.
