# AC7-soft (casual player): reproduction and fix proposal · Economy/Balance Designer · 2026-10-15
Status: PROPOSAL for Head of Product. economy.csv and the M1 numbers are unchanged (regenerated CSV is byte-identical).
Target (core-loop-spec, non-gating): casual player reaches Farm L10 ≤ 15 min and L18 ≤ 45 min in ≥ 80% of seeds.
Sim: `product/sim/economy_sim.py`. Run `python3 economy_sim.py --casual --seeds 100`.
Casual model `CASUAL` = seller15 buy rule, tap 1/s, Poisson arrivals (mean = customer_interval_s), Sell all every 20 s, demand ×0.75 (rounded, min 1). Runs are 60 min long.

## 1. Reproduction: M1-R1 already meets AC7-soft. QA's "miss" comes from the run length.
| scenario (seller15 rule) | t(F10) min/med/max | F10 ≤ 15 m | t(F18) min/med/max | F18 ≤ 45 m | lost % | unsold basket @60 m |
|---|---|---|---|---|---|---|
| **casual, 100 seeds** | 11.7 / **13.7** / 16.7 | **95/100** | 37.0 / **39.3** / 42.7 | **100/100** | 24% | 17,016 |
| casual, 20 seeds, 40-min runs (QA length) | 11.7 / 13.7 / 16.7 | 18/20 | **7/20 not reached by 40 min**, all reached by 42.7 | 20/20 | 25% | — |
| casual but fixed arrivals | 11.0 / 11.3 / 12.0 | 20/20 | 32.3 / 33.3 / 33.7 | 20/20 | 12% | 12,190 |
| casual but full demand | 10.7 / 11.2 / 12.7 | 20/20 | 29.7 / 31.0 / 32.3 | 20/20 | 24% | 5,751 |
| casual but sells every 15 s | 10.8 / 12.5 / 15.8 | 19/20 | 33.2 / 36.1 / 37.5 | 20/20 | 13% | 12,700 |
- QA's numbers are close to ours: L10 median 13.3 min (ours 13.7). QA's "6/20 seeds never reach L18" comes from running only 40 minutes when the target is 45. Every seed reaches L18 by 42.7 min, so **AC7-soft PASSES: 95% L10, 100% L18**. Ask QA to run 45+ min.
- But the margin is thin. L18's worst seed is 2.3 min from the limit, and 5% of seeds miss L10. Demand ×0.75 makes the casual player demand-limited again: 17k unsold eggs, plus ~24% of customers lost to a full queue between sells. So the casual gap is about **sell timing + demand**, which is exactly what an M2 seller worker can address.

## 2. Fix via M2 Workers (modelled; no product/workers spec exists yet)
Assumed worker (tunables for PM Workers to own):
- **Market Hand:** serves the queue every 1 s and takes a 10% fee on the sales it makes. The player's own sells pay no fee.
- **Hawker** (option): demand ×(1 + bonus).
- Hired automatically by the bot at the unlock level.
100 seeds, casual player:
| scenario | t(F10) min/med/max | F10 ≤ 15 m | t(F18) min/med/max | F18 ≤ 45 m | lost % | basket @60 m | fees paid @60 m |
|---|---|---|---|---|---|---|---|
| no worker (M1) | 11.7 / 13.7 / 16.7 | 95% | 37.0 / 39.3 / 42.7 | 100% | 24% | 17,016 | 0 |
| Market Hand (auto-sell, 10% fee, Farm 3, $150) | 11.3 / 13.2 / 16.7 | 97% | 33.3 / 36.0 / 38.7 | 100% | 1% | 6,148 | 23,355 |
| Market Hand + Hawker +25% (Farm 3, $150) | 11.0 / 12.3 / 15.3 | 98% | 31.3 / 32.3 / 35.3 | 100% | 10% | 0 | 28,012 |
| **Market Hand + Hawker +25% (Farm 1, $40)** | 11.3 / 12.0 / 15.3 | **99%** | 31.3 / **32.3** / 35.0 | **100%** | 11% | 0 | 28,239 |
| same, 0% fee (upper bound) | 10.7 / 11.3 / 15.3 | 99% | 28.7 / 29.7 / 32.7 | 100% | 10% | 0 | 0 |
- **Auto-sell alone** removes the sell-timing loss (lost 24% → 1%) and brings L18 forward by 3.3 min. It barely helps L10, because the casual player is still demand-limited.
- **The demand bonus is the lever that matters.** +25% roughly cancels the casual player's −25% demand. The basket clears, the L18 median drops to 32.3 min (worst 35.3, 10 min of margin) and L10 passes in 98–99% of seeds.
- The worst L10 seeds (15.3 min) come from unlucky Poisson arrivals before Farm 3. No worker fixes that in M1, and the soft target already allows ≥ 80%.

## 3. Recommendation
1. **M1: no number changes.** AC7-soft passes (95% / 100%). Fix the measurement instead: QA runs ≥ 45 min (I suggest 60) and ≥ 100 seeds, with `--casual` as the reference.
2. **M2:** give PM Workers a starting point: a seller worker that auto-serves the queue with a 10% fee, plus a demand bonus of about +25% (a hawker/marketer role or upgrade). Unlock it early (Farm 1–3, about $40–150) so casual players feel it before L10. This doubles as the "add demand or sell-through" answer to the late curve in `farm/late-curve-for-workers.md`. The failure/fatigue model (workers that fail without management) still has to be modelled once a spec exists. Expect to lose part of the +25% when the worker is unmanaged.
3. Watch item: if the playtest casual demand is below ×0.75, or players sell less often than every 20 s, L18 at 45 min is at risk without Workers. Re-check against telemetry.
