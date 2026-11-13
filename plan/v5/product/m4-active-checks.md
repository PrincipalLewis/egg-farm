# M4 active-play checks vs the CEO cap (Economy/Balance, 2026-10-16)
**Target (CEO via HoP):** optimal sustained active play earns **≤ 2.0× idle income**, target band **1.5–2.0×**, over a 10-minute window.
**Code:** `product/sim/m4/m4_active.py` (model) + `m4_active_run.py` (runner). Raw output: `sim/m4/m4_active_raw.md` (progression) and `sim/m4/m4_active_raw2.md` (windows). `economy_sim.py`, `economy.csv` and `game/` are not touched; the sim only reads `economy.f1.csv` and `spec_from_csv`.
**Method:**
- 30 Monte Carlo seeds per cell.
- Window: 600 s at a fixed state with H = V = F (identity migration) and C = F − 3, measured at F10, F18 and F24, with every unlocked worker hired.
- **Idle** = no player input. Workers do everything, starting at 100% energy, with no Refill.
- **Optimal active** = tap 1/s, Sell every 3 s, Refill at ≤40%, catches every golden egg, Activate-all on cooldown, keeps the streak.
- **seller15** = the same player selling every 15 s.
- **casual** = taps 0.5/s, sells every 20 s, Poisson arrivals, demand ×0.75, catches 60% of eggs, 50% ability uptime. Measured against casual idle.
- Demand follows Farm, using the reference curve (the CSV demand at F). Price is modelled both ways: A puts +12%/level on Egg value, B on Collection. Grades are ×1.1 / ×1.25 / ×1.5, with Jumbo gated at F15, plus the Grader tiers. The Balanced-farm bonus is on.
- Before F7 there's no Coop Hand, so idle income is ~0 and the ratio is unbounded. The metric is meaningful from F8.

**Headline:** once workers are hired, today's active play earns **1.00× idle**. Workers already sell the whole supply, and demand is ≈1.2× supply, so all of the active premium comes from M4 mechanics. With every mechanic stacked, optimal play is at **1.44–1.57×**, under the cap but just below the band at F24. **Fix: raise the streak cap from 0.25 to 0.30.** That gives **1.51–1.62×** at all three levels, inside the band. The 0.40 stress case peaks at 1.73×, still under 2.

Ratios below are optimal / seller15 / casual. Price A unless stated; B ratios are identical.

## 1. Three tracks + M4 AC7
- **F1 no-worker baseline (own run, seller15):** t(L18) **19.75 min** median (30/30 seeds), L@30 = 20, so the ±10% band is **17.8–21.7 min**. Casual: 24.7 min.
- **upgrades.md §7.1 costs as written** (Hens 60×1.30^H, Value 80×1.33^V) with a greedy best-ROI buyer:
  - **FAIL.** Price A: Value-first dominates (≈+17% price per level against +33% cost) and the farm stalls at F4 (0/30 seeds reach L18).
  - Price B: 28.5 min, also outside the band.
- **Tuned A (recommended):** Hens 30×1.30^H, Value 40×1.33^V, plus a **new gate V ≤ F+3** (mirrors Hens ≤ F+3).
  - seller15: t18 **18.25 min**, L@30 21, max gap 2.5 min. **PASS.**
  - casual: 24.0 min, L@30 20, gap 2.0 min.
- **Tuned B:** Hens 20, Value 25, V ≤ F+3.
  - seller15: 20.25 min, **PASS**.
  - casual: **FAIL** (never reaches L18, L@30 17, gap 4 min).
- **Active/idle:** **1.00 / 1.00 / 1.00** at F10, F18 and F24. The tracks don't change the ratio. **Cap: PASS.**
- **Caveat:** under A the greedy bot leaves Collection at ~2 and Hens at ~11. Tap size caps its supply, a blind spot of the ROI estimate. A Collection-aware bot would be faster, so re-check with PM Farm Upgrades' bot set.
- **F1 itself already has a 3.25 min seller15 gap** (3.7 min casual) inside 30 min, so AC7's "no dead zone >3 min" is borderline today.

## 2. Completion bonus (complete_bonus_share)
- At cb 0, 0.05 and 0.10, the ratio is **1.00** at every level for all three models. Workers trigger the bonus too, so it lifts active and idle alike: 0.05 → +5% income ($331 → $348/s at F18).
- **PASS** (neutral). It adds no active premium. Earlier M4 runs showed cb 0.05 moves AC7@30 into band.

