# Economy v1 — Milestone 1 · 2026-10-15 · Head of Product (owner) · QA verifies
Table: `economy.csv` (levels 0–30). Generator: `economy_sim.py` (`python3 economy_sim.py` regenerates the CSV from `sim/economy_sim.py` config `CURRENT` and prints AC7 pacing). Canonical sim: `sim/economy_sim.py`. Change history: `economy-proposal-m1.md`. L = level, starting at 0.

> **Playtest-1 change (P1q + P3 + P4, approved by Head of Product 2026-10-15):** the rows marked PT1 describe `economy.p1q.csv`. Merged into `economy.csv` 2026-10-15 after PM Farm Upgrades sign-off (`farm/p1q-farm-review.md`); backup `economy.pre-p1q.csv`. Previous values (interval max(3, 10×0.95^F), demand [ceil(0.8k), ceil(1.6k)], queue min(5, 3+floor(F/10)), L0 1.0 eggs/s). Re-sim: `playtest1-resim.md`; diff: `economy-p1q-diff.md`.

| Stat | Formula (M1-R1, approved 2026-10-15; PT1 rows updated) | L0 | L10 |
|---|---|---|---|
| Collection cost | floor(10 × 1.6^C) | 10 | 1,099 |
| Eggs per tap | 5 + 5C | 5 | 55 |
| Collection price bonus | +0.12 × C (multiplies egg price; CSV `collection_price_bonus`) | +0% | +120% |
| Farm cost | floor(100 × 1.35^F) | 100 | 2,010 |
| Hens | 5 + 5F | 5 | 55 |
| Eggs/sec | 0.2 × hens; **PT1-P3 exception: L0 = 1.5** (starter nest +0.5 eggs/s at L0 only; hens stays 5) | 1.5 | 11.0 |
| Coop capacity | 50 + 50F | 50 | 550 |
| Egg price ($) | (1.00 + 0.05F) × (1 + 0.12C), rounded to cents; CSV `egg_price` = farm part 1.00 + 0.05F | 1.00 | 1.50 (×2.2 at C10) |
| Customer interval (s) | **PT1-P1:** 0.5 × base, base = max(3, 10 × 0.95^F), rounded to 2 dp (floor 1.5) | 5.0 | 3.0 |
| Demand per customer | **PT1-P1:** uniform int [ceil(0.4k), ceil(0.8k)], k = eggs_per_sec × **base** interval (half-size orders, twice as often: still ≈1.2× production per second) | 6–12 | 27–53 |
| Customer patience (s) | 30 | 30 | 30 |
| Queue max | **PT1-P1q:** min(10, 6 + floor(F/5)) (2× slots so the queue holds the same eggs as before) | 6 | 8 |
| First customer (s) | 10 | 10 | 10 |
| Offline eggs | floor(min(t_away, 7200 s) × 0.25 × eggs_per_sec) (CEO 2026-10-15) | 2,700 max | 19,800 max |

Cost = price to buy the *next* level when currently at L. Coin rounding: 2 decimals, half-up; costs are integers.

## Rationale
- Two geometric cost curves. Farm (×1.35) multiplies production, price and demand together. Collection (×1.6) raises egg value +12%/level plus taps; steep growth stops a cheapest-first player over-buying it.
- M1-R1: demand ≈ 1.2× production at every level, so income = eggs produced × price (production-limited, not demand-limited) and the 20% spare demand slowly sells basket/offline stock.
- Coop cap (50 s of production at L0) rewards returning to tap; gives M2 Workers a natural job (auto-collect).

