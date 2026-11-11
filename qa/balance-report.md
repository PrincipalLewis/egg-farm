# Balance Report — Economy v1 (Head of QA, 2026-10-15)
Inputs: product/core-loop-spec.md (AC1–AC11), product/economy.md, product/economy.csv, product/economy_sim.py.
Tolerance ±20% applied to AC7 targets → first upgrade ≤ 36 s; ≥ 6.4 upgrades by 5 min; Farm L ≥ 8 by 10 min; Farm L 12–24 at 30 min.

## 1. Product sim rerun (run in /tmp copy; it rewrites economy.csv)
- Regenerated CSV is byte-identical to product/economy.csv. Independent formula check of all 31 rows vs economy.md: 0 mismatches (AC6 data OK).
- Output: 30s 1 upg (C1/F0, first at 20 s) · 5m 8 (C3/F5) · 10m 16 (C6/F10) · 20m 24 (C9/F15) · 30m 29 (C11/F18). Exactly matches economy.md table. Tap>50% cap check: none.

| Target (AC7) | Product sim | Result |
|---|---|---|
| First upgrade ≤ 30 s | 20 s | PASS |
| ≥ 8 upgrades by 5 min | 8 | PASS |
| Farm L ≥ 10 by 10 min | 10 | PASS |
| Farm L 15–20 at 30 min | 18 | PASS |

## 2. QA independent sim (qa/balance_sim.py, reads economy.csv)
Differences from Product sim: real queue (max 3), 30 s patience, spawn timer runs from last spawn (Product resets on sale), integer random demand, half-up coin rounding, partial fills.

### Product bot policy (Collection only while tap < 3× eggs/sec or C<2)
| Target | Avg demand | Random, 20 seeds (min/median/max) | 200-seed fail rate (vs ±20%) | Result |
|---|---|---|---|---|
| First upgrade ≤30 s | 20 s | 20 / 20 / 40 s | 1/200 > 36 s | PASS (0.5% outlier) |
| ≥8 upg @5 min | 8 | 6 / 8 / 9 | 6/200 < 6.4 | PASS (3% outliers) |
| Farm ≥10 @10 min | 10 | 9 / 10 / 10 | 0/200 | PASS |
| Farm 15–20 @30 min | 18 | 18 / 18 / 18 | 0/200 | PASS |
Customers lost to patience: 0. NaN/negative: 0.

### Literal AC7 bot ("buys cheapest affordable upgrade", no gating)
| Target | Result (avg demand; random spread) |
|---|---|
| First upgrade | 20 s (20–40) PASS |
| Upgrades @5 min | 9 (8–10) PASS |
| Farm @10 min | **3 (3–4) FAIL**, 200/200 seeds |
| Farm @30 min | **10 (10–11) FAIL**, 200/200 seeds |
Pure greedy over-buys cheap Collection (C29 by 30 min), which is useless because sales are demand-limited.

## 3. Issues
- **I1 (Major, spec):** AC7's bot description doesn't match economy_sim.py: the targets only hold with the undocumented Collection gating rule. Product: either add the policy to AC7 or retune. Real players who buy the cheapest upgrade will stall on Farm. Same root cause as I2.
- **I2 (Major, balance):** income is demand-capped. After 30 min the bot holds ~15k unsold eggs (Product policy) or ~8k (greedy), so Collection upgrades past ~L3 add almost no coins. Offline eggs (up to 3,600 eggs at F0 and 39,600 at F10 per 2 h) also go into a basket that can't be sold quickly, so their value is overstated. Suggest a demand/price lever or a sell-rate check.
- **I3 (Minor, spec ambiguity, AC3):** when does the spawn timer reset (on spawn or on sale)? And when the queue is full, is a spawn skipped or delayed? Product sim and spec differ. Needs a decision for test oracles.
- **I4 (Minor, AC11):** behaviour isn't defined if the modal is dismissed without tapping Collect (eggs lost or kept?). "One absence" needs a definition (e.g., per save timestamp).
- **I5 (Minor):** random-demand variance gives ~3% of seeds < 6.4 upgrades at 5 min and 0.5% first upgrade > 36 s. Acceptable; noted for Product.

## Reproduce
`cd qa && python3 balance_sim.py --policy product --demand random --seeds 20` (also `--policy greedy`, `--demand avg`).

## Rulings 2026-10-15 (Head of Product). Re-verification pending the retuned economy.
- I1: AC7 player = 15 s seller with the stated buy rule (sim `--policy product --sell-every 15`). New gate: cheapest-first bot (`--policy greedy`) reaches Farm ≥7 by 10 min and ≥10.5 by 30 min (70% of targets). On the current CSV the greedy bot gets F3 at 10 min, so the 10-min gate FAILs; the Designer is retuning.
- I2: queue = 3 + floor(L/10) (`--queue-base 3 --queue-step 10`); Collection past L3 and offline egg value are being retuned. Section 1–2 numbers above are from v1 and are superseded.
- I3: patience from arrival, not reset by partial sale; arrival timer never pauses; arrival to a full queue is lost and counted as `full_queue` (sim now reports it). Cases Q1–Q6 in the test plan.
- I4: closing the modal grants the eggs; one absence = last save → next load, ≥ 60 s, one grant per load. Cases O11–O14.
- I5: accepted as is.

---
# M1-R1 verification (Head of QA, 2026-10-15 19:40). Supersedes the v1 sections above.
Inputs: product/economy.csv (M1-R1), economy.md, core-loop-spec AC7 (final), product/sim/economy_sim.py (reference), product/farm-upgrades/farm_stress_sim.py (or product/farm/farm_stress_sim.py if not moved) + sim_results_v2.txt.