## 3. Focus vs Bulk
- A +10% focus premium on manual sells gives **1.00–1.05** (optimal), 1.00–1.01 (seller15 and casual), whether 1 or 3 cards per visit. The Market Hand sells to every customer who has waited ≥2 s before the player gets there, so the premium rarely applies.
- **PASS** cap, and both modes stay viable. Focus only beats Bulk for a player selling every ≤3 s at F24 (+5%). Treat it as flavour, not an active lever.

## 4. Pause exploit
- An idle player can't pause, so the check compares the same player with and without "pause W1/W2 at yawn (≤40%), resume at 100%".
  - **Optimal:** 1.000 at 10 min and 30 min (Refill makes pause irrelevant).
  - **Casual:** 0.97–0.99 at 10 min and **0.85–0.96 at 30 min**. Pausing loses money: recovery is 0.5×, so the workers sit idle for longer than the wage saved.
- **PASS.** Pausing never beats never pausing, so there's no exploit. Ratio impact: none.

## 5. Golden egg + Frenzy
- Golden egg every 2–5 min from F8, 30 s to catch. 45% Frenzy (×7 laying for 60 s), 55% Lucky (60 s of income).
  - **All outcomes:** **1.21 / 1.21 / 1.06** at F10, **1.17 / 1.17 / 1.05** at F18, **1.03 / 1.03 / 1.02** at F24.
  - Frenzy only: 1.17 / 1.15 / **1.00**.
  - Lucky only: 1.21 / 1.14 / 1.06.
- **PASS** cap, and nowhere near the Egg Inc drone risk. But **Frenzy ×7 is mostly wasted**: demand is only ≈1.2× supply and the coop caps, so ×7 laying ≈ +15%, and nothing at F24.
- **Tuning (recommended):** apply Frenzy to demand/price (e.g. ×2 sale price for 30 s) instead of laying. Base the Lucky payout on income including the Grader so it doesn't fade late. Lucky at 90 s in the full stack gives 1.48–1.60.

## 6. Worker cooldown ability (Activate-all) + streak, including stacking
- **Ability** (30 s per 5 min: Coop Hand ×2 speed, Hawker ×2 demand, Grader +50% share): **1.00–1.08** optimal, up to 1.09 casual. Supply binds, so faster collection and more demand barely help.
- **Never-user pacing:** the ability only acts while active and needs workers. The no-worker M4 AC7 run in §1 (18.25 min, tuned A) is the never-user case. **PASS.**
- **Streak:** +25% price gives **1.25** flat. On laying instead it gives 1.00–1.17 (demand-capped). Put it on price.
- **Stacking:**

| combination | F10 | F18 | F24 |
|---|---|---|---|
| streak + frenzy | 1.49 / 1.49 / 1.31 | 1.44 / 1.44 / 1.29 | 1.27 / 1.28 / 1.27 |
| streak + frenzy + focus | 1.49 / 1.49 / 1.32 | 1.50 / 1.45 / 1.30 | 1.34 / 1.29 / 1.27 |
| ALL (egg + ability + streak + focus + cb) | 1.53 / 1.53 / 1.37 | 1.57 / 1.53 / 1.37 | **1.46** / 1.44 / 1.37 |
| ALL, streak cap 0.30 (**fix**) | **1.58** / 1.58 / 1.41 | **1.62** / 1.58 / 1.42 | **1.51** / 1.49 / 1.42 |
| ALL, streak cap 0.40 (stress) | 1.69 / 1.69 / 1.51 | 1.73 / 1.69 / 1.52 | 1.62 / 1.59 / 1.51 |

- **PASS on the cap (max 1.73 even under stress); FAIL on the band at F24** with the 0.25 streak. **Fix: streak cap 0.30**, which puts optimal play in 1.51–1.62 everywhere.

## 7. Collection +12% on Egg value (A) vs on Collection (B), with Grader stacking
- The ratio is identical under A and B: price multiplies active and idle equally.
- **Price at matched level, compared with F1** (V = F, C = F − 3, no Balanced bonus):

