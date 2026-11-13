# Economy M1-R1 — Economy/Balance Designer · 2026-10-15 · APPROVED (Head of Product; offline 0.25 by CEO) and APPLIED to economy.csv / economy.md
## Final (applied) values — supersede §4–5 below where different
Early-game retune for ~10 upgrades by 5 min: Collection cost floor(10 × 1.6^C) (was proposed 30 × 1.5^C), Farm cost floor(100 × 1.35^F) (was 90). Demand [ceil(0.8k), ceil(1.6k)], price (1.00+0.05F)×(1+0.12C), offline 0.25 / 2 h, queue min(5, 3+floor(F/10)), all unchanged from the proposal.
| model (20 seeds) | first upg | upg @5m | Farm @10m | Farm @30m | t(F10) | t(F18) | customer_partial % | customer_lost % |
|---|---|---|---|---|---|---|---|---|
| seller15 | 15 s | 10 | 10 | 18 | 10.0 min | 28.0 min | 0.9 | 14.9 |
| cheapest | 15 s | 9 | 8 (80%) | 17 (94%) | 11.8 min | 31.5 min (seed 0) | 1.3 | 15.2 |
Sell every 30 s (seller15): L10 11.5, L18 35.5 min. Collection cap C0/1/3/5/8 → F12/15/16/17/18 @30 min. v1 backups: /tmp/economy_v1_backup.csv, /tmp/economy_sim_v1_backup.py (box only).

## Original proposal (history)
- Sim: `product/sim/economy_sim.py` (canonical; `python3 economy_sim.py --seeds 20 --extras`). Full output: `product/sim/results.txt`.
- Proposed table (L0–30, for review, not wired in): `product/sim/proposal-m1-r1.csv`.

## 1. Canonical sim (merges economy_sim.py, farm_stress_sim.py, progression_sim.py, qa/balance_sim.py)
0.1 s ticks; tap Collect 1/s; first customer 10 s; arrival timer never pauses; arrival into a full queue is lost; queue 3+floor(F/10); patience 30 s; seeded random integer demand; Sell all front-to-back with partial fills; coins half-up to cents. 20 seeds.
Player models (both sell all every 15 s and check purchases right after each sell):
- **seller15 (AC7 reference player):** buy Farm if affordable; otherwise buy Collection only if its cost ≤ 50% of the next Farm cost.
- **cheapest:** always buy the cheapest affordable upgrade (the literal old AC7 wording).
- **legacy:** old undocumented rule (Collection only while tap < 3× eggs/s or C<2; QA I1). Kept only to reconcile old numbers.

## 2. Reconciling the old sims (baseline = current economy.csv)
| Source | Model | Farm L10 | L15 | L18 | L20 |
|---|---|---|---|---|---|
| economy.md pacing table | old economy_sim: 1 s ticks, average demand, legacy rule | 10 min | 20 | 30 | — |
| PM Market progression_sim | 15 s seller, legacy rule, real queue | 9.4 | — | — | 36 |
| PM Farm farm_stress_sim | sells every 1 s, legacy rule | 9.0 | 17.4 | 26.3 | 35.2 |
| **canonical, legacy rule, sell 15 s** | real queue, random demand | **9.2** | **18.0** | **26.8** | **36.0** |
| canonical, legacy rule, sell 30 s | | 12.0 | 24.5 | 39.5 | 57.5 |
The PM sims agree with each other (and with the canonical one) to within 0.5 min. The economy.md table is the outlier, and is ~10% slow at L15–18. Likely cause: it runs at 1 s resolution with average demand, so customers arrive at whole seconds (e.g. every 6 s, not 5.99). The old table was a sim artifact. Every number below comes from the canonical sim.

## 3. What is wrong with v1 (baseline, canonical sim, 20 seeds)
| model | first upg | upg @5m | Farm @10m | Farm @30m | t(F10) | t(F18) | Coll @30m | unsold basket @30m |
|---|---|---|---|---|---|---|---|---|
| seller15 | 30 s | 11 | 6 | 15 | 15.5 min | not reached | 30 (max) | ~11,300 |
| cheapest | 30 s | 9 | 3 | 11 | 24.6 min | not reached | 29 | ~8,100 |
| legacy | 30 s | 8 | 10 | 18 | 9.2 min | 26.8 min | 11 | ~14,300 |
Cheapest/seller15 Farm level: 50% @10 min, 73% @30 min.
- **Demand-capped income (I2):** demand is only 0.28–0.55× production at every Farm level (0.31× at L10), so 45–72% of eggs can never be sold. Coins come from demand × price, not from production.
- **Collection past L3 is worthless:** at 1 tap/s, eggs per tap is higher than production from C1, and extra eggs can't be sold anyway. Capping Collection at C0, C1, C3, C5 or C8 leaves the Farm level at 30 min at **F18 in every case**. So the targets only pass with a rule that tells players not to buy it (I1).
- **Offline eggs overvalued:** there is never spare demand, so a 2 h basket (3,600 eggs at F0, 39,600 at F10) **can never be sold**. It only adds to a basket the player can't empty.

