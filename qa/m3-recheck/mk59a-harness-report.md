# MK-59a harness: validation report — **STOPPED: validation FAILED**
Date: 2026-10-17 ~08:40 CEST. Option (a), approved by Head of QA. No browser.
Harness: qa/m3-recheck/mk59a-harness/ (harness.ts, pyrandom.ts, aggregate.py). Scratch checkout: /tmp/qa-mk59a/egg-farm at origin/main **acaceee** (2026-10-17 08:08 CEST), nothing pushed. Runs used 2 workers under nice.
Run: `cd /tmp/qa-mk59a/egg-farm && REPO=$PWD node_modules/.bin/vite-node <harness>/harness.ts -- 1 50 a.json` (and 51–100), then `python3 aggregate.py base a.json b.json`.

## What the harness does
- Shipped sim: `step()` from src/sim/tick.ts, `apply()` from actions.ts, balance.json (data/economy.csv sha256 86f0e80e3593 = the pin), tickHz 10 (0.1 s ticks), `sim_test.poisson_arrivals = true` (VAR_DEFAULT poisson=True).
- Player: seller15 ported from svs_mh.py `run_m2`, with var = VAR_DEFAULT:
  - lognormal check-in, median 15 s, σ 0.35, clamped 5–60 s;
  - tap skill lognormal σ 0.15, clamped 0.6–1.4, ±25% jitter;
  - p_delay 0.10, p_cheap_first 0.10;
  - hires Market Hand, Coop Hand and Hawker, plus Grader tiers, when affordable, then Farm-first with the 50% Collection rule;
  - manages at ≤ manage_prompt_threshold × 100, using Manage all when 3+ workers are hired.
- Variance RNG: a bit-exact port of Python `random.Random` (MT19937 init_by_array, random(), Kinderman–Monahan lognormvariate, uniform). Verified identical to CPython for seed 1 (1.102022721525997 / 0.0837279035319809 / 1.2454438829742578).
- Seeds 1–100, T 3,600 s. Served % = served customers ÷ spawned (arrivals + full-queue losses), bucketed by Farm level at arrival, pooled across seeds.

## Result vs Economy base (t2_lc1.json prog/base)
| L | harness | Economy | diff |
|---|---|---|---|
| 3 | 91.20 | 92.96 | −1.76 |
| 5 | 88.24 | 91.28 | −3.04 |
| 9 | 62.54 | 68.44 | −5.90 |
| 10 | 62.96 | 60.13 | +2.83 |
| 16 | 64.80 | 64.88 | −0.08 |
| 18 | 65.69 | 67.55 | −1.86 |
| 19 | 66.20 | 67.19 | −0.99 |
| **20** | **65.94** | **68.33** | **−2.39 (gate ±0.1 → FAIL)** |
| 21 | 66.33 | 69.13 | −2.80 |
| 22 | 66.02 | 68.49 | −2.47 |
| 25 | 65.80 | 68.58 | −2.78 |
All levels: see mk59a-harness/validate-main-acaceee.txt. 21 of 23 levels are lower, mean about −2.2 pts. Pacing agrees: L@30 min P5 = 20 (Economy 20), median 21.

## Why it doesn't match (in order of likely impact)
1. **market_hand_min_wait_s = 2 is in data/economy.csv but not implemented in src/sim** (tick.ts has no min-wait or hold_until_servable code). Economy's "base" uses defer = 2 with hold_until_servable (spec_from_csv). So Economy's baseline is not "pre-feature main"; it models a min-wait that the shipped game doesn't have. This is a systematic difference.
2. **Demand/arrival RNG:** the game uses xorshift32 with mixSeed in GameState; Python uses `random.Random(seed)` (expovariate, randint). Same seed numbers, different customer streams. This can't be aligned without changing either the game or the sim.
3. **Noise floor:** a bootstrap over the 100 harness seeds gives an L20 95% CI of **64.67–67.29 (±1.3 pts)** on 10,496 L20 spawns. A ±0.1-pt reproduction is not achievable from a different random stream even with identical logic. By the same measure, Economy's −0.48 at L20 is inside the noise, so a −0.5 bar on one 100-seed run can't tell pass from fail.
4. Tick order: the game runs Market Hand inside `step()` before the player's tap and Sell; Python order is tap → Coop Hand → player Sell → Market Hand. Wage edge cases also differ: Python pays min(coins, wage), while the game goes Unpaid.
5. Small modelling details: Python takes spawn level f before buying; full-queue arrivals are counted the same way in both.