| level | F1 $/egg | A $/egg | B $/egg | Grader | A × Grader |
|---|---|---|---|---|---|
| F10 | 2.76 | 4.12 (×1.49) | 3.45 (×1.25) | — | 4.12 |
| F18 | 5.32 | 7.50 (×1.41) | 6.65 (×1.25) | ×1.5 | 11.25 |
| F20 | 6.08 | 10.20 (×1.68) | 9.12 (×1.50) | ×2.0 | 20.40 |
| F24 | 7.74 | 12.80 (×1.65) | 11.62 (×1.50) | ×4.0 | 51.20 |
| F30 | 10.60 | 17.25 (×1.63) | 15.90 (×1.50) | ×4.0 | 69.00 |

- The Jumbo ×1.5 × Balanced5 ×1.3 × Grader T5 ×4.0 = **×7.8** top end (corrected 2026-10-16 M4-A review, HoP 14:45; ×6.0 left Balanced out) is reached from F24 and is about 1.6× F1's Grader-included price. The tuned costs in §1 absorb it for pacing.
- **Recommend A with the §1 tuned costs.** B, once tuned to seller15, fails casual. **PASS** (ratio 1.00).

## 8. Offline 0.25 vs 0.15 (context; not the CEO metric)

| level | optimal ALL $/s | idle in tab | offline 0.25 | offline 0.15 |
|---|---|---|---|---|
| F10 | 108 | 70 | 16.3 (×6.6) | 9.8 (×11.0) |
| F18 | 544 | 347 | 53.5 (×10.2) | 32.1 (×16.9) |
| F24 | 3666 | 2507 | 150 (×24.4) | 90 (×40.7) |

- The offline gap widens late because offline excludes the Grader and the price multipliers stack. The CEO cap is for in-tab idle and passes.
- The 0.15 decision stays with session 3's trigger. **Note:** a higher Egg value price raises offline income in step (×1.4–1.7 vs F1).

## Summary
| # | check | optimal active/idle (F10 / F18 / F24) | result | fix |
|---|---|---|---|---|
| 1 | Three tracks + M4 AC7 | 1.00 / 1.00 / 1.00; t18 18.25 min (F1 19.75) | PASS with tuning (7.1 costs FAIL) | Hens 30×1.30^H, Value 40×1.33^V, V ≤ F+3 |
| 2 | Completion bonus 0.05 | 1.00 / 1.00 / 1.00 | PASS (neutral) | — |
| 3 | Focus vs Bulk | 1.00 / 1.01 / 1.05 | PASS | — (weak lever) |
| 4 | Pause exploit | pause/never 1.00 (casual 0.85–0.99) | PASS, no exploit | — |
| 5 | Golden egg + Frenzy | 1.21 / 1.17 / 1.03 | PASS cap | Frenzy on price/demand; Lucky includes Grader |
| 6 | Ability + streak stacking (ALL) | 1.53 / 1.57 / 1.46 | Cap PASS; band FAIL at F24 | streak cap 0.30 → 1.58 / 1.62 / 1.51 |
| 7 | +12% on Egg value (A) vs Collection (B), Grader ×6 | 1.00 (A = B) | PASS | use A |
| 8 | Offline 0.25 vs 0.15 | active ÷ offline 6.6–24× (0.25) | info | session 3 decides |

## Approved values (Head of Product, 2026-10-16, relayed 12:59)
- Hens cost 30 × 1.30^L and Egg value cost 40 × 1.33^L, with **Egg value ≤ Farm + 3**. **Superseded 13:05: HoP adopted +20%, Hens 36 × 1.30^L and Egg value 48 × 1.33^L** (see the 13:xx rerun below).
- **Frenzy = ×2 sale price for 30 s.** The golden-egg cash payout is computed on income including the Grader.
- **Streak cap 0.30, on price.**
- **Price option A:** the +12%/level sits on Egg value.