## AC6: CSV vs formulas (`qa/csv_check.py`): PASS, 31 rows, 0 mismatches
Checked: Collection cost floor(10×1.6^C); Farm cost floor(100×1.35^F); egg_price 1.00+0.05F; collection_price_bonus 0.12C (**multiplies**: charged = round(egg_price×(1+bonus), 2), per economy.md); demand [ceil(0.8k), ceil(1.6k)], k = eggs/s × interval; queue min(5, 3+floor(F/10)) (3+floor(30/10) = 6 is capped to 5 at L30); offline 0.25×eggs/s, 2 h max (1,800 at F0); patience 30; first customer 10.

## Reference sim rerun (copy in /tmp; regenerated CSV byte-identical to product/economy.csv)
seller15: first 15 s · 10 upg @5m · F10 at 10.0 min · F18 at 28.0 min. cheapest: F8 @10m, F17 @30m → 80% / 94%. Matches economy.md.

## AC7 harness: QA independent sim (`qa/balance_sim.py`, CSV-only, 20 seeds, 40 min)
| Target | Expected | QA seller15 (min/med/max) | Result |
|---|---|---|---|
| First upgrade ≤ 30 s | 15 s | 15/15/30 s | PASS |
| Upgrades by 5 min ≥ 9 (target 10, 8–12) | 10 | 10/10/10 | PASS |
| Farm L10 at 10.0 min (8–12) | 10.0 | 10.0/10.0/10.2 min | PASS |
| Farm L18 at 28.0 min (22.4–33.6; spec window 24–36) | 28.0 | 28.0/28.0/28.2 min | PASS |
| Cheapest F@10m ≥ 70% of seller (exp. 80%) | 80% | F8 vs F10 = 80% | PASS |
| Cheapest F@30m ≥ 70% of seller (exp. 94%) | 94% | F17 vs F18 = 94% | PASS |
Customers (seller15): customer_lost full_queue 13.6/15.4/17.8%, timeout 0%, customer_partial 0.3/0.9/1.5% (reference: ~15% lost, ~1% partial). Basket ends ≈ 0 → income is production-limited as designed. No numeric flags.

## Demand variance (seller15 medians; F10/F18 times in min, spread min/med/max)
| Scenario | Upg@5m | t(F10) | t(F18) | Cheapest ratio 10m/30m | full_queue lost | Result |
|---|---|---|---|---|---|---|
| Demand −25% | 9 (7–9) | 10.8/11.2/11.5 | 30.5/31.2/31.8 | 78% / 94% | 0% | PASS (F10 1.2 min from the 12-min edge; basket builds ~3k eggs) |
| Demand +25% | 10 | 10.0 | 28.0 | 80% / 94% | ~30% (partial 6.5%) | PASS |
| Poisson arrivals | 9 (7–10) | 10.2/10.5/12.5 | 28.5/29.0/30.2 | 89% / 94% | 12–24% | PASS on median; 1/20 seeds F10 > 12 min |
| Sell every 20 s | 10 (9–10) | 10.3 | 28.3/28.7/28.7 | 89% / 94% | ~16% | PASS |
| Worst combo (Poisson + 20 s + −25%) | 7 (5–9) | 11.7/13.3/16.7 | 36.3/38.3/40 (6/20 "n/r" = runs cut off at 40 min, not failures) | 79% / 94% | ~21% | Slower but not stuck: **60-min, 100-seed rerun passes**. 95% reach F10 within 15 min (median 13.7), 100% reach F18 within 45 min (median 39.3). Outside AC7 scope, info only |

## Issues (owner)
- **R1-1 (Major, PM Farm Upgrades):** `product/farm-upgrades/farm_stress_sim.py` (or `product/farm/farm_stress_sim.py` if not moved) and `sim_results_v2.txt` still use the **v1** formulas (farm cost 25×1.35^F, collection 1.15^C, demand 3+F..8+2F, price +0.10F, 1 s selling). So "L10 at 12.0 min at −25% demand" is a v1 number, not M1-R1. On M1-R1, QA gets 11.2 min median (max 11.5): inside tolerance, but only 0.5 min of margin at the worst seed. Please port the stress sim to the CSV or the canonical sim and regenerate it.
- **R1-2 (Minor, Economy/Balance Designer):** at −25% demand the game becomes demand-limited again (basket ~3k eggs at 40 min; −25% demand plus offline stock sells slowly). Consider the margin when tuning offline value.
- **R1-3 (Minor, Economy/Balance Designer → HoP):** the worst-combo casual player (Poisson + sells every 20 s + −25% demand) is slower than the AC7 windows (F10 median 13.7 min, F18 median 39.3 min in the 60-min/100-seed rerun) but always progresses. The earlier "never reached L18" came from runs cut off at 40 min (corrected 2026-10-15). Not an AC7 model, but no robustness target exists for casual players; HoP to decide whether one is needed.
- **R1-4 (Info, Designer):** ~15% of customers are lost to a full queue by design, ~30% at +25% demand. UX may want feedback for lost customers (Art & UX FYI).
- **R1-5 (Info, Engineering):** the charged price multiplies Farm price by the Collection bonus and rounds once to cents (Q8 cases). Must match the reference `price()`.
No QA blockers on M1-R1. Economy sign-off condition met in sim; build verification pending.

Reproduce: `cd qa && python3 csv_check.py && python3 balance_sim.py [--demand-scale 0.75|1.25] [--poisson] [--sell-every 20]`
