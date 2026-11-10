# P1q, Farm Upgrades review · 2026-10-15 23:55 (UTC+2) · PM, Farm Upgrades
Input: product/playtest1-resim.md. P1q = demand [ceil(0.4k), ceil(0.8k)] (k on the base interval), customer_interval_s ×0.5 (floor 1.5 s), queue_max = min(10, 6 + floor(F/5)). P3/P4 not applied here.
Method: `economy_p1q.csv` is a copy of economy.csv with those three columns changed. It reproduces the Designer's per-level table, with L0 demand 4–8 because P3 is not applied. Canonical files are untouched. `ECON_CSV=economy_p1q.csv python3 farm_stress_sim.py --seeds 200 --long-seeds 50` → `sim_results_p1q.txt`. Hint accuracy: `hint_check.py` → `hint_check_m1r1.txt` / `hint_check_p1q.txt`.

## Times (p50 min, M1-R1 → P1q)
| Scenario | L5 | L10 | L15 | L18 | L20 | L25 | L30 |
|---|---|---|---|---|---|---|---|
| seller15 | 5.5→5.5 | 10.0→10.0 | 18.2→18.2 | 28.0→28.0 | 38.0→38.0 | 90.8→90.8 | 244.5→244.5 |
| cheapest | 7.0→7.0 | 11.8→11.8 | 20.8→20.8 | 31.5→31.5 | n/r | | |
| active (1 s) | 5.3→5.3 | 9.7→9.7 | 17.8→17.8 | 27.6→27.6 | 37.4→37.4 | | |
| Poisson | 5.8→**5.5** | 10.5→**10.2** (max 13.0→11.2) | 19.0→**18.5** | 29.0→**28.2** | 39.0→**38.0** | | |
| 0.5 / 0.25 tap/s | unchanged (10.0 / 10.2 at L10) | | | | | | |
| casual (20 s) | 5.7→5.7 | 10.3→10.3 | 18.3→18.3 | 28.3→28.3 | 39.0→**38.3** | | |
| demand −25% | 6.2→6.2 | 11.2→11.2 (max 12.0→11.8) | 20.2→20.2 | 31.2→31.0 | n/r | | |
| demand +25% | unchanged | | | | | | |
| worst combo (AC7-soft casual) | 7.0→**6.7** | 13.3→**12.3** (max 16.7→15.0) | 24.7→**22.3** | 39.0→**35.0** (p90 >40→36.3) | n/r | | |
Basket at 40 min: worst combo 8.6k → 6.5k eggs, casual 950 → 0, Poisson 614 → 0. Lost customers in the worst combo 21% → 13%.

## Farm checks
- **Coop looks (L5/L10/L20):** 5.5 / 10.0 / 38.0 min for seller15, the same as M1-R1. The worst-combo casual player is now at 6.7 / 12.3 min, with L20 not reached within 40 min. That spacing is sensible: early tiers in the first 10 min, Tier 4 as the ~40 min reward.
- **Late curve:** the same to the second (steps over 3 min from F17→18 at 255 s, F20 375, F25 735, F30 2,250 s). P1q neither fixes nor worsens it. late-curve-for-workers.md stays valid.
- **What limits progress:** still production. seller15 basket ends at 0 with about 17% of arrivals lost to a full queue, by design. Demand only binds at −25% (0% lost, basket ~2.8k). P1q helps players who sell in bursts, because the queue holds 2× the orders.
- **F1** (costs and stats = CSV, MAX at 30): holds. Farm cost, hens, cap and price are unchanged; only the CSV values change.
- **F2/F4** (stats apply on purchase; queued orders keep their size): hold. More customers are affected at once (up to 10).
- **F3** (sprite tiers): holds; timing above.
- **F5/F6:** unaffected.
- **F7 hint accuracy:** P1q is **not noisier**; it's slightly better. Median |error| in M1-R1 → P1q:
  - seller15: 11.2% → 10.8% (within ±10%: 47% → 48%)
  - active: 3.7% → 3.7%
  - casual: 23% → 18% (within ±25%: 53% → 63%)
  
  Real play already misses "±10%" under both tables. Error comes from 15–20 s sell bursts and Collection buys between Farm buys, not from order size. The F7 test must stay defined on a steady-income bot.
- **F8 / queue-growth rule breaks:** the Farm spec says 3 → 4 at L10 → 5 at L20 (formula min(5, 3+floor(F/10))). P1q gives 6 (F0–4), 7 (F5–9), 8 (F10–14), 9 (F15–19), 10 (F20–30). Growth points move to every 5 levels and the start is 6 instead of 3. "Never shrinks" still holds. The new steps line up with the coop looks at L5/10/20, plus L15. F8, spec §2/§4, economy.md, market spec MK-3b/edge case 7 and core-loop AC3 all need the new rule.
- **New Farm-row risks:**
  - The "customers" line on the Farm row (interval + demand range + queue) changes meaning: orders halve, so the next-level preview shows smaller numbers. Preview copy should lead with "+1 customer slot" / "faster customers".
  - The interval reaches 1.5 s from F24, which is 40 arrivals/min with up to 10 cards. Engineering/Art & UX need to confirm card churn and performance at 375 px (the Designer already flags the "+N waiting" fallback).

## Recommendation: SIGN OFF WITH CONDITIONS
1. Adopt the queue rule `min(10, 6 + floor(F/5))` as the Farm-owned queue_max. I will update Farm spec §2/§4/F8 after HoP approves. Market owner updates MK-3b/edge case 7; HoP updates AC3/economy.md.
2. Art & UX/Engineering confirm 6–10 cards (or "+N waiting" past 5) at 375 px and 1.5 s arrivals from F24 without UI churn. This is a Farm concern because queue size is a Farm-level reward shown on the Farm row.
3. Farm-row preview copy shows the queue slot gain at F5/10/15/20, so smaller orders don't read as a downgrade.
4. F7 QA oracle stays the steady-income bot (±10%). For real play we accept p50 error ≈11% at 15 s selling. No change needed for P1q.
5. When P1q ships with P3, rerun this Farm check on the final CSV (L0 demand 6–12, eggs/s 1.5). P3 moves early times (Designer: F10 −7–8%), which could pull the L5 look under 5 min.
No objection on pacing: seller15/cheapest are identical to M1-R1, and casual/Poisson improve (AC7-soft L18 39.0 → 35.0).