---
# Rerun at adopted values (2026-10-16, after 13:06): 36/48 costs, F1-GAP folded in, leave penalty 0.05, completion bonus 0.05, spec streak, golden egg v0.3
**M4 economy CSV:** `product/economy.m4-candidate.csv`.
- It is `economy.f1.csv` (F1-GAP folded in) plus per-level `hens_cost` (floor 36×1.30^L) and `egg_value_cost` (floor 48×1.33^L).
- New constant columns:
  - Caps: `hens_cap_over_farm` 3 and `egg_value_cap_over_farm` 3.
  - `tc_*` constants: egg unlock F8, gap 120–300 s, despawn 30 s, weights 0.45/0.35/0.20, cash 45 s, eggs 60 s, frenzy ×2 for 30 s on all sales, streak +0.01 per tap (≤1/s), hold 3 s, decay 0.03/s, cap 0.30; complete bonus 0.05, leave penalty 0.05, focus 0.10, ability 30 s / 300 s.
- QA's `farm/m4/tr5_run.py --csv ../../economy.m4-candidate.csv` reads it: **RESULT PASS**. `economy.csv` is not edited.

**Code and output:** `sim/m4/m4_final_run.py`, output in `m4_final_out.md`.
- **Streak:** modelled per `collection/m4-collect-streak-spec.md`. It only builds on egg-moving taps, which compete with the Coop Hand.
- **Leave penalty:** uses the fixed hook from `leave_pen.py`: no penalty if the basket is under 1 egg, price includes the Grader, floor $0.
- **Price stacking:** fully multiplicative: price × Grader × (1+streak) × frenzy ×2 × (1+focus).

## Reference bot (PM Farm Upgrades' Collection-aware greedy buyer, look-ahead of 3), 36/48
- **seller15:** F18 at **18.88 min** (TR-5, 30/30 in band). Their own runner gives 19.00 on the earlier table.
- **L@30:** **L22** in 30/30 seeds.
- **Max gap:** 1.75 min at F21.
- **Verdict: PASS**, so their +20% result is confirmed.
- Other bots (seller15): Hens-first L20, Value-first L21, Balanced L21 (18.75 min), cheapest-first L19. All are in the L18–22 band.

## Active / idle, 10-min window
Cells are optimal / seller15 / casual. The worst seed is shown in [brackets], for the optimal player only.

| variant | F10 | F18 | F24 | cap 2× | band 1.5–2× |
|---|---|---|---|---|---|
| base (cb 0.05 + leave 0.05) | 1.00 / 1.00 / 1.00 | 1.00 / 1.00 / 1.00 | 1.00 / 1.00 / 1.00 | PASS | n/a |
| focus +10% | 1.00 | 1.01 | 1.05 | PASS | n/a |
| pause at yawn | 1.00 | 1.00 | 1.00 (casual 0.98) | PASS, no exploit | n/a |
| golden egg v0.3 only | 1.15 [1.27] | 1.14 [1.27] | 1.12 [1.23] | PASS | n/a |
| ability only | 0.99 | 1.02 | 1.08 | PASS | n/a |
| streak 0.30 only | 1.29 | 1.29 | 1.30 | PASS | n/a |
| streak + frenzy egg | 1.46 [1.63] | 1.45 [1.62] | 1.43 [1.53] | PASS | n/a |
| streak + egg + focus | 1.46 [1.63] | 1.48 [1.67] | 1.49 [1.59] | PASS | n/a |
| **ALL, streak 0.30 (approved)** | **1.44 [1.61]** / 1.44 / 1.43 | **1.48 [1.69]** / 1.48 / 1.45 | **1.55 [1.66]** / 1.54 / 1.49 | **PASS** | **FAIL at F10 and F18** (mean just below 1.5) |
| ALL, worst luck (egg every 120 s, always frenzy) | 1.52 | 1.56 | 1.64 | PASS | PASS |
| ALL, streak 0.35 | 1.49 [1.66] | 1.53 [1.74] | 1.60 [1.71] | PASS | borderline at F10 |
| **ALL, streak 0.40** | **1.54 [1.72]** / 1.54 / 1.52 | **1.58 [1.80]** / 1.57 / 1.55 | **1.65 [1.77]** / 1.64 / 1.58 | **PASS** | **PASS** at all levels, including casual |
| ALL, streak 0.50 (stress) | 1.64 [1.83] | 1.68 [1.91] | 1.75 [1.88] | PASS (worst-luck 1.87) | PASS |