## Offline earnings (CEO decision 2026-10-15)
- Rate 25% of online production (CEO 2026-10-15, was 50%; 2 h stock sells through spare demand in ~140–150 min of play), counted for at most 2 h (7200 s) away. t_away = now − last save, clamped to [0, 7200]; negative clock deltas → 0. Below 60 s away: no modal, nothing granted.
- **Coop-cap interaction:** offline eggs **bypass the coop cap** and go straight to the Basket when the player taps Collect on the welcome-back modal. The coop itself is left as it was at the last save (it doesn't also fill while away, so nothing is counted twice). Why: capped at the coop, offline gain would be about 50 s of production, which defeats the feature.
- Eggs only, not coins: they still need selling, so the market demand limit still applies. Customers don't queue while you're away.
- CSV columns: `offline_eggs_per_sec`, `offline_max_eggs_2h`.
- Market tunables (P4, approved by Head of Product 2026-10-15): CSV columns `customer_patience_s`=30, `first_customer_s`=10 are the same on every row. `queue_max` = min(10, 6 + floor(F/5)) per Farm level (PT1-P1q): 6 at L0–4, 7 at L5–9, 8 at L10–14, 9 at L15–19, 10 at L20–30. Previously min(5, 3 + floor(F/10)) (Head of Product 2026-10-15, Farm P2; co-owned with PM Farm Upgrades, since it is a Farm-level benefit; signed off by PM Farm Upgrades 2026-10-15). UI shows at most ~5 cards plus a '+N waiting' chip at 375px (Art & UX). Pacing sim covers online play only.

## Pacing (AC7, canonical sim, 20 seeds, seller15 = Sell all every 15 s, Farm-first, Collection if ≤50% of next Farm cost)
| Time | Upgrades | Collection L | Farm L |
|---|---|---|---|
| first upgrade | 1 @ 15 s | 1 | 0 |
| 5 min | 10 | — | 4 |
| 10 min | — | — | 10 (L10 at 10.0 min) |
| 20 min | — | — | 15 |
| 30 min | — | 15 | 18 (L18 at 28.0 min) |
Cheapest-first bot: 9 upgrades @5 min, F8 @10 min, F17 @30 min (80% / 94% of seller15). Tolerance ±20%.
Customer outcomes (15 s seller): ~1% customer_partial (timed out after buying ≥1 egg), ~15% customer_lost (full queue or unserved; the spare demand by design).

## Collection checks & tunables (PM, Collection · approved by Head of Product 2026-10-15)
- **Tap-vs-coop check:** `economy_sim.py` prints any level where eggs_per_tap > 50% × coop_capacity at the paired Farm level (Farm level the sim bot holds alongside each Collection level), plus a same-index CSV check. Current result: none flagged. In the UI the same condition (next Collection level vs current cap) shows the "Limited by coop" hint.
- **Feel tunables (Collection-owned, non-economy, in config):** `tap_combine_window_ms` = 250; `max_flying_eggs` = 5.
- **Coop count:** float internally; floor for display and taps; production at cap is lost; tick uses real elapsed time; < 60 s background gap catches up in one step capped by coop; negative delta = 0 (Engineering confirmed).

## Workers (M2 v1.1, Head of Product approved 2026-10-15) — columns in `economy.csv`
Source: `product/workers/m2-proposal.md` §2, §8 (rulings) and §10 (v1.1). Generated by `python3 economy_sim.py` from `sim/economy_sim.py` `M2_CURRENT` (= `M2_V11`); `spec_from_csv()` reads the CSV back, and the generator prints the round-trip result (must be OK). The 17 M1 columns are unchanged, byte for byte. Worker columns are appended after them.
**Layout:** values that vary by Farm level are per-level columns. Scalars are constant columns (the same on every row, like `customer_patience_s`). Engineering's parser needs a number in every cell, so **0 = "not unlocked at this Farm level"** instead of an empty cell (§8.10 asked for empty; see Engineering note 1).
Per-level columns:
| column | meaning | formula / values |
|---|---|---|
| w1_cost | Market Hand hire cost ($), 0 before unlock | 40 from F3 |
| w1_wage_per_min | Market Hand wage at this F ($/min) | 0.25 × F from F3 |
| w2_cost | Coop Hand hire cost | 150 from F7 |
| w2_wage_per_min | Coop Hand wage | 0.5 × F from F7 |
| w3_cost | Hawker hire cost | 800 from F8 |
| w4_tier | highest Grader tier unlocked at this F (0 = none) | 1 @F18, 2 @F19, 3 @F21, 4 @F22, 5 @F24 |
| w4_price_mult | that tier's price multiplier (1.0 = none) | 1.5 / 2.0 / 2.5 / 3.0 / 4.0 |
| w4_tier_cost | that tier's cost = floor(0.5 × farm_cost at the tier's unlock F) | 11,091 / 14,973 / 27,288 / 36,839 / 67,139 |
Constant columns: `w1_unlock_farm`=3, `w1_every_s`=1, `w1_tired_every_s`=3, `w2_unlock_farm`=7, `w2_every_s`=2, `w2_tired_every_s`=4, `w3_unlock_farm`=8, `w3_demand_mult`=1.25, `w3_tired_demand_mult`=1.1, `w4_tier_cost_share`=0.5, `w4_tired_bonus_share`=0.5, `w4_asleep_bonus_share`=0.15, `energy_start_pct`=100, `drain_s_per_pct`=9 (15 min), `tired_below_pct`=30, `yawn_at_pct`=50, `manage_cooldown_s`=30 (global, shared by Manage all), `manage_all_min_workers`=3 (active; from Oct 17 it gates only bulk Refill-all, which needs 3+ hired. Below 3 hired, the bar refills only the lowest worker. PM Workers, un-deprecated Oct 17 02:42), `unpaid_resume_wage_min`=1, `coop_full_tip_s`=10.
Rules not expressed as numbers (m2-proposal §8, mirrored in `run_m2()` when `unpaid_rule` is on):
- An Unpaid worker acts like Asleep, but doesn't drain.
- Resume order is W1→W4. Each worker needs coins ≥ 1 min of its wage, after reserving for workers already resumed in the same pass.
- Manage refills an Unpaid worker's energy, but it stays Unpaid.
- A Grader tier purchase doesn't refill energy.
- Manage all is disabled (and starts no cooldown) when every worker is at 100%.
- Tired Grader = 1 + 0.5 × (m − 1). Asleep Grader = 1 + 0.15 × (m − 1).
Pacing with these values (100 seeds, 2 h; `sim/m2_validation/m2table_v9.md`):
- **Managed:** seller15 F10/F18/F25 = 10.8 / 29.0 / 62.2 min, ×2.39 income at F21, worst step 5.8 min. Cheapest 70.5 min, step 7.8. Casual 64.0. Slow 63.5.
- **Unmanaged:** seller15 F25 86.0 (M1 90.8), cheapest 100.8 (M1 109.8).
- Manage actions: 1.25 per 15 min.
- The Unpaid rule changes nothing in managed pacing.
- **PT1-P4 Manage rule (Workers change request, approved by Head of Product 2026-10-15):** Manage is enabled only when a worker's energy is ≤ `yawn_at_pct` (50; changed from 40, Head of Product 2026-10-16 23:58, so the yawn, the Manage prompt and the refill threshold all appear at the same moment). The Refill bar shows from 1 tired or asleep worker (PM Workers, fix c231c02). With 3 or more hired (`manage_all_min_workers`) it refills all tired or asleep workers; with fewer it refills only the lowest worker. Refill stays free with the shared 30 s `manage_cooldown_s`. CSV `manage_prompt_threshold` = 0.5 (was 0.4) (same on every row). Sim: ~6.9 Manage taps per 15 min at F1 (5.6 pre-F1; was 1.25), AC-W5 still passes.

> **Change, Oct 15 (Head of Product, P1q, approved for rc0):** the customer queue is now queue_max = min(10, 6 + floor(F/5)), replacing the 3/4/5 slot rule. Order size and customer interval are both halved, so demand per second stays the same. AC3's queue and slot wording follows this rule. Sources: `playtest1-resim.md`, `farm/p1q-farm-review.md`, `economy.p1q.csv`.