## Not done (per the STOP rule)
- No post-feature run. Also, no hold/trickle branch or merged commit exists on origin (67 remote branches checked; nothing matching hold/trickle/market-hand); the feature isn't built yet.
- Only the *pre-feature* validation was run.

## Recommendation
- Define MK-59a as a **paired** comparison inside one sim: same seeds, base vs hold on the shipped code. Use common random numbers and a paired-difference CI. Gate on "Δ L20 ≥ −0.5 pts, or the CI upper bound ≥ −0.5" instead of reproducing Economy's absolute 68.33.
- Economy to say whether min_wait 2 should be in the shipped baseline (engineering gap) or dropped from their base.
- Increase seeds (e.g. 400) if a −0.5 bar must be separable from noise. The single-run SE at L20 is about 0.65 pts.

## Update 08:31: method change and power (Head of QA)
Method: paired base vs hold, shipped code, game RNG, same seeds, 400 seeds. No match to 68.33 required. Verdict rules A/B/A′ were pending at this timestamp; **superseded by HoP 08:43** (see below).
### Noise measurement (power.py, power-results.txt)
- The feature isn't built, so I used a stand-in perturbed variant: Market Hand every_s 1.0 → 1.2 (via the harness env MH_EVERY; balance only, no code change). I ran 400 paired seeds on main acaceee.
- L20: per-seed paired-diff SD **7.24 pts**; unpaired per-seed SD 6.75; **base↔variant correlation only 0.39** (trajectories diverge after the first different Market Hand action, so game-RNG pairing removes little noise). SE at L20: 0.42 (300 seeds), 0.36 (400).
- Other levels: paired SD median 9.1, range 2.5–20.6 pts.
### Power simulation (4,000 resamples of the 400 measured seeds, centred, plus assumed true effects)
Assumptions:
- true L20 = −0.48;
- other levels' true effect = Economy's hold5−base from t2_lc1.json (L14–25 range −0.33 to +0.82; L3–13 are 0 in that file);
- the stand-in's noise structure matches the real hold feature;
- 95% CI = ±1.96 × SE.
| seeds | P(pass A) | P(pass B) |
|---|---|---|
| 100 | 0.11 | 0.00 |
| 300 | **0.24** | **0.00** |
| 400 | **0.31** | **0.00** |
- Sensitivity check, with only L20 at −0.48 and all other levels 0: B is still 0.00 at 300 and 400 seeds.
- Why A is low: it needs mean ≥ −1.0 + 1.96·SE (= −0.18 at 300, −0.29 at 400), which is above the assumed −0.48.
- Why B can't pass: even with a true effect of 0, the worst level's lower bound is about −1.96 × SE_max. Getting that to −0.5 needs SE ≤ 0.26 at every level, i.e. about 1,300 seeds for the median level and about 6,500 for the noisiest (SD 20.6).
- For reference, A with a true effect of 0 at 400 seeds: about 0.79 (analytic).

## MK-59a verdict (HoP 08:43 + 08:45 CEST): non-inferiority — LOCKED
Options A, B and A′ are **superseded**.

### Method
- Paired **base vs hold** on shipped code, game RNG, seeds **1–400**, seller15, 3,600 s, 0.1 s ticks.
- **Base side** = Features' merged min_wait build (min_wait 2 s wired).
- Hold side = same build with the Market Hand hold feature on.
- No absolute match to Economy's 68.33.

### Pass rule
- **PASS** if the lower 95% bound of the **L20** mean served-% diff is **≥ −2.0** points.
- Equivalently (at stand-in SE 0.36): measured mean ≥ **−1.29**.
- L20 mean diff: **info only**. L3–L25: per-level guard with 1,600-seed confirmation (HoP 08:45 — LOCKED; see below).
- Always required: wage/min unchanged, income/min within ±0.5%, F2 median Market Hand sale ≥ 8.

### Power at SE 0.36 (stand-in every_s 1.0→1.2 noise; analytic / resampled)
| true L20 effect | P(pass) |
|---|---|
| 0 | 1.00 |
| −0.48 | 0.988 |
| −1.0 | 0.79 |
| −1.5 | 0.28 |
| −2.0 | 0.025 |

### Caveat
Re-check the paired SD on the **real hold build**. If it differs materially from the stand-in SE 0.36, report to HoP before locking a run verdict. Why the bar: catch a player-felt regression (~2 pts), not certify a −0.5 effect the noise can't resolve.