- **Cap:** never broken. Even streak 0.50 peaks at 1.91 on the worst seed, so **no streak cap reduction is needed. Frenzy stays at ×2.**
- **Band floor:** with the approved 0.30 the mean misses the floor at F10 and F18 (1.44 and 1.48).
- **Recommendation (HoP to decide):** streak cap **0.40**. That gives a 1.52–1.65 mean everywhere, 1.80 on the worst seed, and a 2.8× peak (1.4 × 2) instead of 2.6×. The CSV keeps the approved 0.30 until HoP decides.
- **PM Collection's question:** was the earlier 1.51–1.62 run additive or multiplicative? **Multiplicative.** The streak multiplied price × Grader. Frenzy was still ×7 laying in that run, so streak × frenzy did not stack on price there. This rerun stacks all of them multiplicatively.

## F22–24 managed / unmanaged, collectibles excluded from both arms (no golden egg)
- **Canonical metric** (run_m2 `income_at_level`, `leave_pen.py`, penalty on, F1 + gapfix): seller15 **2.27**, cheapest 2.42, casual 3.64, slow 3.98. **PASS** (≥1.5).
- **At 36/48 tracks** (30-min window at F22/23/24, H = V = F, managed = Refill vs unmanaged = none): seller15 **1.67** (1.64 / 1.64 / 1.73), casual **1.78**. **PASS.**

## Task C: golden egg v0.3, E1 (30-min window, same state, streak on in both arms)
| level | player | gain 100% catch | gain 60% catch | split at 100%: cash / frenzy / eggs |
|---|---|---|---|---|
| F10 | managed (Refill) | +16.7% | +10.6% | 6.6 / 4.4 / 4.0 |
| F18 | managed | +16.5% | +10.5% | 6.6 / 4.4 / 3.8 |
| F24 | managed | +10.7% | +7.4% | 6.6 / 4.5 / **0.0** |
| F10 | unmanaged | +12.2% | +8.1% | 6.7 / 4.4 / 1.3 |
| F18 | unmanaged | +12.4% | +8.0% | 6.6 / 4.3 / 1.5 |
| F24 | unmanaged | +11.2% | +7.2% | 6.9 / 4.2 / 0.0 |

- **Against PM Collection's estimate of +20% / +12%:** we measure about **+17% / +11% managed up to F18** and about **+11% / +7% from F24**.
- **Cash and frenzy sizes hold.** The **eggs outcome (60 s of eggs) is worth nothing from about F20**: Hens at the H20 milestone out-produce Farm demand, so the extra eggs can't sell. Unmanaged it is also small, because the Market Hand gets tired.
- **Fix:** pay the eggs outcome as cash once eggs are demand-capped (F ≥ 20), or move its 20% weight to cash. That restores about +4%.

**(a) Should frenzy apply to worker sales and Basket stock?**
- E1 gain: **all sales +16.7% vs manual-only / new eggs +13.0%** at F10, and +10.7% vs +7.3% at F24.
- ALL-stack ratio: 1.44–1.55 vs 1.40–1.50.
- **Recommend yes** (`tc_frenzy_all_sales` = 1). Manual-only makes frenzy nearly worthless for a managed player and harder to read, and "yes" stays well under the cap.

**(b) Streak × frenzy stacking.** Yes, multiplicatively, with the Grader too. Worst-case 10-min active/idle with everything stacked:
- Streak 0.30: **1.69** on the worst seed; 1.64 in the worst-luck case (egg every 120 s, always frenzy).
- Streak 0.50: 1.91.
- **None break 2×**, so the largest tested cap that passes is ≥0.50. Recommended cap 0.40, for the band.

## Pass/fail summary (adopted values)
| check | result |
|---|---|
| Reference bot AC7: F18 18.88 min, L22 at 30:00, gap 1.75 min | PASS |
| TR-5 runs against `economy.m4-candidate.csv` | PASS |
| All mechanics: cap 2× (worst seed 1.69) | PASS |
| All mechanics: band 1.5–2× at streak 0.30 | FAIL at F10 and F18 (1.44 / 1.48). Fix: streak 0.40, which PASSES (1.54–1.65) |
| Golden egg alone ≤ cap; E1 vs +20% / +12% | PASS on the cap; E1 slightly under (+17% / +11%); eggs outcome dead at F ≥ 20 |
| Frenzy on all sales | Recommend yes |
| Pause exploit | PASS (none) |
| Focus vs Bulk, ability, completion bonus, leave penalty | PASS (neutral or small) |
| F22–24 managed/unmanaged, collectibles excluded | PASS (canonical 2.27 min; tracks 1.67) |