## 4. Proposed changes (Farm cost growth stays ×1.35)
| Tunable | v1 | M1-R1 | Why |
|---|---|---|---|
| Demand per customer | uniform int [3+L, 8+2L] | uniform int [ceil(0.8k), ceil(1.6k)], k = eggs_per_sec × customer_interval_s | Demand is about 1.2× production at every level. Production now matters, and there's spare demand to sell basket or offline stock. |
| Egg price | 1.00 + 0.10·F | (1.00 + 0.05·F) × (1 + 0.12·C) | A slower Farm price ramp (income now grows with production). Collection gets a real benefit: +12% egg value per level. |
| Collection cost | floor(10 × 1.15^C) | floor(30 × 1.5^C) | With a real benefit, Collection has to be priced so the cheapest-first player can't overbuy it. |
| Farm cost | floor(25 × 1.35^F) | floor(90 × 1.35^F) | Base ×3.6 to offset roughly 3× income. **Growth stays ×1.35.** |
| Offline rate | 0.5 × eggs/s, 2 h cap | 0.25 × eggs/s, 2 h cap | A 2 h absence = 30 min of production. It sells through the 20% spare demand in ~145 min of play (v1: never). |
| Eggs per tap, hens, coop, interval, queue, patience | — | unchanged | Queue stays 3+floor(L/10). |
Collection's tap value stays as-is: it is what keeps up with the coop for players who tap less often.

## 5. Results M1-R1 (canonical sim, 20 seeds, min/median/max)
| model | first upg (s) | upg @5m | Farm @5m | Farm @10m | Farm @20m | Farm @30m | t(F10) min | t(F18) min | Coll @30m | basket @30m |
|---|---|---|---|---|---|---|---|---|---|---|
| seller15 | 30/30/45 | 8 | 4 | 9 | 15 | 18 | **10.2** | **27.8** | 15 | 0–20 |
| cheapest | 30/30/45 | 6/6/7 | 2 | 8 | 14 | 17 | 12.2 | 33.0 (seed 0, 40 min run) | 15 | 0–3 |
| legacy | 30/30/45 | 6 | 4 | 10 | 15 | 18 | 9.8 | 26.8 | 11 | 0–67 |
- **AC7 targets (seller15):** L10 at 10.2 min (target 10, band 8–12) PASS. L18 at 27.8 min (target 30, band 24–36) PASS. First upgrade 30 s.
- **Cheapest-first vs seller15:** Farm level 89% @10 min and 94% @30 min (need ≥ 70%) PASS. Cheapest-first reaches L10 at 12.2 min and L18 at 33.0 min, both inside the ±20% band.
- Variance across seeds is close to zero because income is now production-limited, not demand-limited.
- **Collection value:** Farm level at 30 min with Collection capped at C0/C1/C3/C5/C8 = F12/F15/F17/F18/F18 (v1: F18 at every cap). Each level matters through about C5, and then the 1.5× cost growth tapers it off. That taper is intended.
- **Slower sellers (seller15 rule):** selling every 30 s gives L10 at 11.5 min and L18 at 34.5 min (v1 legacy: 12.0 / 39.5).
- Supply vs demand (M1-R1): demand/supply = 1.20–1.22 at every level from F0 to F30. Offline 2 h stock is sold in 138–150 min of play.
- Late curve (seller15, seed 0): L20 at 38.5 min, L22 at 52 min. The late game (L18+) is still mine to tune with Workers (M2).

## 6. Risks / open questions for Head of Product
1. **About 16% of customers now leave part-served.** Demand is higher than supply on purpose, so some customers time out after a partial fill or because the basket is empty. Do we show this as a "lost customer" or as normal "sold out"? I recommend not logging partial-fill timeouts as customer_lost. PM Market should own the UX for this.
2. **Upgrades @5 min = 8 (old AC7 asked for ≥ 8).** That's right on the line. Cheapest-first gets 6, which is ≥ 70%.
3. **Offline at 0.25** goes against the CEO's 50% decision (2026-10-15). It needs the CEO's OK. The alternative is to keep 0.5 and accept that 2 h of stock takes ~5 h of play to sell.
4. **The new egg-price formula** needs an Engineering change: balance.json gets `collectionPriceBonus` and a supply-linked demand mode. AC6, QA's CSV checks and the C-AC docs (Collection = "+5 eggs/tap") need updating, and the Collection PM must agree to the new benefit.
5. When this is approved, product/economy_sim.py (the CSV generator) is regenerated from the canonical sim's parameters, and farm_stress_sim/progression_sim/qa balance_sim are retired.
