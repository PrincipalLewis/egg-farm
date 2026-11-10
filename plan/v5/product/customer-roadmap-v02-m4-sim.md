# Customer type roadmap v0.2: re-sim on the full M4 stack (Economy, 2026-10-16)

**Verdict: the bulk buyer passes as specced. Mini-goals fail the ≤15% cap on M4 at the 12 s reward. Cut the reward to 8 s and keep 10 serves and the 120 s cooldown, then everything passes.** The 2.0× active/idle cap holds at P95 with either reward.

Inputs: product/economy.m4-candidate.csv, three tracks (Hens 36×1.30^H, Value 48×1.33^V, caps F+3), M3 taper, workers W1–W3, Grader tiers, abilities v0.3. 200 seeds, 60 min. Seller check every 5/15/30 s at 1 tap/s, plus casual (Poisson 20 s, 0.5 taps/s, demand ×0.75).
Code (copies, the originals are untouched) is in product/sim/market/:
- roadmap_m4_prog.py: from sim/m4/m4_workers_prog.py, plus seller interval, mini-goals, bulk buyer, an earned-income log and a "Market Hand paused" (w1off) option.
- roadmap_m4_active.py: from sim/m4/m4_active.py, with the CSV set to the m4-candidate and goals/bulk added.
- tr5_run_base.py: a reference copy.
- run_prog.py and run_ratio.py: the run drivers.
Raw output: prog_out.md, tweak_out.md, tweak8_out.md, ratio_out.md, ratio_g9_out.md.

Modelling rules:
- Mini-goals count only full serves made by the player, never Market Hand. The reward is R s × hens eggs/s × the current manual unit price.
- Bulk buyer: order = clamp(round(0.4×basket), dmax, 4×dmax), paid at 1.5× when the player visits and the basket covers it (all or nothing). It waits 60 s and Market Hand never serves it.
- Neither feature pays anything offline.
- Income lift = mean $/min over minutes 10–30 against the same player with neither feature (the same window PM Market used).
- "W_w1off" is a player who hires workers but pauses Market Hand so that they serve every customer themselves.

## 1. Income lift (10–30 min, mean of 200 seeds), v0.2 defaults (12 s / 120 s / 10 serves)
| player | goals alone | bulk alone | both | PM Market (economy.csv, no workers) |
|---|---|---|---|---|
| 5 s, no workers | **+17.7%** | +1.3% | +19.0% | ~+13% / +14% |
| 15 s, no workers | **+18.2%** | +1.7% | +19.7% | ~+13% / +14% |
| 30 s, no workers | **+19.8%** | +20.7% | +43.9% | ~+13% / +28.5% |
| casual, no workers | +24.7% | +3.3% | +28.1% | – |
| 5 / 15 / 30 s, workers (Market Hand on) | +2.1 / +0.8 / +4.6% | ~0% (0 served, 9 missed per hour) | +2.2 / +0.8 / +4.7% | – |
| casual, workers | +9.1% | +9.7% | +18.6% | – |
| 5 / 15 / 30 s, workers, Market Hand paused (vs the same player without the features) | +34 / +31.5 / +35% | +2 / +3 / +28% | +38 / +35 / +72% | – |

On M4 the goal reward is worth more than PM Market measured because Hens raises eggs/s faster than demand grows. **The ≤15% cap on goals alone fails for all three sellers.**
With Market Hand on, both features are close to inert: Market Hand serves customers before the player does, and it keeps the basket below the bulk order.

## 2. Active/idle (CEO 10-min window, full M4 ALL stack: cb, leave penalty, streak 0.30, golden egg v0.3, abilities, Focus)
Active = per seed, the better of Market Hand on or paused. Idle = workers only, no taps. Figures are mean / P95 seed / max seed.
| F | optimal, ALL | optimal, +both (12 s) | optimal, +both (9 s) |
|---|---|---|---|
| F10 | 1.58 / 1.68 / 1.74 | 1.67 / 1.77 / 1.85 | 1.65 / 1.75 / 1.82 |
| F18 | 1.58 / 1.65 / 1.70 | 1.71 / **1.82** / 1.88 | 1.68 / 1.79 / 1.86 |
| F22 | 1.53 / 1.63 / 1.70 | 1.63 / 1.71 / 1.75 | 1.60 / 1.68 / 1.73 |
| F24 | 1.53 / 1.63 / 1.71 | 1.57 / 1.66 / 1.75 | 1.55 / 1.65 / 1.74 |

The 5/15/30 s sellers and casual all stay at or below 1.74 at P95; the full table is in ratio_out.md. **The 2.0× cap passes** with at least 0.18 of headroom at P95, and every seed is below 1.9. 8 s sits below the 9 s column.

2 h offline formula (eggs/s × 0.25 × 7200 × Hens offline multiplier, with no customer features): optimal active over offline is 5.45 / 5.57 / 4.54 / 4.55 at F10/18/22/24. With both features at 12 s it is 5.76 / 6.02 / 4.82 / 4.65. That is up to +0.45, inside the accepted MJ2 range. The CEO's 2.0× cap is the 10-min online metric above, not this one.

## 3. Pacing (30:00 bands, worst gap, dead zones)
- **No workers (band L18–22):** 5 s and 15 s reach L21–22 and the 30 s seller L19–20 in 200/200 runs, with or without the features. Casual sits at L17 in every variant, base included (0/200 in band). That predates this roadmap.
- **Workers (band L20–24):** everything is in band except **5 s with Market Hand paused at 12 s, both features: median L25, 29/200 in band (FAIL)**; goals alone gives 141/200. At 9 s or 8 s this becomes L24 [24–24], 200/200.
- **Worst gap / dead zones:** the features never make the worst gap worse.
  - No workers: the >3 min gaps are already in the base runs, at F26 (5 s: 3.42 min) and F22–23 (30 s: 4.0 min). Both are past minute 30, in the 60-min extension.
  - Workers: worst gap 1.5–3.0 min in every variant, and no seed above 3 min.

## 4. Recommended tweak (smallest that passes), re-run on 200 seeds
**Mini-goal reward 12 s → 8 s** (keep 10 serves and the 120 s cooldown). Goals alone, no workers:
- 8 s: +11.7 / +12.0 / +13.3% (5/15/30 s), with about 2 points of margin. PASS.
- 9 s: +13.2 / +13.7 / **+15.0%**. Passes with zero margin for the 30 s seller.
- 10 s: +14.8 / +15.5 / +16.6%. FAIL.
- 12 s with a 150 s cooldown: +14.3 / +14.5 / +17.8%. FAIL.

At 8 s, both features together give +13.1 / +13.9 / +35.0%. Pacing is in band everywhere, and the 2.0× cap holds (≤1.79 at P95 at 9 s; 8 s is lower).

The bulk buyer has no limit of its own and stays at 1.5× and 150–270 s. Note that it mostly pays the 30 s seller (+20.7% alone), and is almost unreachable while Market Hand runs.

## 5. Design flags (not limit breaches)
- **Pausing Market Hand to farm goals beats leaving it on.** At 8 s, the 5 s and 15 s sellers earn about +13% / +9% versus the Market Hand-on player in minutes 10–30, with the 2.0× cap still met. If that is unwanted, PM Market could count a goal template in eggs sold (Market Hand included) or scale the reward down while Market Hand is paused.
- **The bulk buyer is basically worker-incompatible** (0 served per hour with Market Hand on), except for casual (7 served, 2 missed). Consider having Market Hand hold back the bulk order quantity, or showing a "Need N more" hint.
- **The casual player with no workers misses the L18–22 band even in the base runs** (L17). This is pre-existing, so it is outside this roadmap.