## v0.2 abilities in the full stack (2026-10-16, after 13:42; seeds 0–99, 10-min window)
**Setup:**
- Full stack at HoP's 13:42 values: 36/48 tracks, streak cap 0.40 (spec model), golden egg v0.3, frenzy ×2 for 30 s on all sales, the eggs reward paid as cash from F20, focus 0.10, completion bonus 0.05, leave penalty 0.05.
- The old ability is replaced by PM Workers' v0.2 abilities: Activate-all, 30 s every 300 s. Each ability works only while its worker is awake.
  - W1 Rush: ×k on W1's sales.
  - W2 Sweep: ×k on the laying rate.
  - W3 Shout: ×k on all sale prices.
  - W4 Inspect: +0.5 tier.
- Code: `sim/m4/m4_abv2_run.py`; output in `m4_abv2_out.md`. Cells are the optimal player's mean [worst seed] / the casual mean.

| abilities | F10 | F18 | F24 | worst seed | cap 2× | band (optimal means) |
|---|---|---|---|---|---|---|
| none | 1.57 [1.74] / 1.47 | 1.60 [1.79] / 1.47 | 1.64 [1.78] / 1.51 | 1.79 | PASS | PASS |
| **v0.2 ×1.10 all** | 1.62 [1.79] / 1.48 | 1.70 [1.92] / 1.50 | 1.68 [1.82] / 1.53 | 1.92 | PASS | PASS |
| **v0.2 ×1.15 all** | 1.64 [1.82] / 1.49 | 1.73 [1.95] / 1.51 | 1.69 [1.83] / 1.54 | 1.95 | PASS | PASS |
| **v0.2 1.10 / 1.15 / 1.25** | 1.65 [1.83] / 1.49 | 1.74 [1.97] / 1.51 | 1.71 [1.84] / 1.54 | 1.97 | PASS | PASS |
| v0.2 ×1.20 all | 1.67 [1.86] | 1.76 [1.98] | 1.71 [1.84] | 1.98 | PASS | PASS |
| v0.2 ×1.25 all | 1.70 [1.89] | 1.79 [2.01] | 1.72 [1.85] | 2.01 | FAIL | PASS |
| v0.2 ×1.15, worst luck (egg every 120 s, always frenzy) | 1.72 | 1.80 | 1.80 | 1.84 | PASS | PASS |

- **×1.15 passes:** worst seed 1.95, at F18.
- **Largest uniform size that passes the cap on the worst seed is ×1.20** (1.98). ×1.25 breaks it at 2.01.
- **Headroom is thin.** ×1.15 leaves 0.05 to the cap. ×1.10 keeps more margin, and the 1.10/1.15/1.25 mix sits at 1.97.
- **Casual player:** stays at 1.47–1.55, a little under the band floor at F10 and F18. The band is defined on optimal play.

---
# Migration v6 to v7 (M4-A, Fri Oct 16, 2026)
Script: `sim/m4/migration_v7.py` (imports `m4_active`, read-only). Output: `sim/m4/migration_v7_out.md`. 30 seeds, medians.

**Assumptions**
- **Typical save:**
  - Collection = F−3.
  - Every worker unlocked at that F is hired: W1 F3, W2 F7, W3 F8, and the Grader at its highest unlocked tier (F18+), all at 100% energy.
  - Coins 0 and the coop half full.
- **Players:**
  - seller15: taps 1/s and sells every 15 s.
  - casual: taps 0.5/s, sells every 20 s, Poisson arrivals, demand ×0.75.
  - Both refill workers at visits.
- **Mechanics:** golden egg, streak and abilities are off in both arms, so only the migration effect is measured.
- **v6:** F1 economy (`economy.f1.csv` farm costs with the F1-GAP rows) and the F1 buy rule (Farm, or Collection if it costs ≤ 0.5 × Farm).
- **v7:** `economy.m4-candidate.csv` (36/48 costs, caps F+3). Price option A, grades with Jumbo gated at F15, Balanced tiers, and Hens milestones applied immediately. The buyer is the greedy best-ROI buyer from `m4_active.prog` with workers added.
- **Skipped purchases:** the larger of (extra purchases in the first 60 s vs v6) and (extra Farm levels in 10 min vs v6).

