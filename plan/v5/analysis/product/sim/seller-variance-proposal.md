# Seller15 bot: per-seed variance (HoQA F-1, PR #7) — proposal for Engineering
Economy/Balance · 2026-10-17 · Python reference: `product/sim/seller_variance_sim.py` (copy of economy_sim.py 1178d8c6 plus a `var=` flag) and `seller_variance_run.py` (output: `seller_variance_out.json`). Data: F1 m4cols `economy.f1-m4cols.csv` 86f0e80e. **Proposal: needs HoP approval before any gate changes.**

## Root cause (why the seed does nothing)
The RNG *is* used, but only for customer demand size (and arrival gaps when `poisson`). The seller15 bot is **supply-bound**: every 15 s Sell-all empties the basket (basket = 0 at the end of every run), and the queued demand always exceeds the basket. So coins = eggs tapped × price no matter what each customer wanted. Taps are a fixed 1/s and checks/purchases are on a fixed 15 s grid, so every seed sells exactly the same eggs (25,432 on seeds 0–2) and buys at the same ticks. Turning on Poisson arrivals alone changes nothing (L18 still at 1185 s). **Root cause: fixed action cadence (taps and checks) on a supply-bound economy. Demand randomness can't reach the outcome.**

## Variance model (flag `var=VAR_DEFAULT`; `var=None` gives the old behaviour, verified identical reach/coins on run and run_m2)
Uses its own RNG stream, `Random(1_000_003*(seed+1)+17)`, so the demand stream is unchanged.
| Param | Default | Meaning / basis |
|---|---|---|
| poisson | true | the game's own random customer arrivals (exponential gaps, mean = interval) |
| check_mean_s / check_sigma | 15 / 0.35 | next check-in = 15 s × lognormal(0, 0.35), clamped to [5, 60] s. Median 15 s, ~P90 23 s. Active idle-game players check in at irregular intervals with a right skew (lognormal is the standard fit for human inter-action times) |
| tap_skill_sigma, lo/hi | 0.15, [0.6, 1.4] | per-seed tap-rate factor (lognormal). Players differ in tap speed and attention |
| tap_jitter | ±25 % uniform | per-tap interval noise |
| p_delay | 0.10 | a check-in skips buying (distracted, saving up) |
| p_cheap_first | 0.10 | at a check-in, buy an affordable Collection first, ignoring the 50 % rule |
TS port: in `runBot`/`runM2`, replace `tapT += 1` with `tapT += tapInterval()`, and replace `sellT += sellEvery` with `sellT = t + checkInterval()`. Before `buy()`, roll `p_delay` (skip) and `p_cheap_first` (force one Collection if affordable). Use a seeded PRNG separate from the game's state RNG, and keep the params in one exported object.

## Results: 100 seeds, F1 86f0e80e, 60-min runs (P5 / P50 / P95 / worst; worst = min for level, max otherwise)
| Case | L@30 min | Time to L18 (min) | Max step ratio* | Max purchase gap (min) | distinct t18 | t18 P95/P50 |
|---|---|---|---|---|---|---|
| No workers, old | 20/20/20/20 | 19.75 ×4 | 1.88 ×4 | 7.00 ×4 | 1 | 0 % |
| No workers, variance | 20/20/20/**19** | 20.04/20.63/22.05/24.06 | 1.92/2.61/3.62/4.03 | 5.63/6.60/7.79/8.68 | 97 | +6.8 % |
| Workers (CSV spec), old | 21/21/21/21 | 20.5 ×4 | 1.73 ×4 | 4.25 ×4 | 1 | 0 % |
| Workers, variance | 20/21/21/20 | 20.56/21.06/22.39/24.12 | 1.69/2.13/3.07/3.83 | 2.86/3.42/4.45/4.54 | 90 | +6.3 % |
*Step ratio = previous level ≥ 1 min, all levels in 60 min. The step-ratio and gap gates are L30+ gates and aren't in AC7. Below L30, short levels just over 60 s give jittery ratios, so don't gate these pre-L30.

## AC7 with variance
- No workers, L18–22 at 30:00 (P5 ≥ 18, P95 ≤ 22): **PASS** at 20 / 20. Worst seed L19.
- With workers, L20–24 at 30:00: **PASS** at 20 / 21, but P5 sits on the lower edge (20), and the worst seed is 20.
- Variance only slows the bot (median L18 +0.9 min), so it doesn't hide regressions. F1 L@30 is L20/L21, not the pre-F1 L18 that QA saw on main.

## Proposed target (for HoP)
1. The bot must not be degenerate: ≥ 50 distinct time-to-L18 values out of 100 seeds (≥ 15 of 30), and P95 ≠ P50.
2. Spread band: time-to-L18 P95/P50 between +3 % and +15 % (measured +6–7 %). Below 3 % the tail check is vacuous again; above 15 % the bot is noisier than the gate band.
3. AC7 is judged at P5/P95 using the variance bot. Keep the old deterministic bot as a regression fixture only.
4. Add HoQA's F-2 asserts (seed count, `quant` unit test).