## Per-level guard (HoP 08:45 CEST) — LOCKED
**Final ruling (HoP 08:45 CEST, option 2 generalized):** if any level L3–L25 has a **400-seed** mean served-% diff **< −2.0** pts, **rerun that level at 1,600 paired seeds**; it **FAILS only if the rerun mean is still < −2.0**. Applies to **every** level L3–L25 (one rule; not L9–L13 only). L20 mean = info. L20 non-inferiority gate (lower 95% bound ≥ −2.0) unchanged from HoP 08:43.

Screen-stage power at 400 seeds (guard.py; before confirmation): resample 400 of the 400 measured stand-in seeds with replacement, 20,000×; centre on observed diff; add true effects; joint min over 23 levels (keeps cross-level correlation; agrees with independence analytic within 0.1 pt).
| scenario | P(screen trip at 400) | P(L20 LB ≥ −2) | P(full served gate PASS, no confirmation) |
|---|---|---|---|
| (a) all true 0 | 0.097 | 0.9995 | 0.903 |
| (b) Economy t2_lc1 hold5−base | 0.093 | 0.985 | 0.894 |
Worst-level share of screen trips: L10 ~27%, L12 ~24%, L9 ~21%, L11 ~17%, L13 ~5%; L14–L25 ≈ 0. L9–L12 have per-seed paired SD 19–21 (SE 0.95–1.03), so each has P(mean < −2) ≈ 2–3% at n=400. The 1,600-seed confirmation is what makes the guard usable (HoP: earlier "essentially never" assumed SE ≈0.36; measured SEs correct that).

**Caveat:** stand-in noise; **re-measure paired SDs on the real hold build** and report to HoP if they differ materially.

Raw output (mk59a-harness/guard-results.txt):
```
per-level per-seed paired SD and SE (n=400):
  L3: SD 2.47  SE 0.123
  L4: SD 7.22  SE 0.361
  L5: SD 9.07  SE 0.454
  L6: SD 12.01  SE 0.600
  L7: SD 12.37  SE 0.619
  L8: SD 12.73  SE 0.636
  L9: SD 19.83  SE 0.991
  L10: SD 20.61  SE 1.030
  L11: SD 18.91  SE 0.946
  L12: SD 20.16  SE 1.008
  L13: SD 15.77  SE 0.788
  L14: SD 15.14  SE 0.757
  L15: SD 13.63  SE 0.682
  L16: SD 10.49  SE 0.524
  L17: SD 8.17  SE 0.409
  L18: SD 7.87  SE 0.393
  L19: SD 6.85  SE 0.343
  L20: SD 7.24  SE 0.362
  L21: SD 5.53  SE 0.276
  L22: SD 6.00  SE 0.300
  L23: SD 5.92  SE 0.296
  L24: SD 6.19  SE 0.309
  L25: SD 6.45  SE 0.323

[a: all true 0] P(guard false-fail)=0.0968 (indep. analytic 0.0980); P(L20 LB>=-2)=0.9995; P(full served gate PASS)=0.9028
  L10: marginal trip 0.0273, worst-level share of fails 0.27 (analytic 0.0261)
  L12: marginal trip 0.0236, worst-level share of fails 0.24 (analytic 0.0236)
  L9: marginal trip 0.0212, worst-level share of fails 0.21 (analytic 0.0218)
  L11: marginal trip 0.0164, worst-level share of fails 0.16 (analytic 0.0172)
  L13: marginal trip 0.0066, worst-level share of fails 0.06 (analytic 0.0056)
  L14: marginal trip 0.0037, worst-level share of fails 0.03 (analytic 0.0041)

[b: Economy t2_lc1 hold5-base] P(guard false-fail)=0.0926 (indep. analytic 0.0930); P(L20 LB>=-2)=0.9851; P(full served gate PASS)=0.8940
  L10: marginal trip 0.0274, worst-level share of fails 0.28 (analytic 0.0261)
  L12: marginal trip 0.0237, worst-level share of fails 0.25 (analytic 0.0236)
  L9: marginal trip 0.0208, worst-level share of fails 0.22 (analytic 0.0218)
  L11: marginal trip 0.0185, worst-level share of fails 0.18 (analytic 0.0172)
  L13: marginal trip 0.0052, worst-level share of fails 0.05 (analytic 0.0056)
  L8: marginal trip 0.0007, worst-level share of fails 0.01 (analytic 0.0008)
```