## Result: migration as specced (H = V = F)
| save | eggs/s v6 → v7 | price v6 → v7 | TR-4 | income 0–1 min ×v6 (s15 / casual) | income 0–10 min ×v6 | purchases in 10 min v6 → v7 (s15) | skipped |
|---|---|---|---|---|---|---|---|
| F10 | 11.0 → 13.75 | 2.76 → 4.74 | PASS | ×1.68 / ×1.73 | ×3.20 / ×2.17 | 14 → 30 | 3 / 1 |
| F15 | 16.0 → 20.0 | 4.27 → 7.35 | PASS | ×1.76 / ×1.77 | ×3.45 / ×2.40 | 7 → 20 | 3 / 1 |
| F20 | 21.0 → 31.5 | 6.08 → 12.75 | PASS | ×2.30 / ×2.14 | ×3.89 / ×2.71 | 4 → 18 | 2 / 1 |

**The price jump is ×1.72–2.10, not +36%.** The +12%/level moves onto V = F (not C = F−3), and on top of that come the V10/V20 grade (×1.25 / ×1.5 Jumbo) and the Balanced tier (min = F, +15–25%). Hens milestones add ×1.25–1.5 eggs/s, but demand mostly binds that.

**Two separate effects**
1. **The migration jump** (minute 0–1, state at load) fails the ~1.5× limit at every save. A cap can fix this.
2. **Faster progress over 0–10 min (×2–3.9) and many more purchases.** This comes from the v7 economy, not the migration: Hens and Egg value sit 3 levels below their F+3 cap, those levels cost far less than Farm, and the buyer tops them up. It's present under every cap, and lower caps make it worse because they add more cheap catch-up levels. A diagnostic run with the v7 state but v6 buying behaviour (`:v6buy` rows) shows the 0–10 min ratio falls to ×1.03–1.41 under the Egg value cap below.

## Caps tried (seller15 / casual, income 0–1 min ×v6)
| cap | F10 | F15 | F20 | TR-4 |
|---|---|---|---|---|
| H = V = F (as specced) | 1.68 / 1.73 | 1.76 / 1.77 | 2.30 / 2.14 | PASS |
| V = F−1 | 1.51 / 1.49 | 1.64 / 1.60 | 1.95 / 1.76 | PASS |
| V = F−2 | 1.37 / 1.41 | 1.60 / 1.50 | 1.81 / 1.53 | PASS |
| V = F−3 | 1.31 / 1.23 | 1.50 / 1.40 | 1.71 / 1.48 | PASS |
| V = F−4 | 1.18 / 1.07 | 1.37 / 1.32 | 1.51 / 1.39 | **FAIL at F10** (price 2.71 < 2.76) |
| H = V = F−k (k = 1–3) | — | — | — | **FAIL at F10** (eggs/s 10.0 or lower < 11.0) |
| **V₀ = smallest V with v7 price ≥ v6 price, H = F** | **1.31 / 1.23 (V7)** | **1.32 / 1.24 (V10)** | **1.37 / 1.23 (V14)** | **PASS** |

- **No fixed F−k works at every save.** F−3 still fails at F20, and F−4 breaks TR-4 at F10. Lowering H breaks TR-4 on eggs/s at F10, so H must stay at F.
- **Proposed cap (smallest one that passes everywhere):** "cap the starting Egg value". Set H = F and V₀ = the smallest V whose v7 unit price (before the Grader) is ≥ the pre-migration price. That gives V₀ = F−3 / F−5 / F−6 at F10 / F15 / F20.
  - The jump becomes ×1.23–1.37, TR-4 passes by construction, and it's a deterministic one-line rule.
  - The extra levels (F−V₀) can be refunded under the existing M4A-29 cap-and-refund path, or left for the player to buy back.
  - With v6 buying behaviour, skipped purchases are 0–1 (`Vmatch:v6buy`).
- **Not solved by any migration cap:** with the greedy v7 buyer, 0–10 min income stays ×2.0–3.5 and the player makes 2–4 purchases in the first minute (catch-up Hens/Egg value levels). This is a property of v7 for any save sitting below the F+3 caps. **For HoP / PM Farm Upgrades to decide:** accept it as the "upgrades got an upgrade" moment, or measure it against a native v7 player at the same F rather than against v6.

## CSV columns added for QA's M4-A gate (G1)
Added to `product/economy.m4-candidate.csv` as constant columns (same value on every row, CRLF kept). Backup of the previous file: `/tmp/economy.m4-candidate.pre-g1.csv`. The existing `hens_cost`, `egg_value_cost`, `hens_cap_over_farm` and `egg_value_cap_over_farm` columns are present and unchanged. `farm/m4/tr5_run.py --csv ../../economy.m4-candidate.csv` still gives **RESULT: PASS** (F18 18.88, L22, gap 1.75).
- **Hens milestones (× coop size and × offline eggs, NOT lay rate; M1 fix, HoP 2026-10-16 14:45):**
  - `hens_ms1_level`=10, `hens_ms1_coop_mult`=`hens_ms1_offline_mult`=1.25
  - `hens_ms2_level`=20, `hens_ms2_coop_mult`=`hens_ms2_offline_mult`=1.5
  - `hens_ms3_level`=30, `hens_ms3_coop_mult`=`hens_ms3_offline_mult`=2.0
  - (was `hens_msK_mult` on eggs/s; that made Hens payback ∞ at F10–29 and the greedy buyer stopped at H11.)
- **Egg grades (× price, highest qualifying applies):**
  - `egg_grade1_level`=5, `egg_grade1_mult`=1.1, `egg_grade1_farm_gate`=0
  - `egg_grade2_level`=10, `egg_grade2_mult`=1.25, `egg_grade2_farm_gate`=0
  - `egg_grade3_level`=20, `egg_grade3_mult`=1.5, `egg_grade3_farm_gate`=15 (Jumbo)
- **Balanced tiers on min(F,H,V) (× price):** `balanced1..5_level`=5/10/15/20/25 and `balanced1..5_mult`=1.1/1.15/1.2/1.25/1.3.
- **TR-6 price terms:** price = (1 + `egg_value_base_step`·V)(1 + `egg_value_level_bonus`·V), with `egg_value_base_step`=0.05 and `egg_value_level_bonus`=0.12.
- **Naming:** the spec's G1 suggested list names (`hens_ms_levels`, `egg_grade_mult` and so on). I used one numbered scalar column per value instead, because a list inside a CSV cell would need quoting and would break per-row float parsers.

## M4-A review update (2026-10-16, HoP decisions 14:45; details product/m4a-review-response.md)
- **Migration V (B1, grandfather):** V₀ = smallest V in 0..30 whose v7 price ≥ v6 price, **with no min(F+3,30) cap at migration**. Afterwards the F+3 cap only blocks further V purchases until F+3 > V (the buy stays disabled while V ≥ F+3). No new save field; per M4A-27 the load validator clamps only above level 30, so the migrated V survives a reload. The C ≥ F+5 test saves run with the Grader off. Needed because v6 never tied Collection to Farm (cheapest-first reaches C = F+5); 186/961 (F,C) saves otherwise lose price.
- **New fixtures (H = F):** F0/C5 $1.60→V4 $1.78; F1/C6 $1.81→V5 $2.20; F3/C10 $2.53→V7 $2.73; F5/C14 $3.35→V9 $3.65; F13/C30 $7.59→V17 $8.08; plus the C = F−3 set F10/C7→V7, F15/C12→V10, F20/C17→V14.
- **Rounding:** compare v6 and v7 prices in integer cents with one half-up rounding step (F20/C17: V13 = 6.072 → 607¢ < 608¢, so V14).
- **M2 accepted:** with the Hens fix the static first-minute income ratio is ≤1.35× on all 961 saves (F12/C1 1.35×; fixtures 1.09/1.11/1.08×); the dynamic catch-up burst stays the accepted 10-min burst.
- **Hens milestones:** coop size + offline eggs only (see above). Active/idle (ALL, streak 0.40) 1.53/1.58/1.61 at F10/18/24. TR-5 30 min PASS (F18 20.75 min, L21 @30, worst gap 1.50 min).
- **Top-end stack:** ×7.8 incl. Balanced.

### Pacing band at 30:00 (HoP 14:58)
- No workers: Farm L18-22. With workers: Farm L20-24. tr5_run checks must apply the band that matches the scenario.
