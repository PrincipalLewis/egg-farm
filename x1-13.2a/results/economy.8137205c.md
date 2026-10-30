# v2 research slice: Economy (tap share, active-reward options and budget, economy gates)
Economy/Balance Designer · 2026-10-24 · for Head of Product · task D-CEO-20261024-05 (research + PM only)
**Status: DRAFT for HoP review. No CSV change.** `product/economy.csv` is untouched (sha c7bb783f…, 123 cols, 31 rows). No code, no PRs, no commits. Every number below is a model output or a proposal. Nothing here is approved.

## 0. Executive summary
1. **Tap share at L10 is 0%.** Once the Coop Hand is hired, a tap creates no eggs and no coins. Income at L10 is $72.8/s at 0, 1 or 3 taps/s. Sim (100 seeds) agrees: L30 lands at 49.7 / 49.7 / 49.6 min for 0 / 1 / 3 taps/s. The binding curve is `eggs_per_sec`[Hens], and the Coop Hand already collects 2.1× that. Golden eggs add 0% today because they were never built (`tc_*` is carried, but no code reads it).
2. **The dead zone is a lack of agency, not waiting.** From L10–30, buys come every 30 s (median; P90 58 s, worst 151 s), and the longest stretch with nothing affordable is 111 s (median), P90 152–182 s, worst 305 s. Between buys, no action changes the outcome. Another hidden cost: about 26% of L0–30 spend goes on Collection levels that add nothing once the Coop Hand is hired.
3. **Recommendation: Option B.** Build golden egg v0.5 at 90–210 s gaps with 60 s cash, plus a small tap streak capped at 0.15. That puts the engaged share at **28–32%** (target 25–40%) and moves the active path to L30 22–26% sooner. The idle path is unchanged (L30 49.7 min). AC7 has to be split into an idle bot of record and an active bot, because the AC7 bot taps.
4. **G3 (M5.0 full stack): the window gate PASSES on the harness definition, on the shipping CSV** (SCRATCH `m5x.ts`; final draft 8dc90e2b, L0–30 only; every 10-minute window, seeds 1–200; Sweep A; I_ss = 0 stall rule; §13.2a). Two labelled approximations: **window starts every 300 s** (A1) and **mechanic timers reset per window** (A2). The worst seed is **1.936** (optimal, frenzy-holder) against ≤ 2.25, and the P95 of per-seed worst windows is ≤ 1.813 against ≤ 2.00, for every profile × call policy.
   - **Step deltas vs the no-mechanics baseline (same CSV and seeds):** the L11–30 per-level step P95 *falls* by 0.55–0.97 (limit +0.10). G4 nothing-affordable shortens at every percentile (worst 196–294 s vs baseline 226–381 s); the absolute ≤ 180 s fails for the baseline too (pre-existing).
   - The harness of record (a05bc74) can't model the M5.0 mechanics. On the mechanic-free draft it shows **no regression vs c7bb783f** (play-equivalence 200/200, identical pacing; §13.2).
   - The harness re-measure becomes CI merge gate **AC-X1**, check **`pacing-x1-stack`** (HoE), ±20% vs the §13.2a prediction table, including a G5-P pause-driver summary row. It runs on every PR and merge on the whole enabled stack plus each flag's off/on delta; Y rows fail, N rows warn; required after Vadim's go.
   - **Active budget:** median premium +47 to +65% vs the +50% cap (optimal +58 to +65%, seller15 +52 to +59%, casual +47 to +55%), accepted under D-HOP-21 because G1 holds.
   - **Known risk (T3 lineage, not X1):** the L30+ step P95 rises **+0.21 to +0.85** over the no-mechanics baseline, which already fails (pre-existing). Re-check after the reshape.
   - **Rulings D-HOP-16:** Sweep A; lockout 45; G5-P PASS with the full-coop outlier accepted (**withdrawn by D-HOP-33; Pause now passes the strict band with fix (ii), §12a**); `tc_broody_*`; asleep share 0.15.
   - **Final draft** 8dc90e2b (152 cols, 29 added, 2 value changes), not applied.
5. **Other answers:**
   - **Golden egg v0.5 as specced, on T3:** the engaged share is 12.5–15.8% and L50 comes 13–16% sooner. The "more frequent" option (60–150 s) gives 21.7–26.9%, 21–26% sooner. **P1 is budget-neutral against the approved stack** (share 26.5% vs 28.6% at F18). But every stack, the no-mechanic baseline included, fails the L30+ step gate on T3 (baseline P95 2.60). L30+ needs reshaping first, so active features get a delta gate of +0.10.
   - Shift Calls cost 10 is sustainable with 3 workers (0% Tired). With 4 workers it leaves 14.6% of worker-time Tired, which `charge_regen_s` 120 cuts to 2.5%.
   - Shared active budget: +50% for an optimal player at L10+. The M5.0 stack alone measures +47 to +65% (accepted, D-HOP-21), which leaves no headroom for Order Board or Rush Hour (§6.1).
   - Coop Hand asleep share: the M5.0 effective value is **0** (no reader). The CSV's 0.20 is stale; **ruled 0.15** (D-HOP-16 (6)), in the draft and not applied.
   - The E1–E6 beat gates need re-timing: F10–14 are only 1.6–2.0 min apart.

**Provenance (all sims SCRATCH):**
- Runner: `scratch/v2-econ/h/econ-v2.ts`, a port of `tests/bot-m2.ts` `runM2`. It uses seller15 with the `pickM4All` wait rule, the `VAR_DEFAULT` Poisson/variance bot and managed play.
- Code: snapshot of `wt-m41-integrated` a05bc74 (the D-CEO-16 harness head), taken with `git archive` into `scratch/v2-econ/h/`. src is unchanged.
- Main CSV: `product/economy.csv` c7bb783f.
- T3 CSV: `scratch/v2-econ/t3-splice.csv` sha256 366d3a04f6a3ff88…eb1941. It is rows L0–30 from `product/economy.csv` plus L31–55 and `hv_extra_cost_farm_share` from `scratch/m4-retune/handoff-T3j/ev/N0b_C150.csv` c249723c…. The only L0–30 difference from N0b is that its eased `collection_cost` L24–27 is replaced by main's.
- Seeds 1–100, except P1, which uses seeds 0–99. Horizons: T = 5400 s main, 14400 s T3.
- Commands: `cd scratch/v2-econ/h && SEEDS=100 T=5400 CFG=<none|A|B|Bcsv|C> TAPS=idle,ac7,1,3 node_modules/.bin/vite-node main.ts`; `… main-t3.ts` (CFG none,spec,freq,freqCap); `… main-p1.ts` (S0=0); `… main-asleep.ts`; `python3 scratch/v2-econ/analytic.py`; `python3 scratch/v2-econ/energy.py`. Raw output is in `scratch/v2-econ/out/`.
- **Mechanics are layered in the runner only.** None of them exists in src. Labels: **SIM** = 100-seed runner; **MODEL** = closed-form from the CSV and code; **ESTIMATE** = judgement or arithmetic not simulated.

**Player profiles used throughout**

| Profile | Taps | Check-ins | Golden eggs caught (ESTIMATE) |
|---|---|---|---|
| idle | AC7 taps until the Coop Hand is hired, then 0 | VAR_DEFAULT ≈15 s | 0 |
| ac7 / seller15 | `VAR_DEFAULT` ≈1 tap/s | ≈15 s | 75% |
| 1 / 3 taps/s | fixed rate | ≈15 s | 75% / 95% |
| optimal (P1) | 3/s | ≈5 s | 100% |
| casual (P1) | 0.5/s | ≈30 s | 60% |

---

## 1. Today's state

### 1.1 Income per second by source (MODEL)
- **Model:** `src/econ/income.ts:378-380`, income = min(prod, demand, collect) × price − wages.
  - prod = `eggs_per_sec`[H] (`tracks.ts` prodEggsPerSec → `formulas.ts:164`).
  - demand = mean(`demand_min`, `demand_max`)[F] / `customer_interval_s`[F] × `w3_demand_mult` 1.25 with the Hawker (`income.ts:355-360`, `workers.ts` hawkerDemandMult).
  - collect = taps × `eggs_per_tap`[C] + Coop Hand `eggs_per_tap`[C] / `w2_every_s` (2) (`tick.ts:84-86`).
  - price = (1 + `egg_value_base_step`·V)(1 + `egg_value_level_bonus`·V) × grade × Balanced × Grader (`formulas.ts:169-172`, `workers.ts` graderMult).
  - wages = 0.25F + 0.5F $/min (`w1_wage_per_min`, `w2_wage_per_min`).
- **States:** median bot state on arrival at each Farm level (SIM, ac7, 100 seeds).

| Farm L | Bot state (C, H, V, Grader tier, hires) | Prod eggs/s | Demand eggs/s | Collect, 0 taps (Coop Hand) | Collect, 1 tap/s | Price $ | **$/s, 0 taps** | **$/s, 1 tap/s** | **$/s, 3 taps/s** | **Marginal tap share** |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 4, 3, 3, 0, none | 4.0 | 2.53 | 0 | 25 | 1.56 | **0.00** | 3.94 | 3.94 | 100% (income needs taps), but 0.1 tap/s also gives $3.94/s |
| 10 | 10, 12, 12, 0, W1–W3 | 13.0 | 16.72 | 27.5 | 82.5 | 5.61 | **72.81** | 72.81 | 72.81 | **0%** |
| 20 | 16, 22, 20, 2, W1–W4 | 23.0 | 32.12 | 42.5 | 127.5 | 25.50 | **586.25** | 586.25 | 586.25 | **0%** |
| 30 | 23, 30, 30, 5, W1–W4 | 31.0 | 47.08 | 60.0 | 180 | 89.68 | **2,779.7** | 2,779.7 | 2,779.7 | **0%** |

- **Golden egg today: 0%.**
  - Every `tc_*` column (`tc_egg_gap_min_s` 120 … `tc_streak_cap` 0.4) is carried into `balance.json` `m4.tc`, which is marked "unused by M4-A code" (`formulas.ts:58`).
  - `payout.ts:8-10` applies only the Grader multiplier.
  - The golden egg, streak, frenzy and abilities exist only in specs.
- **Attribution vs marginal (SIM):**
  - Taps carry 70–90% of the eggs moved (ac7 73%, 3 taps/s 90%) because they reach the coop before the Coop Hand does.
  - Removing the taps changes nothing, because the Coop Hand would have moved the same eggs.
  - Pacing: idle / 1 tap/s / 3 taps/s reach L18 at 20.9 / 20.8 / 20.6 min and L30 at 49.7 / 49.7 / 49.6 min.

### 1.2 Why tapping is useless at L10
| # | Cause | Trace |
|---|---|---|
| 1 | A tap only moves `min(coop, eggs_per_tap[C])` eggs from the coop to the basket. It creates no eggs and no coins. | `actions.ts:57` (case 'collect') |
| 2 | Supply is `eggs_per_sec`[H] (Hens track: 13 at H12). Income is the minimum of production, demand and collection. | `income.ts:379`, `formulas.ts:164` |
| 3 | `eggs_per_tap` = 5 + 5C, and the Coop Hand moves half of that every 2 s: 27.5 eggs/s at C10, **2.1×** production. Collection stops binding at C ≥ ≈0.4·H. | CSV `eggs_per_tap`, `w2_every_s` 2; `tick.ts:84-86` |
| 4 | The Market Hand serves the whole queue every 1 s, and patience is 30 s, so selling by hand is also non-binding. | `w1_every_s` 1, `customer_patience_s` 30; `tick.ts:87` |
| 5 | Under M4, Collection gives no price bonus (`formulas.ts:167-168`, "Collection never enters"). Collection L12+ is therefore dead spend for a worker player. The bot still buys up to C23 by F30 through depth-3 bundles (`best-buy.ts:113-151`). Σ`collection_cost`[0..22] = 825k of a 3.13M L0–30 total spend ≈ **26%** (MODEL). | CSV `collection_cost` |

**The curve that makes taps vanish:** `eggs_per_tap` (Collection) starts above `eggs_per_sec` and grows at the same +5/level. The W2 Coop Hand then automates the only tap verb. No tunable makes a tap worth coins.

### 1.3 Dead zone, L10–30 (SIM, main CSV, seeds 1–100, T 5400)
| Profile | Gap between buys: median / P90 / worst (s) | Longest gap per seed: median / worst (s) | Longest stretch with nothing affordable: median / P90 / worst (s) | Median stretch with nothing affordable (s) | L10 / L18 / L25 / L30 (median min) |
|---|---|---|---|---|---|
| idle (0 taps after W2) | 29.9 / 57.7 / 150.9 | 121.5 / 150.9 | 111 / 182 / 4134* | 20 | 10.4 / 20.9 / 36.1 / 49.7 |
| ac7 (≈1 tap/s) | 30.0 / 58.1 / 146.1 | 121.5 / 146.1 | 109 / 152 / 305 | 20 | 10.4 / 20.8 / 36.1 / 49.6 |
| 3 taps/s | 29.8 / 57.3 / 153.9 | 122.0 / 153.9 | 111 / 173 / 225 | 20 | 10.4 / 20.6 / 36.0 / 49.6 |

\*One idle seed (of 100) never reached L30 in 90 min. This is an artefact of the idle profile (no taps and no catch-up).

- **Reading:** the profiles are identical, so active play buys nothing.
- The gap gates (≤180 s) pass at the median and fail only in the tail.
- The problem Vadim felt is agency: for 30 s between buys, no available action changes the outcome.
- On T3 L30+ (§7) the longest stretch with nothing affordable is 305 s median and 582 s worst. That is the known parked L30+ reshape (G4).

---

## 2. Options to make active play worth 25–40%
- **Common rules:**
  - Every reward is priced in **seconds of current income**, so it scales with no per-level tuning.
  - Nothing pays offline or for a player who is away (catch 0 for idle). The offline cap (`offline_max_eggs_2h`, 7200 s × 0.25) is untouched.
  - Share = mechanic coins / (mechanic + sale coins) at F ≥ 10.
- **New tunable names** below are proposals; values are per-level constants unless stated.

| Option | New tunables (proposal) | Share at L10–30, ac7 / 3 taps/s (SIM; median, P5–P95 in brackets) | L18 (ac7 / 3 tps) | L30 (ac7 / 3 tps) | Active speed-up at L30 vs idle 49.7 | Idle L30 | Max time on one level, L18–25 (3 tps) |
|---|---|---|---|---|---|---|---|
| — baseline | — | 0 / 0 | 20.8 / 20.6 | 49.6 / 49.6 | 0% | 49.7 | 3.2 min |
| **A: tap cash** | `tap_income_share` 0.12 (coins = 0.12 × income/s per counted tap), `tap_count_max_per_s` 3, `tap_cash_unlock_farm` 8 | 11% (9–14) / 26% | 19.4 / 17.4 | 45.2 / 38.8 | −9% / −22% | 49.7 | 2.4 |
| **B: golden egg + small streak (recommended)** | Golden egg per spec v0.5 but `tc_egg_gap_min_s`/`max_s` **90/210**, `tc_egg_cash_s` **60**; `tc_streak_cap` **0.15** (+1%/tap, ≤1 counted tap/s, hold 3 s, decay 3%/s) | 28% (25–31) / 32% (29–33) | 17.3 / 16.8 | 38.2 / 36.8 | −23% / −26% | 49.7 | 2.4 |
| B-csv (reference) | `tc_*` as in the CSV today: gap 120–300, cash 45 s, streak cap 0.40 | 36% / 37% | 16.3 / 16.1 | 35.1 / 34.3 | −29% / −31% | 49.7 | 2.3 |
| **C: golden egg + Rush meter** | CSV golden egg + `rush_meter_taps` 120 counted taps (≤2/s) → ×2 sale value for `rush_s` 20 | 23% / 31% | 18.1 / 16.9 | 40.7 / 37.1 | −18% / −25% | 49.7 | 2.5 |

**Why B:**
1. It reuses the golden-egg spec, which HoP made an M4 must-have (spec v0.5, never built).
2. It rewards presence at intervals rather than tap-spam. Casual play still earns 25%.
3. It lands mid-band (28–32%).
4. The streak at cap 0.15 is the only continuous-tap lever, and it is kept small, so Vadim's tap becomes *visible* value (see §8: P1 swaps more of it into per-tap coins).

**Caps:**
- Active path ≥ 0.70 × idle time to L18/L25/L30, i.e. a speed-up of at most 30%. B is at −23 to −26%.
- Engaged share ≤ 40%.
- The CEO's 10-min window rule (≤ 2.0× idle, worst seed) stays.
- The offline cap is untouched.

**AC7 consequence:**
- The AC7 bot taps about once a second, so B moves its L18 from 20.8 to 17.3 min. L10 P95 stays inside 12.1 (11.8).
- **AC7 bands must be gated on an idle bot of record** (no taps after W2, no catches). That bot is unchanged by every option.
- A separate **active-bot band** should be added: L30 at 0.70–0.80 × idle.

---

## 3. Economy approval checklist for any new mechanic
**Who:** the PM proposes (with numbers), Economy models and signs the card, and HoP approves. CEO-level caps (2.0×) need the CEO. Every change gets a balance change log entry and a decisions.md entry.

| # | Gate | Threshold | Measured on |
|---|---|---|---|
| G1 | Idle path unchanged | Idle bot (no taps after W2, no catches, no abilities): L10 / L18 / L25 / L30 within ±2% of the CSV baseline; AC7 D-CEO-04 gates pass (L10 P95 ≤ 12.1, fastest ≥ 7.8; L@30 min bands) | Seeds 1–200 + 201–300 on QA's TS bot of record (`tests/bot.ts`, `tests/bot-m2.ts`) |
| G2 | AC7 pacing band, active bot | Active-bot L18 / L25 / L30 within ±20% of the target, and ≥ 0.70 × idle time (speed-up ≤ 30%) | Same seeds |
| G3 | Active premium | Engaged share 25–40% (premium +33–67%); optimal worst-seed 10-min window ≤ 2.0× idle (CEO); casual ≥ 50% of the optimal premium | F10 / F18 / F24 / L30+ checkpoints, 100+ seeds |
| G4 | Step ratio | P95 ≤ 2.00, worst ≤ 2.25 (F ≥ 18, or from F28 on L30+ data per D-CEO-18); a mechanic may add at most +0.10 to the idle baseline's P95 on the same CSV | measure:l30plus harness of record |
| G5 | Dead zone | Longest stretch with nothing affordable ≤ 180 s (G4); purchase gap ≤ 3 min P95; only player-started, cost-bearing actions count as events | Same |
| G6 | Top-step share | ≤ 25% of total run time (G3, not waived) | Same |
| G7 | Multiplier stacking budget | Additive within a source, multiplicative across sources. **Passive** v2 multipliers (breeds/album/Lab) ≤ ×1.15 by F18 and ≤ ×1.25 by F30, unless `farm_cost` is re-based. **Active** total per §6 | Static audit of every multiplier path + sim |
| G8 | Big-number range | Top-end price × eggs/s at L50/L55 < 1e9 $/s and coins < 2^53 cents (`Number.isSafeInteger`); short-form formatter covers it | MODEL from CSV |
| G9 | Offline | `offline_max_eggs_2h` unchanged; no active reward accrues offline/hidden; welcome-back modal unchanged | Code review + test |
| G10 | Prestige math (if it touches prestige) | Run-2 time to the gate ≤ 50–67% of run 1; yield formula written down; the gate is reachable on the idle bot | Sim of 2 runs |
| G11 | Monte Carlo | ≥ 100 seeds (gates: 200), seeds and command stated, SCRATCH label until on the harness of record | — |
| G12 | Telemetry reconciliation | Spec defines events that measure the share (e.g. `collectible_collected` reward_value) and tolerance vs sim ±10pp | Telemetry spec |
| G13 | Traceability | Every number cites a CSV column + row or code file:line; change log entry; CSV sha on the card | Review |

**Specific risks per mechanic:**

| Mechanic | Main economy risk | Extra check |
|---|---|---|
| Scaling taps / tap cash | Rewards tap-spam; auto-clickers | Counted-tap cap (≤1–3/s); G3 casual ratio |
| Combos / streaks | Invisible when applied to worker sales; worst-seed tail | Streak cap; 10-min worst window |
| Breeds with multipliers | Passive multipliers speed **idle** too (breaks G1); egg diversion lowers order fill | G7 passive budget; order-fill check (§4 E2) |
| Events (Rush Hour, Order Board) | Hoarding (basket stockpile); stacking with frenzy | Rush blocks during frenzy; lane cap |
| Research tree (Lab) | Over-buy or ignore; new best-buy candidate changes AC7 traces | Spend share 15–35% (E4); exclude from bestBuy in v1 |
| Prestige | Reset math; worker dependency; second-run speed | G10 |
| Golden egg | Lumpy payouts inflate the step ratio on short levels (§7) | G4 delta ≤ +0.10 |

---

## 4. PM Farm Upgrades' questions E1–E6 (`research/v2-slices/upgrades.md` §6)
### E1. Stacking and the top-end cap
- **Rule:** additive within a source (e.g. all breed value traits sum), multiplicative across sources.
- **Today's top end at L30** (MODEL, `formulas.ts:169-172`): (1 + 0.05·30)(1 + 0.12·30) = 11.5 × Jumbo 1.5 × Balanced 5 at 1.3 × Grader T5 at 4.0 = **×89.7 on base price** ($89.68/egg, matching §1.1).
- **Why passive multipliers matter:** on an exponential cost curve, a permanent ×m divides the time of every remaining level by m. `farm_cost` grows ×1.35 per level from L20 to L30 (CSV). Album +20% × Lab 5 tiers +25% × breed value +20% ≈ **×1.8** would cut idle L30 time by about 45% and break G1.
- **Cap (proposal):** passive v2 product ≤ ×1.15 by F18 and ≤ ×1.25 by F30 (each ≈ −13% / −20% idle time, which AC7 re-baselining can absorb). Anything bigger requires re-basing `farm_cost`.
- The active premium is capped separately (§6).

### E2. Order fill with `hatch_eggs_k` = 60 s (MODEL / ESTIMATE)
- Diverted share d = k / max(hatch_time, hatch cadence).
- Egg fill = (1 − d) × prod / demand. Today, at bot state: L10 13 / 16.72 = 78%, L20 23 / 32.12 = 72%, with the Hawker. These are eggs sold / eggs demanded, not "customers fully filled".
- With k = 60 and back-to-back 75 s hatches, d = 80%, so fill drops to about 16% and income falls by about 80% while hatching.
- **To keep fill ≥ 75% at L10, d ≤ 4%.** That means k ≤ 3 s back-to-back, or k ≤ 12 s at one hatch per 300 s.
- **Recommendation:**
  - k = 10 s, with at most one hatch per 300 s (d ≈ 3%).
  - Or price hatches in coins (k × income) so eggs aren't diverted.
  - Count d as a negative entry in the active budget: breed payoff must exceed d.

### E3. Counting hatches and research in the gap gates
- Count an event only when it is **player-started and costs ≥ 10% of the current Farm step** (coins or egg-equivalent). Timer completions are not decisions and do not count.
- Re-run without beats (SIM §1.3): F10–F20 gaps are already a median of 30 s, P90 58 s, worst 151 s, which is ≤ 3 min. They pass.
- The "affordable within 60 s" gate already **fails today** (longest nothing-affordable stretch: median 111 s).
- **ESTIMATE:** Lab nodes at 0.4× the Farm step would roughly cap such stretches at 0.4 × 111 ≈ 45 s. This needs the Lab in the sim to confirm; not modelled.

### E4. Lab pricing 0.4–1.0× `farm_cost`[F_unlock], ×1.5 per level (ESTIMATE)
- **Example at F12:**
  - A T1 node at 0.4× costs 855 for +5% income (+$4.5/s at about $90/s), a payback of about 190 s.
  - Hens L12 costs 838 for +1 egg/s on 13 (+7.7%), a payback of about 120 s.
  - So the greedy bundle bot buys the Lab right after the tracks cap.
- Levels cost ×1.5 each while tracks grow ×1.30–1.33, so the bot buys about 2 levels per node. That is 4 × (855 + 1,283) ≈ 8.5k, against about 10k track spend from F12 to F14, i.e. **about 45% spend share at first unlock** (over-buy), then tapering.
- **Recommendation:** `lab_node_cost_k` 0.8 with growth ×1.6, aiming for a 20–30% share. Confirm with a Lab candidate in bestBuy (HoP option A excludes it, which would mean 0% bot spend; then the gate has to be measured on a Lab-aware bot).

### E5. `rosette_k` and prestige yield (MODEL)
- Run earnings to F30 on the workers path: Σ costs bought (farm 1.307M + hens 0.314M + value 0.565M + collection 0.825M + Grader 0.115M + hires 990) = **3.13M** (CSV sums).
- With Rosettes = floor((E / k)^0.5), 10 Rosettes needs **k = 31,265**; 20 needs k = 7,816.
- **Run-2 speed:** 10 Rosettes × 5% = ×1.5 income → run 2 reaches the gate in about 67% of run 1's time, **missing the ≤ 50% target**. ×2 is needed: 20 Rosettes at 5% each, or 10 at 10%.
- **Worker dependency:** without workers, the L30+ curve doesn't reach L50 (`late-game-curve-model.md`), and the no-workers path to F30 isn't modelled here.
- **Recommendation:** gate on lifetime earnings (≥ 3.1M), not on the Farm level, so the gate doesn't depend on workers. Prestige stays after L30+ is decided.

### E6. Beat timings on the M4 table (SIM, ac7, seeds 1–100, median / P95 min)
| F8 | F10 | F12 | F14 | F16 | F18 | F20 | F22 | F24 | F26 | F28 | F30 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 8.7 / 10.2 | 10.3 / 12.0 | 11.9 / 13.7 | 13.9 / 15.4 | 16.8 / 18.2 | 20.8 / 22.3 | 24.6 / 25.9 | 29.4 / 31.1 | 33.9 / 35.1 | 38.0 / 39.2 | 43.2 / 44.4 | 49.6 / 50.8 |

- The F10 / 12 / 14 / 16 / 18 beats come **1.6, 2.0, 2.9 and 4.0 min apart**, so the first two are tighter than 2 min.
- **Re-time to F10 / F13 / F16 / F18 / F20** (≈10.3 / 12.9 / 16.8 / 20.8 / 24.6 min, gaps 2.6–4.0 min, all inside the 2–5 min band).

---

## 5. Shift Calls energy cost (`research/v2-slices/workers.md` §2.2) (MODEL, `scratch/v2-econ/energy.py`)
**Assumptions:**
- CSV: `drain_s_per_pct` 9, `tired_below_pct` 30, `refill_threshold_pct` 50, `charge_regen_s` 150, `charge_cap` 2, `start_charges` 2.
- Activate-all every 300 s (`tc_ability_cd_s`). Each call costs `ability_energy_cost` for each worker with energy > cost.
- Policy: refill the lowest worker ≤ 50% whenever a charge exists.
- 1-hour session. Rest is not used (the worst case for supply).

| Workers | Cost | `charge_regen_s` | Need/min (pts drained ÷ 50) | Supply/min | Refills used/min | % worker-time Tired | % Asleep | Calls blocked |
|---|---|---|---|---|---|---|---|---|
| 3 (F8–17) | 0 | 150 | 0.40 | 0.40 | 0.37 | 0.0 | 0 | 0 |
| 3 | 5 | 150 | 0.46 | 0.40 | 0.38 | 0.0 | 0 | 0 |
| 3 | **10** | 150 | **0.52** | 0.40 | 0.38 | **0.0** (0.3 at 60 s visits) | 0 | 0 |
| 3 | 15 | 150 | 0.58 | 0.40 | 0.38 | 0.8–1.1 | 0 | 0 |
| 4 (F18+) | 0 | 150 | 0.53 | 0.40 | 0.38 | 0.8 | 0 | 0 |
| 4 | **10** | 150 | **0.69** | 0.40 | 0.38 | **14.6** | 0 | 0 |
| 4 | 10 | 135 | 0.69 | 0.44 | 0.43 | 8.7 | 0 | 0 |
| 4 | 10 | **120** | 0.69 | 0.50 | 0.48 | **2.5** | 0 | 0 |
| 4 | 15 | 150 | 0.77 | 0.40 | 0.38 | 19.0 | 0 | 2.1 |

**With 3 workers:**
- The 0.52 vs 0.40 "deficit" is absorbed by refilling deeper: each refill restores about 65 points instead of 50. Workers settle at about 35–50% energy, never Tired.
- So **PM Workers' gate (demand > supply for ≥ 20% of L10–17 time) passes on paper, but the player feels no scarcity.**
- Time to empty with no refills: 100 / (1/9 + 10/300) = **692 s** (vs 900 s today).

**With 4 workers (Grader from F18):**
- Cost 10 means 14.6% of worker-time Tired. The player chooses who goes Tired. A Tired Grader keeps 50% of its bonus (`w4_tired_bonus_share`), and a Tired Market Hand still clears the queue.
- That is a real choice, but up to −7% income (ESTIMATE) if the Grader is neglected.

**Recommendation:**
- `ability_energy_cost` **10**.
- `charge_regen_s` stays **150 for F8–17**.
- From the Grader hire (F18), use **120**: a new per-level `charge_regen_s` column or `charge_cap` 3. That keeps Tired time ≤ 3% and calls blocked at 0.
- If PM Workers wants scarcity they can feel at F10–17, cost 15 gives only about 1% Tired. Scarcity isn't reachable through cost alone; it would need `charge_regen_s` 180 (not modelled).

---

## 6. One shared active-reward budget (for Order Board, Rush Hour and all others)
**Unit:** the active premium = extra income ÷ the idle player's income at the same state.

**Limits:**
- **Total ≤ +50% for an optimal player at L10+** (share ≤ 33%).
- Seller15 and casual players get ≥ 60% of the optimal premium.
- CEO rule: worst-seed 10-min window ≤ 2.0×.
- Step gate: active features add ≤ +0.10 to the idle baseline's P95 step ratio on the same CSV. The absolute P95 ≤ 2.0 / worst ≤ 2.25 belongs to the L30+ reshape: the T3 idle baseline is already 2.60 / 2.75 (§7).
- Passive multipliers (Lab, breeds, album) sit in a **separate** passive budget (E1).

| Feature (owner) | L1–9 | L10–17 | L18–30 | L30+ | Evidence |
|---|---|---|---|---|---|
| Golden egg v0.5 (PM Collection) | +15% from F8 | +15% | +15% | +12% | SIM §7: spec measures +14–19% |
| Tap streak + tap coins (PM Collection, P1: streak 0.28 + 0.03/tap) | 0 | +12% | +12% | +12% | SIM §8 (streak ≤ 0.28 at 1 counted tap/s) |
| Broody nest (PM Collection) | — | +5% | +5% | +5% | Fill 0.05 × income, 150 s cap |
| Shift Calls ×1.15, 30 s / 300 s (PM Workers) | — | +5% | +6% (Inspect) | +6% | 1.52 × 30 / 300 = +5.2% (MODEL) |
| Order Board ×1.25 (PM Market) | — | +5% | +5% | +5% | ESTIMATE: Hard contract 30% of production at +25% ≈ +7.5% while active; capped by allocating the budget |
| Rush Hour ×1.5 lane (PM Market) | — | +3% | +3% | +3% | ESTIMATE: 2 × 106 eggs × 4 at +50% every 600 s |
| Upgrades / Lab / breeds (PM Farm Upgrades) | passive budget | ≤ ×1.10 | ≤ ×1.25 | ≤ ×1.25 | E1 |
| **Active total (additive)** | **≤ +15%** | **≤ +45%** | **≤ +46%** | **≤ +43%** | Under the +50% cap; 4–7 pp headroom |

### 6.1 M5.0 stack as measured (SIM §10; Sweep A naive, T3 splice, seeds 0–99; D-HOP-2026-10-24-16 basis)
Premium = mechanic coins ÷ passive coins (median seed). Columns are optimal / seller15 / casual.

| Source | F10–19 | F20–29 | §6 allocation L10–30 |
|---|---|---|---|
| Golden cash | 11.2 / 7.7 / 5.6% | 16.4 / 10.0 / 8.2% | +15% (incl. Frenzy) |
| Frenzy ×2 | 4.8 / 0.4 / 0.0% | 4.9 / 3.4 / 2.0% | (in golden) |
| Streak (cap 0.28) | 29.3 / 28.9 / 28.8% | 29.2 / 29.1 / 29.0% | +12% (with tap coins) |
| A1 tap coins | 2.6 / 1.9 / 1.3% | 2.9 / 2.0 / 1.4% | (in streak) |
| Broody | 4.4 / 4.4 / 4.4% | 4.8 / 4.8 / 4.8% | +5% |
| Calls (Rush + Sweep A + Shout + Inspect) | 6.7 / 6.7 / 7.0% | 6.3 / 7.2 / 7.1% | +5–6% |
| **M5.0 total premium** | **+60.5 / +56.5 / +52.4%** | **+64.7 / +57.5 / +54.3%** | **≤ +45%, cap +50%** |
| Active share of all coins | 37.7 / 36.1 / 34.4% | 39.3 / 36.5 / 35.2% | band 25–40% |

**Budget finding for HoP (seeds 1–200 re-run on 8dc90e2b L0–30, §13.2a):** the median premium is +58 to +65% for optimal, +52 to +59% for seller15 and +47 to +55% for casual. So the M5.0 stack alone sits **up to +15 pp over the +50% cap**. **D-HOP-2026-10-24-21: accepted, because G1 holds** (window worst 1.936 ≤ 2.25). The table below is the earlier 100-seed checkpoint attribution. The overrun is the streak: an always-on ×1.28 on every sale for anyone tapping ≥ 1/s, against an allocation of +12%. So, as specced, **Order Board and Rush Hour have no headroom**.
- The window gate still passes (worst 1.84), so this is a budget-policy breach, not a gate failure.
- **Lever if headroom is wanted:** streak cap 0.20 (`As20`) gives an optimal share of 34–36% and a premium of about +52–56% (ESTIMATE from share). Alternatively, raise the cap to fit M5.0 as measured.

**Per-gate lines for the CEO report (M5.0 full stack, SCRATCH runner `m5.ts`; harness-of-record status in §13.2):**
- **Window gate (M4-AC24, D-HOP-16 basis), harness definition (8dc90e2b L0–30, every window, seeds 1–200, I_ss rule; approximations: window starts every 300 s, timers reset per window, §13.2a A1/A2):** P95 of each seed's worst window is at most 1.813, P95 over all windows at most 1.761, worst seed **1.936** (optimal, frenzy-holder); limit ≤ 2.00 / ≤ 2.25; **PASS** for every profile × call policy. (T3 lineage to L50: same worst 1.936, P95 seed-max ≤ 1.835. Earlier 100-seed checkpoint run: 1.77 / 1.84.)
- **G1 L30+ step P95 (seeds 1–200, T3 + draft):** 2.68–3.62 (no-mechanics baseline 2.47–2.79); limit ≤ 2.00; **FAIL, pre-existing** (the T3 baseline fails too). Not the M5.0 basis (D-HOP-16 (2)). **Known risk: M5.0 adds +0.21 to +0.85 to the step P95** (naive +0.21 / +0.54 / +0.58, holder +0.85 / +0.67 / +0.83 for optimal / seller15 / casual; the earlier 100-seed figure was +0.23 to +0.97). Re-check after the L30+ reshape with the same-seeds +0.10 rule.
- **G2 L30+ step worst seed (seeds 1–200):** 3.11–4.55 (baseline 2.57–3.16), a delta of +0.54 to +1.71; limit ≤ 2.25; **FAIL, pre-existing**. Same known risk and re-check.
- **G3 top-step share, worst seed:** 7.8–9.7%; limit ≤ 25%; **PASS**.
- **G4 longest nothing-affordable F10+, worst seed:** T3 to L50: 378–785 s (baseline 427–768); 8dc90e2b L10–30: 196–294 s (baseline 226–381; P95 126–166 s); limit ≤ 180 s; **FAIL, pre-existing** (the baseline fails on both CSVs). The stack improves it except with Pause on T3 (pattern (e), optimal: 785). X1 checks no-regression (§13.2a).
- **G5 workers L10 P95:** 11.05 (optimal) / 11.37 (seller15); limit ≤ 12.1; **PASS**. Casual 14.11 is info only (its baseline is 14.38).
- **G5-P Pause patterns:** every pattern ≤ +1.0% mean. Worst seed ≤ +2.0% with `tc_pause_call_lockout_s` 45, except full-coop (f) at +2.5% on one seed, accepted as variance (D-HOP-16 (4)). Limit +1.0% mean / +2.0% worst; **PASS** (with the accepted outlier). **Superseded:** D-HOP-33 withdrew the outlier acceptance. The 8dc90e2b seeds 1–200 baseline has 5 checkpoints > +2.0%, and the golden-timer fix (ii) brings it to 0 (§12a).

- **Stacking rule:** active entries add, then multiply with the passive budget and the Grader. Frenzy blocks Rush (market.md) and the streak boost (spec v0.4 no-stacking).
- **Measured (SIM §8):** the full approved stack (ALL040) and P1 both run at a +36–56% premium at F18–F24. **Adding Order Board and Rush Hour on top needs about 8 pp freed.** Options: streak cap 0.28 → 0.20, or golden egg as specced rather than "frequent".

---

## 7. Golden egg v0.5 on the T3 lineage (SIM, `t3-splice.csv` 366d3a04…, seeds 1–100, T 14400 s)
- **Spec as built in the runner** (`collection/m4-timed-collectible-spec.md` v0.5):
  - Unlock F8; first spawn 45 s after unlock. The next gap U(120, 300) s starts when the egg resolves: tap at 1–8 s, or expiry at 30 s.
  - Weights 0.45 / 0.35 / 0.20.
  - Cash = 45 s × eggs/s × price incl. Grader.
  - Frenzy = ×2 on all sales for 30 s.
  - Eggs = 60 s of production to the basket; from F20, coins.
- **Analytic expected value** = 0.45·45 + 0.35·30 + 0.20·60 = **42.75 s of income per egg**. With a 210 s mean gap that is +20% at 100% catch, +15% at 75% and +12% at 60%.

| Config | Profile | L18 | L30 (median / P95) | L50 (median / P95) | Golden share, median (P5–P95) | Step ratio from L30: P95 / worst | Step ratio from L28: P95 / worst | Top-step share, worst | Longest nothing-affordable stretch: median / worst (s) |
|---|---|---|---|---|---|---|---|---|---|
| none | idle | 20.9 | 51.6 / 53.8 | 171.2 / 172.4 | 0 | 2.69 / 2.84 | 3.16 / 4.72 | 7.9% | 307 / 13134* |
| none | ac7 | 20.8 | 51.5 / 52.9 | 171.2 / 172.2 | 0 | **2.60 / 2.75** | 3.26 / 4.19 | 7.9% | 305 / 582 |
| none | 3 tps | 20.6 | 51.2 / 53.5 | 171.0 / 172.6 | 0 | 2.59 / 2.87 | 3.56 / 4.39 | 7.7% | 305 / 674 |
| **spec v0.5** | idle | 20.9 | 51.6 | 171.2 | 0 (spawns, never caught) | = idle | = idle | — | — |
| **spec v0.5** | ac7 (75% catch) | 19.0 | 46.0 / 48.4 | **149.9** / 153.1 (−12%) | **12.5% (11.1–14.5)** | 3.09 / 3.66 | 3.49 / 5.33 | 8.4% | 278 / 507 |
| **spec v0.5** | 3 tps (95% catch) | 18.5 | 44.5 / 46.3 | **144.6** / 147.3 (−16%) | **15.8% (14.3–17.1)** | 3.16 / 3.67 | 3.36 / 4.83 | 8.9% | 269 / 500 |
| **More frequent**: gap 60–150 s | ac7 | 17.8 | 42.3 / 45.4 | 135.8 / 139.7 (−21%) | 21.7% (19.6–24.3) | 3.59 / 4.18 | 3.95 / 5.88 | 8.6% | 262 / 517 |
| More frequent | 3 tps | 17.3 | 39.8 / 41.9 | 127.2 / 130.3 (−26%) | 26.9% (25.1–28.2) | 3.31 / 5.41 | 3.50 / 5.69 | 8.7% | 243 / 442 |
| More frequent, smaller: gap 60–150, cash 30 s, eggs 40 s | ac7 | 18.5 | 44.0 / 47.0 | 143.3 / 146.5 (−16%) | 17.2% (15.6–19.1) | 2.95 / 3.20 | 4.09 / 5.41 | 8.7% | 270 / 586 |
| More frequent, smaller | 3 tps | 18.1 | 42.1 / 43.9 | 135.9 / 138.3 (−21%) | 21.5% (20.5–22.6) | 3.14 / 3.78 | 3.30 / 3.99 | 8.1% | 244 / 489 |

\*The idle profile has 1 stuck seed (as in §1.3).

**Reading:**
1. The idle path is untouched in every configuration.
2. **The T3 baseline already fails the L30+ step gate** (P95 2.60 > 2.00, worst 2.75 > 2.25) and G4 (305 s > 180 s). This is the parked reshape, not the golden egg.
3. Golden eggs raise P95 by +0.35 to +0.99. The rewards are lumpy (45–60 s of income in one tap) against L30+ levels whose previous-level time is 60–300 s, so one catch can halve a level and inflate the next ratio.
4. "More frequent, smaller" gives the most share per unit of step-ratio damage: +0.35 P95, the same as the spec, for +4.7 pp more share.

**Recommendation:**
- Ship the spec as-is for L8–30 (G4 there is fine; the L18–25 maximum is unchanged).
- For L30+, gate the golden egg on the reshaped curve with the delta rule (≤ +0.10).
- If "more frequent" is wanted, use the **smaller** variant (60–150 s, cash 30 s, eggs 40 s).
- On main data the T3 L30 sits 1.9 min later than main (51.5 vs 49.6). That is the known F27 lookahead divergence (D-CEO-19).

---

## 8. PM Collection package P1 (`research/v2-slices/collection.md` §… P1)
**Model (SIM, T3 splice, seeds 0–99, T 14400):**
- **ALL040** = the approved stack: golden egg v0.5 + streak cap 0.40 (+0.01/tap, ≤1 counted/s, hold 3 s, decay 0.03/s) + abilities v0.2.
  - Abilities are modelled as Activate-all every 300 s for 30 s at ×1.15³ on sale value (Rush/Shout price ×1.15 each, plus Sweep lay ×1.15 as a price proxy, since demand is above supply). Inspect +0.5 tier is not modelled (ESTIMATE). Unlock F10.
- **P1** = streak cap **0.28** + tap coins **0.03 × income** per counted tap (≤1/s) + Broody nest (fills 0.05 × income/s while present, capped at 150 s, collected at each check-in) + golden gap ÷1.25 while streak ≥ 0.20.
- **P1-noC1** = P1 without the golden speed-up.

**Metrics:**
- **Share** = mechanic coins / all coins on that Farm level (median).
- **Ratio** = this run's $/s on level F ÷ the idle run's $/s on level F, same seed. Median / P95 / worst.
- **Δt** = time on level F vs idle, same seed (median).
- Step ratio uses `maxStepRatio` (min previous level 60 s).

**Metric caveat:** levels F10–12 last 60–100 s, so the per-level ratio is noisy. Even "none / optimal" (no mechanics) shows a worst F10 ratio of 2.67. **Read F18/F24, where the no-mechanic noise floor is ≤ 1.15.**

| Stack | Profile | F10 share / ratio median, P95, worst / Δt vs idle | F18 share / ratio median, P95, worst / Δt | F24 share / ratio median, P95, worst / Δt | Step ratio from L30: P95 / worst | Step ratio L10+: P95 / worst | L18 / L30 / L50 (median min) | G1/G2 (≤2.0 / ≤2.25) |
|---|---|---|---|---|---|---|---|---|
| none | optimal | 0.0% / 0.96, 1.62, 2.67 / -5% | 0.0% / 1.02, 1.1, 1.15 / -11% | 0.0% / 0.98, 1.04, 1.09 / -5% | 2.44 / 2.57 | 3.09 / 3.45 | 21 / 52.6 / 171.4 | FAIL |
| none | seller15 | 0.0% / 1, 1, 1.03 / +0% | 0.0% / 1, 1.06, 1.14 / +0% | 0.0% / 1, 1.07, 1.15 / +0% | 2.6 / 2.75 | 3.51 / 4.19 | 20.8 / 51.5 / 171.2 | FAIL |
| none | casual | 0.0% / 0.95, 1.84, 2.66 / +3% | 0.0% / 0.97, 1.16, 1.21 / +11% | 0.0% / 1, 1.13, 1.17 / +26% | 2.83 / 3.16 | 3.9 / 4.69 | 21.3 / 52.3 / 171.9 | FAIL |
| ALL040 | optimal | 47.9% / 1.91, 4.91, 6.84 / -56% | 28.6% / 1.74, 2.83, 4.88 / -43% | 38.2% / 1.61, 2.49, 3.04 / -42% | 2.78 / 3.19 | 3.07 / 3.29 | 15.7 / 34.6 / 106.4 | FAIL |
| ALL040 | seller15 | 47.9% / 1.86, 4.07, 7.08 / -49% | 30.3% / 1.56, 2.35, 3.7 / -33% | 36.6% / 1.6, 2.28, 2.48 / -32% | 3.2 / 3.48 | 3.27 / 3.48 | 15.6 / 35.1 / 109.9 | FAIL |
| ALL040 | casual | 44.8% / 1.81, 3.5, 4.15 / -29% | 32.3% / 1.55, 2.43, 2.92 / -22% | 33.5% / 1.54, 2, 2.37 / -9% | 3.63 / 4.65 | 3.68 / 4.65 | 17.4 / 37.1 / 112.5 | FAIL |
| P1 | optimal | 46.6% / 1.88, 5.01, 7.06 / -51% | 26.5% / 1.63, 2.52, 3.08 / -46% | 35.7% / 1.54, 2.45, 2.7 / -42% | 2.85 / 3.41 | 3.09 / 3.41 | 15.7 / 34.3 / 106 | FAIL |
| P1 | seller15 | 45.9% / 1.84, 3.95, 5.99 / -49% | 26.5% / 1.6, 2.35, 2.82 / -33% | 34.9% / 1.57, 2.16, 2.58 / -35% | 3.29 / 3.5 | 3.33 / 3.82 | 15.8 / 35.2 / 110.3 | FAIL |
| P1 | casual | 43.2% / 1.77, 3.19, 3.96 / -28% | 28.1% / 1.51, 2.4, 3.07 / -25% | 31.9% / 1.48, 1.99, 2.27 / -14% | 4.18 / 5.59 | 4.3 / 5.59 | 17.4 / 37.6 / 114.5 | FAIL |
| P1noC1 | optimal | 46.6% / 1.88, 5.01, 7.06 / -51% | 26.5% / 1.75, 2.52, 3.89 / -44% | 36.4% / 1.57, 2.49, 3.26 / -44% | 2.9 / 3.21 | 2.94 / 3.21 | 16 / 35.2 / 109 | FAIL |
| P1noC1 | seller15 | 45.9% / 1.84, 3.95, 5.99 / -49% | 26.5% / 1.49, 2.28, 2.54 / -27% | 35.1% / 1.59, 2.24, 2.94 / -34% | 3.1 / 3.86 | 3.53 / 4.49 | 15.8 / 35.8 / 112.7 | FAIL |
| P1noC1 | casual | 43.2% / 1.77, 3.19, 3.96 / -28% | 28.4% / 1.42, 2.13, 2.53 / -16% | 32.0% / 1.49, 1.86, 2.07 / -7% | 3.69 / 4.01 | 3.69 / 4.01 | 17.4 / 37.9 / 116.6 | FAIL |

**Verdict:**
- **P1 is budget-neutral against the approved stack, as PM Collection intended:**
  - Optimal: F18 share 26.5% vs 28.6%; ratio median 1.63 vs 1.74; worst F18 3.08 vs 4.88 (a narrower tail); L50 106.0 vs 106.4 min.
  - Seller15 is the same or better.
  - C1 (golden speed-up) adds about +3 min of L50 speed for optimal play and tightens the F18 worst seed (3.89 → 3.08).
- **Both fail the P95 step-ratio ≤ 2.0 gate, and so does the no-mechanic baseline** (T3 none: 2.44–2.60). Neither P1 nor ALL040 can pass an absolute L30+ gate on T3. Against the delta rule (≤ +0.10 vs same-profile none), both fail too: +0.34 to +0.69.
- The per-level ratio P95 is above 2.0 at F18/F24 for **both** stacks (2.16–2.83). My Oct 16 10-min-window numbers (`m4-active-checks.md`: worst 1.93–1.95) start from the same state and so exclude progression compounding; this metric includes it. **HoP needs to pick which metric is the CEO rule.**
- **Recommendation:**
  - Approve P1 as the feel swap (streak → visible per-tap coins plus Broody).
  - **Do not add Order Board / Rush Hour on top until about 8 pp is freed** (streak cap 0.28 → 0.20).
  - Gate L30+ after the reshape.

---

## 9. Coop Hand asleep share: 0.15 or 0.20? (settled with PM Workers)
- **M5.0 effective value = 0.**
  - No reader exists: `git grep asleep_collect` in `src/` finds nothing at a05bc74 or main 737c2cf.
  - The game copy `game/data/economy.csv` has no `w2_asleep_collect_share` column.
  - The sim skips asleep workers: `src/sim/tick.ts:73` `if (isOff(m)) continue` (a05bc74).
  - **All G3 and G5-P runs in §10–12 use 0.**
- **The product CSV's 0.20 is stale.**
  - `decisions.md:177` (HoP, 2026-10-16 23:39): 0.20 only if MK-33a ships in the same build, otherwise 0.15.
  - MK-33a isn't built (`engineering/m5.0-sizing.md:141`).
- **Proposal (pending HoP approval; no CSV edit made):** correct `w2_asleep_collect_share` (`product/economy.csv`, column 119, every row) **0.20 → 0.15**. It stays unread until a consumer is built (§13 sync table).
- **Quick pacing note (from the earlier scratch run, `main-asleep.ts`, kept for reference):** the value only matters to an unmanaged player whose Coop Hand sleeps.
  - Managed and tapping players: zero effect.
  - Idle-unmanaged: 0.20 vs 0.15 is about +1 level at 30 min, and L25 lands inside 90 min.
  - AC7 isn't affected by any of 0, 0.15 or 0.20.

<details><summary>Earlier evidence and model detail</summary>

**Evidence:**
- **CSV:** `w2_asleep_collect_share` = **0.20** on every row (`product/economy.csv`, column 119).
- **Approval:**
  - decisions.md 2026-10-16 23:39 (HoP): "share of 0.20 tied to MK-33a shipping in the same build, otherwise 0.15". 23:40: "approved an asleep Coop Hand share of 0.15".
  - balance-changelog.md Oct 16 23:41: "0.20 holds only if MK-33a ships in the same build; if it slips, the share reverts to 0.15".
  - `workers/coop-full-unmanaged-proposal.md:37,56`.
- **Shipping status:**
  - MK-33a has not shipped. `git log --all --grep MK-33a` finds only the staging CSV commit 671b4ea.
  - `leave_attended_window_s` and the leave penalty aren't read by any src: `rv6-coin-drop-investigation.md:24`; at a05bc74 and main 737c2cf, `git grep asleep_collect|attended` in src finds nothing.
- **The share itself is not implemented either:** `tick.ts:73` skips an asleep or unpaid worker (`isOff`). Both columns are on the unread allowlist (`economy/csv-column-allowlist.md:24,26`, triage 2026-10-22).
- **Baseline = 0.15** (the approved value while MK-33a is unshipped). The CSV's 0.20 is a pending-conditional value. **Recommendation:** change the cell to 0.15 in the next CSV change (with the full gate set), or keep 0.20 only if MK-33a lands in the same build. I made no edit.

**Pacing impact (SIM, main CSV, seeds 1–100, T 5400). The share is applied in the runner as an ESTIMATE model** (asleep Coop Hand moves `eggs_per_tap`[C] every `w2_every_s` / share).

| Profile | `w2_asleep_collect_share` | L10 | L18 | L25 (median / P95) | L30 (median / P95) | Level at 30 min (P5 / median / P95) | Eggs the asleep hand moved (median) |
|---|---|---|---|---|---|---|---|
| idle_unmanaged | 0 | 10.31 | 21.04 | — / — | — / — | 18 / 18 / 19 | 0 |
| idle_unmanaged | 0.15 | 10.31 | 21.04 | — / — | — / — | 19 / 19 / 20 | 27825 |
| idle_unmanaged | 0.2 | 10.31 | 21.04 | 89.14 / 89.97 | — / — | 19 / 20 / 20 | 37945 |
| idle60_unmanaged | 0 | 17.8 | 25.42 | — / — | — / — | 18 / 19 / 19 | 0 |
| idle60_unmanaged | 0.15 | 17.8 | 25.42 | — / — | — / — | 18 / 19 / 19 | 24310 |
| idle60_unmanaged | 0.2 | 17.8 | 25.42 | — / — | — / — | 18 / 19 / 19 | 32500 |
| seller15_managed | 0 | 10.31 | 20.84 | 36.04 / 37.21 | 49.6 / 50.77 | 21 / 22 / 22 | 0 |
| seller15_managed | 0.15 | 10.31 | 20.84 | 36.04 / 37.21 | 49.6 / 50.77 | 21 / 22 / 22 | 0 |
| seller15_managed | 0.2 | 10.31 | 20.84 | 36.04 / 37.21 | 49.6 / 50.77 | 21 / 22 / 22 | 0 |
| seller15_unmanaged | 0 | 10.31 | 20.89 | 44.11 / 47.11 | 86.1 / 88.83 | 21 / 21 / 22 | 0 |
| seller15_unmanaged | 0.15 | 10.31 | 20.89 | 44.11 / 47.11 | 86.1 / 88.83 | 21 / 21 / 22 | 4733 |
| seller15_unmanaged | 0.2 | 10.31 | 20.89 | 44.06 / 47.11 | 86.09 / 88.83 | 21 / 21 / 22 | 6294 |

'—' = not reached within the 90 min horizon.

**Reading:**
- The share only matters for the **unmanaged no-tap** player, whose Market Hand also sleeps. They sell only at check-ins.
- 0.20 vs 0.15 adds about +1 level at 30 min and lets L25 happen (89 min) inside 90 min, where 0.15 and 0 never get there.
- Managed and tapping players: zero effect.
- AC7 (managed) is unaffected by either value.

---


</details>

## 10. G3–G5 on T3: the full M5.0 stack (SCRATCH)
**Setup (SIM):**
- Runner `scratch/v2-econ/h/m5.ts`, driven by `m5main.ts`. CSV `scratch/v2-econ/t3-splice.csv` (sha256 366d3a04…eb1941; L0–30 = `product/economy.csv` c7bb783f, L31–50 = N0b_C150 c249723c…). Seeds 0–99, T = 12000 s, profiles optimal (3 taps/s, check-in ≈5 s, 100% catch), seller15 (`VAR_DEFAULT` ≈1 tap/s, ≈15 s, 75%), casual (0.5 taps/s, ≈30 s, 60%).
- Command: `cd scratch/v2-econ/h && SEEDS=100 S0=0 T=12000 CFG=<none|A|B|B110|Apause|Ahold|Bhold|B110hold> node_modules/.bin/vite-node m5main.ts`. Raw output: `scratch/v2-econ/out/m5-*.{json,log}`, `m6-*.log`.
- **Stack:**
  - golden egg v0.5 at 120–300 s gaps, first spawn 45 s, F8+ (45% cash at 45 s of income, 35% Frenzy ×2 for 30 s)
  - streak +0.01 per credited tap, cap **0.28**, hold 3 s, decay 0.03/s
  - A1 tap coins 0.03 × reference income per credited tap (≤1 per 1.0 s of sim time)
  - Broody: 0.05 × reference income/s while attended, cap 150 s, unlock at the first Coop Hand hire
  - abilities v1.2 from F10, 30 s calls on a 300 s cooldown, `tc_ability_energy_cost` 0: Rush ×1.15 on Market Hand sales, Shout ×1.15 on all sales, Inspect (Grader tier mult + 0.5 ÷ current mult, ×1.333 at T1), Sweep A (lay ×1.15) or B (price ×1.15 or ×1.10 on Coop Hand–collected eggs)
  - all multipliers stack multiplicatively, **calls stack with Frenzy** (D-HOP-2026-10-24-06(e), verified at `decisions.md:513`)
  - reference income = trailing 60 s of passive sale coins only, with no golden, Frenzy, call, streak, Broody or tap coins in it. See §10.1a for the warm-up I_ss and the sales-stall rule (no effect on the result)
- **Gate meanings.** The "G1 P95 ≤ 2.0 / worst ≤ 2.25" in the M5.0 specs is the CEO **10-minute window rule**: active income ÷ idle income over a 10-minute window (`m4-timed-collectible-spec.md` M4-AC24; the `decisions.md:171` streak rerun gave worst seed 1.93). `gates.md` G1/G2 are a different metric, the L30+ level-step ratio. I report both.
  - **Window metric:** from each seed's F10, F18 and F24 snapshot, play 600 s with no purchases, then divide by the idle bot (no taps, no catches, no calls) from the same snapshot.

### 10.1 Window gate, call policies, peak and overlap (G1 as used by the M5.0 specs)
- **Naive:** casts every ready call at each attended check-in.
- **Frenzy-holder:** casts only while a Frenzy is active. It waits with no limit, so it is stricter than HoE's "hold up to one cooldown". A one-cooldown holder sits between the two rows (ESTIMATE).

| Stack (cast policy) | Profile | 10-min active ÷ idle, P95 / worst seed (worst checkpoint of F10/F18/F24) | Window gate (≤ 2.00 / ≤ 2.25) | Peak per-sale multiplier vs idle: median seed / max (F18 max) | Time with a call and Frenzy both active, F10+ (median / worst seed) | Active share of all coins F10–19 / F20–29 / F30+ | L30 / L50 median (min) |
|---|---|---|---|---|---|---|---|
| no mechanics | optimal | 1.00 / 1.01 | PASS | ×1.00 | — | 0.0% / 0.0% / 0.0% | 52.6 / 171.4 |
| no mechanics | seller15 | 1.00 / 1.02 | PASS | ×1.00 | — | 0.0% / 0.0% / 0.0% | 51.5 / 171.2 |
| no mechanics | casual | 1.00 / 1.01 | PASS | ×1.00 | — | 0.0% / 0.0% / 0.0% | 52.3 / 171.9 |
| Sweep A, naive | optimal | 1.77 / 1.84 | PASS | ×3.39 / ×4.51 (F18 ×4.51) (logged re-run, same seeds) | 0.88% (median, 100-seed overlap run) | 37.7% / 39.3% / 39.3% | 34.4 / 106.3 |
| Sweep A, naive | seller15 | 1.74 / 1.81 | PASS | not logged | 0.63% (median, 100-seed overlap run) | 36.1% / 36.5% / 36.8% | 35.2 / 110.3 |
| Sweep A, naive | casual | 1.67 / 1.75 | PASS | not logged | 0.45% (median, 100-seed overlap run) | 34.4% / 35.2% / 35.1% | 37.2 / 113.6 |
| Sweep A, frenzy-holder | optimal | 1.75 / 1.84 | PASS | ×3.95 / ×4.51 (F18 ×4.51) | 3.49% / 5.11% | 37.8% / 38.7% / 38.8% | 34.8 / 107.7 |
| Sweep A, frenzy-holder | seller15 | 1.73 / 1.81 | PASS | ×3.81 / ×4.51 (F18 ×4.51) | 2.69% / 4.30% | 34.8% / 35.1% / 35.7% | 35.9 / 112.6 |
| Sweep A, frenzy-holder | casual | 1.67 / 1.75 | PASS | ×3.81 / ×4.51 (F18 ×4.51) | 2.24% / 3.99% | 32.3% / 33.6% / 33.7% | 38.3 / 116.2 |
| Sweep B ×1.15, naive | optimal | 1.75 / 1.81 | PASS | not logged | — | 37.6% / 39.0% / 38.8% | 34.9 / 107.9 |
| Sweep B ×1.15, naive | seller15 | 1.72 / 1.81 | PASS | not logged | — | 36.2% / 36.0% / 36.3% | 35.4 / 111.3 |
| Sweep B ×1.15, naive | casual | 1.66 / 1.75 | PASS | not logged | — | 34.9% / 34.8% / 35.1% | 37.4 / 114 |
| Sweep B ×1.15, frenzy-holder | optimal | 1.73 / 1.81 | PASS | ×4.38 / ×4.88 (F18 ×4.65) | 3.49% / 5.11% | 37.1% / 38.5% / 38.2% | 35 / 108.8 |
| Sweep B ×1.15, frenzy-holder | seller15 | 1.69 / 1.79 | PASS | ×4.38 / ×5.19 (F18 ×5.19) | 2.69% / 4.30% | 34.7% / 34.9% / 35.3% | 36.3 / 113 |
| Sweep B ×1.15, frenzy-holder | casual | 1.65 / 1.70 | PASS | ×4.38 / ×5.19 (F18 ×5.19) | 2.24% / 3.99% | 32.2% / 33.5% / 33.5% | 38.4 / 117 |
| Sweep B ×1.10, naive | optimal | 1.75 / 1.81 | PASS | not logged | — | 37.5% / 38.9% / 38.7% | 34.9 / 108.2 |
| Sweep B ×1.10, naive | seller15 | 1.72 / 1.80 | PASS | not logged | — | 36.0% / 35.7% / 36.2% | 35.7 / 111.3 |
| Sweep B ×1.10, naive | casual | 1.66 / 1.74 | PASS | not logged | — | 34.3% / 34.7% / 34.9% | 37.6 / 114.8 |
| Sweep B ×1.10, frenzy-holder | optimal | 1.73 / 1.81 | PASS | ×4.19 / ×4.72 (F18 ×4.60) | 3.49% / 5.11% | 37.0% / 38.4% / 38.2% | 35.2 / 108.9 |
| Sweep B ×1.10, frenzy-holder | seller15 | 1.69 / 1.79 | PASS | ×4.19 / ×4.97 (F18 ×4.97) | 2.69% / 4.30% | 34.5% / 34.7% / 35.2% | 36.2 / 113.2 |
| Sweep B ×1.10, frenzy-holder | casual | 1.64 / 1.69 | PASS | ×4.19 / ×4.97 (F18 ×4.97) | 2.24% / 3.99% | 32.3% / 33.2% / 33.4% | 38.4 / 116.8 |
| Sweep A, naive + Pause (yawn pattern) | optimal | 1.77 / 1.84 | PASS | not logged | — | 37.7% / 39.4% / 39.3% | 34.6 / 106.5 |
| Sweep A, naive + Pause (yawn pattern) | seller15 | 1.74 / 1.81 | PASS | not logged | — | 36.1% / 36.5% / 36.7% | 35.4 / 110.6 |
| Sweep A, naive + Pause (yawn pattern) | casual | 1.66 / 1.75 | PASS | not logged | — | 34.4% / 35.2% / 35.1% | 37.3 / 113.7 |

**Reading:**
- **Window gate: PASS on every stack, policy and profile.** The worst seed is 1.84 against ≤ 2.25, and the P95 is 1.77 against ≤ 2.00.
- **Frenzy-holding doesn't raise the window ratio.** It triples call–Frenzy overlap (optimal 0.88% → 3.49% of F10+ time, worst seed 5.1%). But the holder casts about 3× less often: Frenzy comes on roughly 35% of eggs, every 120–300 s. The two effects cancel, and the window P95 moves 1.77 → 1.75.
- **How much the overlap is worth (naive, separate 100-seed run `m5pause.ts`):** the Frenzy × call cross-term is 0.4–0.7% of all active coins (median), 1.5–2.1% on the worst seed.
- **HoE's ×4.5 is confirmed.** The model's F18 maximum is **×4.51** = Frenzy 2 × Rush 1.15 × Shout 1.15 × Inspect 1.333 × streak 1.28, on a Market Hand sale, relative to idle. It holds for at most 30 s.
  - Sweep B raises the ceiling to ×4.65–5.19 on Coop Hand–collected eggs sold by the Market Hand. B is a price multiplier, so it stacks into the same sale; A is a lay multiplier and doesn't.
- **Inspect, reported separately:**
  - **Per sale:** at the F18 peak, Inspect is ×1.333 of the ×4.51. Without it the peak would be ×3.38, so Inspect carries 32% of the peak's extra (19% in log terms).
  - **Income:** Inspect is 2.9% of passive income at F10–19 (≈5% of the active boost) and 1.4% at F20+ (≈2%). This is the largest single call at F18, but small next to the streak (29% of passive, the biggest item) and golden cash (6–16%).
- **Pacing:** with the stack, L30 comes 29–35% sooner for active players (52.6 → 34.4–38.4 min) and L50 34–38% sooner. The idle path is unchanged; the idle bot gets none of the mechanics.
  - **ESTIMATE:** the active share of all coins is 32–39%, inside the 25–40% band. The streak is most of it, since every profile that taps ≥ 1/s sits at the 0.28 cap. With streak cap 0.20 (`As20`) the share drops by 3.6–4.6 points (optimal 34–36%, casual 30–31%) and the window worst seed falls to 1.74.

### 10.1a Sales stall and the reference income (HoQA X8; sales-stopped §4.2 + streak §4.1a / K13c / ST-AC16e, Broody B6b / BH-AC29, D-C6)
**What the G3 runner did (`m5.ts:31`, before this fix):**
- `refI` = trailing **60 s sum of all sale coins ÷ 60**, at passive price factors (player Sell included). It counted no golden, Frenzy, calls, streak, Broody or tap coins.
- During a Market Hand stall that average **decays** as sales stop and reaches 0 only after 60 s with no sale. It was **never an instant 0**.
- There was no warm-up I_ss: a window run that started from a snapshot began with an empty ring, so `refI` started at 0 and climbed over 60 s. That slightly *under*-paid tap coins and Broody in the first 60 s of each window.

**What the specs say:**
- I_ss (= gross `incomePerSec` + wages, live state, no uplifts) is used only during the **warm-up**: the first 60 s of sim time after a fresh start, load or offline return. With the §4.2 fix, I_ss = 0 while a hired Market Hand is Asleep or Unpaid, so taps pay 0 and the nest doesn't fill.
- After warm-up, I_ref is the trailing 60 s window, and "the ring falls with the stalled sales" (K13c / B6b: "Accepted").
- **So the specs settle it: instant 0 applies only during warm-up; after warm-up I_ref decays to 0 over at most 60 s.**
- The one thing they leave open is the edge where a warm-up stall ends and the ring then contains only stall time. My reading: the ring hard-switches at 60 s, reads ≈0 and refills with real sales. That's consistent, but HoE should confirm it.

**Modelled (SCRATCH, `m5.ts` + `m5main.ts`, Sweep A naive, seeds 0–99, `CFG=A|Awarm|AssZ|AssZall`):**
- `Awarm` = spec behaviour. Window runs from snapshots use I_ss for the first 60 s, and I_ss = 0 during a stall.
- `AssZ` = Awarm plus an instant 0 after warm-up too. This is the strict reading HoQA X8 implies.
- `AssZall` = instant 0 with no warm-up.
- A paused Market Hand is **not** a stall (pause spec `mh_paused`; it isn't Asleep or Unpaid).

| Profile | Stall time per full run, median / worst seed (s) | of which F10–17 / F18–23 / F24+, worst (s) | Stall time inside the F10 / F18 / F24 600 s windows (worst) | Window P95 / worst: G3 (A) → Awarm → AssZ → AssZall | Active share F10–19 / F20–29 / F30+ (all variants) |
|---|---|---|---|---|---|
| optimal | 0 / 9.9 | 4.8 / 0 / 0 | 0 / 0 / 0 | 1.77/1.84 → 1.77/1.84 → 1.77/1.84 → 1.77/1.84 | 37.7 / 39.3 / 39.3% (unchanged) |
| seller15 | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 1.74/1.81 → 1.74/1.82 → 1.74/1.82 → 1.74/1.81 | 36.1 / 36.5 / 36.8% (unchanged) |
| casual | 0 / 32.6 | 19.1 / 0 / 0 | 0 / 0 / 0 | 1.67/1.75 → 1.67/1.75 → 1.67/1.75 → 1.67/1.75 | 34.4 / 35.2 / 35.1% (unchanged) |
| slow (A) | 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 1.32/1.39 (A) | 15.8 / 16.9 / 16.7% |

**Delta vs the earlier G3 numbers: none that matters.** The window P95 is unchanged and the worst seed moves by at most +0.01 (seller15, from the warm-up fix). The active share is unchanged to 0.1 pp.
- **Why:** a managed player refills at the yawn (≤ 50%, and Manage is ready on almost every check-in), so a hired Market Hand almost never sleeps. The stall seconds that exist (worst seed 33 s per 3.3 h run) fall before F18.
- **The stall rule only bites for an absent or unmanaged player.** Such a player isn't attended, so A1 and Broody already pay 0 (attended gate) whatever I_ref is.
- **Conclusion:** the §4.2 rule doesn't change G3. The gate result stands with either reading (decaying ring or instant 0).
- I've adopted the spec behaviour (`Awarm`) as the runner of record for any further scratch runs, and labelled it.

### 10.2 `gates.md` G1–G5 (L30+ step, top step, nothing-affordable, workers L10)
| Stack | Profile | gates.md G1 L30+ step P95 (≤ 2.00) | G2 worst (≤ 2.25) | Δ P95 vs no-mechanics, same seeds | G3 top-step share, worst seed (≤ 25%) | G4 longest nothing-affordable F10+, P95 / worst (≤ 180 s) | G5 workers L10 P95 (≤ 12.1) |
|---|---|---|---|---|---|---|---|
| no mechanics | optimal | 2.44 FAIL | 2.57 FAIL | +0.00 | 7.5% PASS | 667 / 768 FAIL | 11.55 PASS |
| no mechanics | seller15 | 2.60 FAIL | 2.75 FAIL | +0.00 | 7.9% PASS | 567 / 582 FAIL | 12.04 PASS |
| no mechanics | casual | 2.83 FAIL | 3.16 FAIL | +0.00 | 8.0% PASS | 362 / 427 FAIL | 14.38 FAIL |
| Sweep A, naive | optimal | 2.67 FAIL | 3.10 FAIL | +0.23 | 7.8% PASS | 401 / 513 FAIL | 11.05 PASS |
| Sweep A, naive | seller15 | 3.37 FAIL | 4.38 FAIL | +0.77 | 8.3% PASS | 349 / 398 FAIL | 11.37 PASS |
| Sweep A, naive | casual | 3.59 FAIL | 4.37 FAIL | +0.77 | 8.0% PASS | 311 / 382 FAIL | 14.11 FAIL |
| Sweep A, frenzy-holder | optimal | 3.41 FAIL | 3.90 FAIL | +0.97 | 8.3% PASS | 378 / 432 FAIL | 11.05 PASS |
| Sweep A, frenzy-holder | seller15 | 3.22 FAIL | 3.74 FAIL | +0.61 | 8.3% PASS | 350 / 429 FAIL | 11.37 PASS |
| Sweep A, frenzy-holder | casual | 3.51 FAIL | 3.94 FAIL | +0.68 | 8.1% PASS | 356 / 410 FAIL | 14.11 FAIL |
| Sweep B ×1.15, naive | optimal | 2.93 FAIL | 3.43 FAIL | +0.49 | 7.9% PASS | 377 / 462 FAIL | 11.05 PASS |
| Sweep B ×1.15, naive | seller15 | 3.29 FAIL | 4.55 FAIL | +0.69 | 7.9% PASS | 350 / 386 FAIL | 11.37 PASS |
| Sweep B ×1.15, naive | casual | 3.33 FAIL | 4.37 FAIL | +0.50 | 8.2% PASS | 305 / 409 FAIL | 14.11 FAIL |
| Sweep B ×1.15, frenzy-holder | optimal | 3.04 FAIL | 3.82 FAIL | +0.60 | 7.8% PASS | 385 / 465 FAIL | 11.05 PASS |
| Sweep B ×1.15, frenzy-holder | seller15 | 3.29 FAIL | 3.84 FAIL | +0.69 | 8.3% PASS | 335 / 396 FAIL | 11.37 PASS |
| Sweep B ×1.15, frenzy-holder | casual | 3.47 FAIL | 4.22 FAIL | +0.64 | 8.6% PASS | 340 / 422 FAIL | 14.11 FAIL |
| Sweep B ×1.10, naive | optimal | 2.83 FAIL | 3.43 FAIL | +0.39 | 7.9% PASS | 377 / 523 FAIL | 11.05 PASS |
| Sweep B ×1.10, naive | seller15 | 3.04 FAIL | 3.53 FAIL | +0.44 | 8.2% PASS | 358 / 405 FAIL | 11.37 PASS |
| Sweep B ×1.10, naive | casual | 3.47 FAIL | 6.11 FAIL | +0.64 | 8.2% PASS | 351 / 400 FAIL | 14.11 FAIL |
| Sweep B ×1.10, frenzy-holder | optimal | 2.91 FAIL | 3.21 FAIL | +0.47 | 7.8% PASS | 363 / 598 FAIL | 11.05 PASS |
| Sweep B ×1.10, frenzy-holder | seller15 | 3.33 FAIL | 4.33 FAIL | +0.73 | 8.3% PASS | 380 / 456 FAIL | 11.37 PASS |
| Sweep B ×1.10, frenzy-holder | casual | 3.43 FAIL | 4.16 FAIL | +0.60 | 8.6% PASS | 364 / 424 FAIL | 14.11 FAIL |
| Sweep A, naive + Pause (yawn pattern) | optimal | 2.72 FAIL | 3.10 FAIL | +0.28 | 7.9% PASS | 402 / 785 FAIL | 11.05 PASS |
| Sweep A, naive + Pause (yawn pattern) | seller15 | 3.31 FAIL | 3.83 FAIL | +0.71 | 8.3% PASS | 357 / 378 FAIL | 11.37 PASS |
| Sweep A, naive + Pause (yawn pattern) | casual | 3.34 FAIL | 4.37 FAIL | +0.51 | 9.7% PASS | 321 / 382 FAIL | 14.11 FAIL |

**Reading:**
- **G1/G2 (L30+ step ratio): FAIL already at baseline** on the T3 splice in this runner (P95 2.44–2.83). Every M5.0 stack makes it worse, by +0.23 to +0.97 in P95.
  - **Mechanism:** the stack shortens L31–50 levels unevenly, because golden cash lands as lumps on short levels.
  - This is the parked L30+ reshape (§7 and §10 caveats). It isn't a gate M5.0 can pass or fail on its own. **Proposal for HoP:** judge M5.0 on the window gate (§10.1) and on L0–30, and re-run the step gate once the L30+ curve is reshaped, using the same-seeds delta rule (≤ +0.10).
- **G3 top-step share: PASS** everywhere (≤ 9.7% against 25%).
- **G4 longest nothing-affordable stretch: FAIL everywhere, baseline included.** The baseline worst seed is 427–768 s on T3 (the L30+ curve); the stack improves it to 382–513 s. On main L0–30 the same metric is 305 s worst (§1.3).
- **G5 workers L10 P95: PASS** for optimal (11.05) and seller15 (11.37) against 12.1. The stack moves L10 0.3–0.7 min sooner because golden eggs start at F8. Casual is 14.11, under the baseline's 14.38; casual isn't the G5 bot of record.
- **Verdict: the M5.0 stack passes the window gate with 0.23 of P95 headroom (2.00 − 1.77) and 0.41 on the worst seed (2.25 − 1.84).** It adds nothing new to the pre-existing T3 failures of G1/G2/G4; they need the L30+ reshape. **SCRATCH: not a harness-of-record (`npm run measure:l30plus`) result.**

## 11. Sweep at F20+ (B2): **RULED A (lay ×1.15), final** (D-HOP-2026-10-24-16 (1))
| Sweep | Player-visible effect (30 s call, 300 s cooldown) | Sweep's own income, % of passive: F10–19 (opt / s15 / cas) | F20–29 | F30+ | Window ratio P95 / worst, naive (all profiles, worst checkpoint) | frenzy-holder | Peak per-sale ×, holder (max) | gates.md G1/G2 Δ P95 vs baseline (opt / s15 / cas) | Engineering | Pass/fail (window gate) |
|---|---|---|---|---|---|---|---|---|---|---|
| A | Coop lays +15% faster; more eggs reach the coop and the Coop Hand collects them (no price chip) | 0.98 / 0.99 / 1.04 | 1.31 / 1.51 / 1.49 | 1.48 / 1.47 / 1.47 | 1.77 / 1.84 | 1.75 / 1.84 | ×4.51 | +0.23 / +0.77 / +0.77 | in the base estimate | PASS |
| B | Eggs the Coop Hand collected sell for +15% (price chip on those sales) | 0.15 / 0.43 / 0.89 | 0.21 / 0.60 / 1.21 | 0.22 / 0.58 / 1.19 | 1.75 / 1.81 | 1.73 / 1.81 | ×5.19 | +0.49 / +0.69 / +0.50 | +0.5–0.75 dd (basket FIFO, sizing §9.5 edge 4) | PASS |
| B110 | Same as B at +10% | 0.10 / 0.28 / 0.61 | 0.14 / 0.40 / 0.80 | 0.15 / 0.38 / 0.79 | 1.75 / 1.81 | 1.73 / 1.81 | ×4.97 | +0.39 / +0.44 / +0.64 | +0.5–0.75 dd (basket FIFO, sizing §9.5 edge 4) | PASS |

- **Ruling (D-HOP-2026-10-24-16 (1)): Sweep A, lay ×1.15, `tc_ability_w2_mode` 0. Final.** It closes HoE B2 with no extra Eng, and no `tc_ability_w2_price_mult` column is needed. The rationale (recommendation as submitted) follows.
  - **Both pass the window gate**, with the same P95 to the second decimal. B ×1.15 doesn't break it, so B ×1.10 isn't needed as a fallback.
  - **A is worth more:** 1.3–1.5% of passive income at F20+ against 0.2–1.2% for B.
  - **A is the same for every player.** B's value falls with tap rate: the optimal tapper collects most eggs by hand, so the Coop Hand's "own eggs" are few, and B is nearly invisible to the most engaged player (0.2%).
  - **A doesn't raise the per-sale ceiling** (×4.51 vs ×5.19 for B).
  - **A costs nothing extra.** B costs Engineering **+0.5–0.75 dd** for basket FIFO tagging (`engineering/m5.0-sizing.md` §9.5 edge 4, B2).
- **If HoP prefers B for its visible price chip:** ship **B ×1.15** (`tc_ability_w2_price_mult` 1.15). It passes too.
- **Caveat on A:** extra eggs only pay while demand exceeds supply. That held at F20+ in this run, but it is the condition to re-check after any demand change (Order Board, Rush Hour).

## 12. G5-P: Pause patterns (`m5-worker-pause-spec.md` v1.2 §10) (SCRATCH)
**Rulings (D-HOP-2026-10-24-16):**
- (3) `tc_pause_call_lockout_s` = **45**.
- (4) ~~The full-coop (f) outlier is accepted as documented variance.~~ **WITHDRAWN by D-HOP-2026-10-24-33** (strict band; see §12a for fix (ii)). All numbers in this section are seeds 0–99, T3 splice.
- G5-P can't run on the harness of record yet (§13.2).

- **Setup:** runner `m5g5p.ts`, T3 splice, seeds 0–99, full M5.0 stack with Sweep A, naive casts, `tc_pause_call_lockout_s` 30.
  - Each seed's never-pause progression run is snapshotted at F10, F18 and F24. From each snapshot, the pattern and never-pause both play **1800 s** of managed play with no purchases, same seed. 1800 s is one full pattern-(a) cycle at 0.25× recovery.
  - Managed income = coins delta net of wages and refills.
  - Paused worker: no output, no wage, energy +0.25 × drain (+1% per 36 s), active call ends, cooldown keeps running. A paused Grader pays **0%** (the runner removes the asleep 15%). Pause unlocks at F10. Market Hand resume → Rush and Shout locked 30 s.
  - Profile **slow** (ESTIMATE): 0.25 taps/s, ≈60 s check-ins, 40% catch.
- Command: `cd scratch/v2-econ/h && SEEDS=100 S0=0 W=1800 PROFS=<p> SWEEP=A node_modules/.bin/vite-node m5g5p.ts`, raw output `scratch/v2-econ/out/g5p-*.log`.
- Cells show the mean Δ vs never-pause, with the worst seed in brackets. **+ = pausing earns more.**

| Pattern | Rule | optimal: F10 / F18 / F24 mean Δ (worst seed) | seller15: F10 / F18 / F24 mean Δ (worst seed) | casual: F10 / F18 / F24 mean Δ (worst seed) | slow: F10 / F18 / F24 mean Δ (worst seed) | Result |
|---|---|---|---|---|---|---|
| (a) pause W1+W2 at yawn (≤50%), resume at 100% (0.25× recovery, ≈30 min paused) | ≤ +1.0% mean, ≤ +2.0% worst | -6.4% (-1.7%) / -4.8% (-2.0%) / -4.0% (-2.7%) | -9.8% (-2.7%) / -10.7% (-3.2%) / -13.5% (-4.7%) | -35.0% (-24.8%) / -36.9% (-27.7%) / -42.0% (-34.8%) | -57.4% (-38.6%) / -56.1% (-49.5%) / -61.5% (-49.4%) | PASS |
| (b) stockpile-and-Rush: pause Market Hand ≤270 s before Rush is ready, resume when ready, Rush/Shout after the 30 s lockout | ≤ +1.0% mean, ≤ +2.0% worst | -0.3% (+2.5%) / -0.4% (+1.0%) / -0.6% (-0.0%) | -0.9% (+1.3%) / -0.8% (+1.8%) / -1.1% (+0.8%) | -16.2% (+0.2%) / -14.4% (+1.3%) / -20.1% (-10.3%) | -39.5% (-7.6%) / -34.6% (-23.6%) / -37.6% (-28.9%) | FAIL |
| (c) bench the Market Hand, sell by hand at check-ins (reported only) | reported only | -1.5% (+1.5%) / -1.6% (-0.1%) / -1.7% (-1.1%) | -2.3% (+0.7%) / -2.3% (-0.5%) / -2.9% (-0.2%) | -26.4% (-13.5%) / -30.2% (-18.5%) / -37.6% (-27.9%) | -54.5% (-33.5%) / -54.7% (-47.7%) / -58.9% (-51.8%) | reported |
| (d) pause the Grader at ≤50% (earlier than Tired, worst case), resume at 100% | ≤ never-pause (worst ≤ 0) | +0.0% (+0.0%) / +0.0% (+0.0%) / -54.4% (-46.2%) | +0.0% (+0.0%) / +0.0% (+0.0%) / -54.4% (-46.1%) | +0.0% (+0.0%) / +0.0% (+0.0%) / -56.0% (-45.7%) | +0.0% (+0.0%) / +0.0% (+0.0%) / -50.5% (-46.0%) | PASS |
| (e) short pause: W1/W2 at yawn only while Manage is on cooldown, resume + Manage when ready | ≤ +1.0% mean, ≤ +2.0% worst | +0.0% (+0.1%) / +0.0% (+0.0%) / -0.0% (+0.1%) | +0.0% (+0.2%) / -0.0% (+0.0%) / -0.0% (+0.1%) | +0.0% (+0.7%) / -0.0% (+0.1%) / -0.0% (+0.0%) | +0.0% (+0.0%) / +0.0% (+0.0%) / +0.0% (+0.0%) | PASS |
| (f) pause Coop Hand while the basket holds >30 s of production, resume <10 s | ≤ +1.0% mean, ≤ +2.0% worst | -0.2% (+2.5%) / -0.1% (+1.3%) / +0.0% (+0.0%) | -0.2% (+1.4%) / -0.1% (+1.6%) / +0.0% (+0.0%) | -0.1% (+0.8%) / -0.0% (+0.5%) / +0.0% (+0.0%) | -0.7% (+1.8%) / -0.0% (+0.3%) / +0.0% (+0.0%) | FAIL |
| (g) wage-skip: bench Market Hand AND Coop Hand, player collects + sells at check-ins | ≤ +1.0% mean, ≤ +2.0% worst | -2.7% (+0.2%) / -2.9% (-1.2%) / -3.3% (-2.7%) | -3.3% (-1.5%) / -3.5% (-1.8%) / -4.2% (-1.8%) | -26.4% (-13.4%) / -30.1% (-19.1%) / -37.6% (-27.9%) | -54.4% (-33.5%) / -54.6% (-47.6%) / -58.9% (-51.8%) | PASS |

**Reading:**
- **(a) recovery farming, the HoP's G5 threat: PASS by a wide margin.** It loses 4–14% for engaged players and 35–60% for casual and slow, so 0.25× is safely below break-even.
- **(c) and (g) benching to skip wages lose money** for every profile (−1.5% to −59% mean). The accepted break-even holds for optimal and seller15 (worst seeds −0.1% to +1.5%).
- **(d) Grader: PASS.** Pausing it costs 46–56% of income at F24. It isn't hired by the F10/F18 snapshots, so those cells are 0.
- **(e) short pauses: PASS** (≤ +0.7% worst). They rarely trigger, because Manage is ready almost every time a worker yawns.
- **(b) stockpile-and-Rush and (f) full-coop pausing: mean PASS, worst-seed FAIL.** Both fail only at F10 for optimal: +2.5% on one seed (limit +2.0%). The means are negative everywhere (−0.1% to −1.1% for engaged players). Every other profile and checkpoint is ≤ +1.8%.
  - The single-seed spikes are consistent with golden-egg/Frenzy timing shifts, since pausing moves the sale timing relative to a Frenzy. See the diagnostic rows below.

**Diagnostics (optimal, seeds 0–99, same setup):**

| Run | (b) F10 / F18 / F24 mean Δ (worst seed) | (f) F10 / F18 / F24 | Result |
|---|---|---|---|
| lockout 30 s (as above) | −0.3% (+2.5%) / −0.4% (+1.0%) / −0.6% (−0.0%) | −0.2% (+2.5%) / −0.1% (+1.3%) / 0.0% (0.0%) | (b) FAIL, (f) FAIL (worst seed) |
| golden egg off (`NOGOLD=1`), lockout 30 s | −0.4% (+0.4%) / −0.4% (+0.4%) / −0.7% (−0.2%) | −0.2% (+0.5%) / 0.0% (0.0%) / 0.0% (0.0%) | both PASS |
| **lockout 45 s** | −0.4% (+1.6%) / −0.5% (+0.4%) / −0.6% (+0.1%) | — | **(b) PASS** |
| lockout 60 s | −0.4% (+1.7%) / −0.5% (+1.4%) / −0.7% (−0.1%) | — | (b) PASS |

- **The worst-seed spikes come from the golden egg.** Without golden eggs, both patterns stay ≤ +0.5%. Pausing banks eggs or a queue, and on an unlucky seed that stock is sold into a Frenzy ×2.
- **(b) fix: raise `tc_pause_call_lockout_s` 30 → 45** (inside the spec's 15–60 range). The worst seed drops to +1.6%. 60 is no better. The draft CSV and §13 carry **45**.
  - **Correction (re-run, `scratch/v2-econ/out/g5p45/`):** 45 fixes optimal only. At 45, seller15 goes from +1.80% to **+2.62%** (s47 F10) and +2.37% (s31 F18), which FAILS. Casual is −0.57%. At 60, seller15 is +1.85% on seeds 0–99 but +2.14% on seeds 1–200. With no golden egg, seller15 at 45 tops out at +0.17%. See §13.2a.
- **(f) full-coop pausing:** this is a natural play pattern, not a call exploit. Its mean is −0.1% to −0.7%. It exceeds +2.0% on 1 of 1200 optimal seed-checkpoints (+2.5% at F10). The lockout doesn't touch it, because the Coop Hand has no call lock.
  - **Ruled (D-HOP-16 (4)):** accepted as golden-timing variance; the gate definition is unchanged.
- **G1 with Pause in the stack** (`Apause`, pattern (e), §10.1): window P95 / worst is 1.77 / 1.84. **PASS.**



## 12a. Pause golden-egg fix (D-HOP-2026-10-24-33 / -34): variant (ii), ruled definition **PASSES**; (i) not run (SCRATCH)
**Rulings:**
- D-HOP-33: mechanic fix; D-HOP-16 (4) (accepted (f) outlier) is **WITHDRAWN**.
- **Strict band:** every pattern mean ≤ +1.0%, (d) ≤ never-pause, **every** seed-checkpoint ≤ +2.0%.
- D-HOP-34: variant (ii) first (CEO preference); (i) only if (ii) fails.

**Basis:**
- 8dc90e2b, L0–30, `tc_pause_call_lockout_s` 45, Sweep A, seeds **1–200** unless labelled.
- Profiles optimal / seller15 / casual / **slow** (`m5.ts` PROFS: 0.25 taps/s, ≈60 s check-ins, 40% catch).
- **Gated set:** (a), (b), (d)–(g) = 6 × 4 profiles × 3 checkpoints × 200 seeds = **14,400** seed-checkpoints. (c) is reported only.

**Variant (ii), ruled definition = `GPAUSE=2`, PRIMARY** (D-HOP-34; `h/m5gp.ts`, a copy of `m5.ts`; `m5.ts`, `m5g5p.ts` and `m5x.ts` unchanged):
- While **any** hired worker is paused, three things freeze:
  - the golden spawn countdown (R2 first spawn, R3 gap);
  - the on-screen golden egg's age, so it can't expire;
  - `frenzyRemainingS`.
- While frozen, Frenzy ×2 does **not** apply to sales. The remaining Frenzy time is kept for after Resume, and abilities held by the Frenzy-holder for a Frenzy see no Frenzy. An on-screen egg can't be tapped.
- **Same-tick order:** the runner applies pause/resume at the check-in at the end of tick t. That is the player input for tick t+1, so the freeze is in force before tick t+1's age, countdown and Frenzy update. Nothing advances on a tick that starts paused.
- No resume wait (none exists): timers restart on the first tick after Resume. No wait sweep was needed, because (ii) passes without one. Everything else is unchanged.
- **Approximation A3 (labelled):** the runner books a caught golden egg's payout at spawn; the tap is modelled as instant, and the 1–8 s on-screen time is folded into the countdown.
  - So "can't be tapped while frozen" binds only when a pause starts while an egg is still on screen.
  - That happened in 3–393 snapshot runs per cell out of 600 ((f) optimal is the highest, at 393). In those cases the payout lands up to 8 s early instead of after Resume, and nothing is gained or lost within the 1,800 s window. A Frenzy it started is then frozen and carried, as ruled.
  - The per-cell counts are in `scratch/v2-econ/out/g5p45/d34/doc-tables.md`.
- **GPAUSE=1** (countdown-only, the reference I modelled first) freezes only the spawn countdown. An on-screen egg and a running Frenzy keep going.
- **Clock:** R2/R3 already count focus-clock time, and so does the Frenzy and egg-age timer (R5e). (ii) only adds the condition "no hired worker paused". Hidden-tab time doesn't matter, because a hidden tab already freezes these timers (R5/R7).
  - If a resume wait is ever added, it must count focus seconds. A wait counted in sim seconds would quietly drop to 0 during a hidden-tab gap of under 60 s.

**G5-P, GPAUSE=2 (ruled), seeds 1–200:**

| GPAUSE=2 (ruled), mean % F10 / F18 / F24; worst seed-checkpoint | optimal | seller15 | casual | slow | Result |
|---|---|---|---|---|---|
| (a) | -16.54 / -17.22 / -16.31; worst -11.32% (s188 F10) | -16.89 / -18.26 / -22.16; worst -8.14% (s37 F18) | -39.13 / -42.12 / -48.59; worst -26.81% (s108 F10) | -59.98 / -59.02 / -66.10; worst -20.50% (s148 F10) | PASS |
| (b) | -11.03 / -11.14 / -10.32; worst -6.69% (s185 F10) | -8.29 / -8.39 / -7.80; worst -1.90% (s183 F18) | -19.08 / -17.62 / -24.65; worst -2.73% (s157 F18) | -38.69 / -33.70 / -37.76; worst -5.24% (s108 F10) | PASS |
| (c) | -15.31 / -15.55 / -14.49; worst -10.62% (s70 F18) | -12.41 / -12.82 / -12.25; worst -5.43% (s37 F18) | -31.65 / -35.49 / -44.60; worst -16.64% (s86 F10) | -57.54 / -57.75 / -63.54; worst -17.89% (s148 F10) | reported |
| (d) | +0.00 / +0.00 / -59.91; worst +0.00% (s1 F10) | +0.00 / +0.00 / -57.47; worst +0.00% (s1 F10) | +0.00 / +0.00 / -58.97; worst +0.00% (s1 F10) | +0.00 / +0.00 / -53.49; worst +0.00% (s1 F10) | PASS |
| (e) | +0.00 / +0.00 / -0.09; worst +1.35% (s25 F24) | -0.01 / -0.02 / -0.10; worst +1.01% (s50 F10) | -0.04 / -0.05 / -0.16; worst +1.14% (s120 F18) | +0.00 / -0.01 / -0.01; worst +1.18% (s43 F10) | PASS |
| (f) | -3.21 / -1.18 / +0.00; worst +1.26% (s34 F10) | -2.09 / -0.72 / +0.00; worst +0.78% (s31 F18) | -2.00 / -0.34 / +0.00; worst +1.11% (s19 F18) | -2.44 / -0.35 / +0.00; worst +0.89% (s116 F18) | PASS |
| (g) | -16.51 / -16.82 / -15.98; worst -11.99% (s70 F18) | -13.54 / -14.02 / -13.50; worst -6.61% (s37 F18) | -31.58 / -35.45 / -44.60; worst -16.56% (s86 F10) | -57.46 / -57.68 / -63.53; worst -17.89% (s148 F10) | PASS |
| checkpoints > +2.0% / > +2.5% (gated) | | | | | **0 / 0** |

**G5-P, GPAUSE=1 (countdown-only reference), seeds 1–200:**

| GPAUSE=1 (countdown-only reference) | optimal | seller15 | casual | slow | Result |
|---|---|---|---|---|---|
| (a) | -16.50 / -17.18 / -16.28; worst -11.32% (s188 F10) | -16.86 / -18.23 / -22.15; worst -8.14% (s37 F18) | -39.12 / -42.09 / -48.57; worst -26.81% (s108 F10) | -59.98 / -58.99 / -66.10; worst -20.50% (s148 F10) | PASS |
| (b) | -11.03 / -11.14 / -10.33; worst -6.78% (s185 F10) | -8.36 / -8.49 / -7.88; worst -1.90% (s183 F18) | -19.23 / -17.74 / -24.74; worst -3.16% (s157 F18) | -38.73 / -33.82 / -37.86; worst -5.24% (s108 F10) | PASS |
| (c) | -15.30 / -15.54 / -14.48; worst -10.62% (s70 F18) | -12.40 / -12.80 / -12.23; worst -5.43% (s37 F18) | -31.65 / -35.49 / -44.60; worst -16.64% (s86 F10) | -57.54 / -57.75 / -63.54; worst -17.89% (s148 F10) | reported |
| (d) | +0.00 / +0.00 / -59.91; worst +0.00% (s1 F10) | +0.00 / +0.00 / -57.46; worst +0.00% (s1 F10) | +0.00 / +0.00 / -58.97; worst +0.00% (s1 F10) | +0.00 / +0.00 / -53.48; worst +0.00% (s1 F10) | PASS |
| (e) | +0.00 / +0.00 / -0.09; worst +1.35% (s25 F24) | -0.01 / -0.02 / -0.10; worst +1.01% (s50 F10) | -0.04 / -0.05 / -0.16; worst +1.11% (s120 F18) | +0.00 / -0.01 / -0.01; worst +1.18% (s43 F10) | PASS |
| (f) | -3.21 / -1.18 / +0.00; worst +1.26% (s34 F10) | -2.08 / -0.71 / +0.00; worst +0.78% (s31 F18) | -1.98 / -0.34 / +0.00; worst +1.11% (s19 F18) | -2.44 / -0.35 / +0.00; worst +0.89% (s116 F18) | PASS |
| (g) | -16.50 / -16.81 / -15.97; worst -11.99% (s70 F18) | -13.52 / -14.00 / -13.48; worst -6.61% (s37 F18) | -31.58 / -35.45 / -44.60; worst -16.56% (s86 F10) | -57.46 / -57.68 / -63.53; worst -17.89% (s148 F10) | PASS |
| checkpoints > +2.0% / > +2.5% (gated) | | | | | **0 / 0** |

**G5-P baseline (no fix), seeds 1–200:**

| Baseline, mean % F10 / F18 / F24; worst seed-checkpoint | optimal | seller15 | casual | slow | Result |
|---|---|---|---|---|---|
| (a) | -6.67 / -4.82 / -3.99; worst -1.68% (s67 F10) | -9.91 / -10.88 / -13.49; worst -1.46% (s188 F10) | -34.55 / -36.90 / -42.14; worst -24.18% (s156 F10) | -56.83 / -55.70 / -61.37; worst -12.38% (s148 F10) | PASS |
| (b) | -0.40 / -0.43 / -0.58; worst +1.59% (s114 F10) | -0.47 / -0.58 / -0.82; worst +2.62% (s47 F10); **2 > 2.0, 1 > 2.5** | -15.09 / -13.60 / -19.56; worst +1.07% (s157 F18) | -36.03 / -31.33 / -34.08; worst -0.08% (s148 F10) | **FAIL** |
| (c) | -1.56 / -1.57 / -1.75; worst +1.51% (s19 F10) | -2.28 / -2.41 / -2.84; worst +0.95% (s160 F10) | -26.23 / -30.22 / -37.87; worst -13.47% (s86 F10) | -54.03 / -54.34 / -58.56; worst -6.71% (s148 F10) | reported |
| (d) | +0.00 / +0.00 / -55.13; worst +0.00% (s1 F10) | +0.00 / +0.00 / -54.00; worst +0.00% (s1 F10) | +0.00 / +0.00 / -56.06; worst +0.00% (s1 F10) | +0.00 / +0.00 / -51.42; worst +0.00% (s1 F10) | PASS |
| (e) | +0.00 / +0.00 / -0.04; worst +0.16% (s193 F10) | +0.00 / +0.00 / -0.02; worst +0.22% (s93 F10) | +0.00 / -0.01 / -0.03; worst +0.67% (s8 F10) | +0.00 / +0.00 / +0.00; worst +0.03% (s43 F10) | PASS |
| (f) | -0.31 / -0.07 / +0.00; worst +2.52% (s19 F10); **1 > 2.0, 1 > 2.5** | -0.17 / -0.07 / +0.00; worst +1.61% (s31 F18) | -0.15 / -0.03 / +0.00; worst +2.36% (s169 F10); **1 > 2.0, 0 > 2.5** | -0.85 / +0.00 / +0.00; worst +2.25% (s193 F10); **1 > 2.0, 0 > 2.5** | **FAIL** |
| (g) | -2.75 / -2.88 / -3.32; worst +0.25% (s19 F10) | -3.33 / -3.59 / -4.11; worst -0.97% (s117 F10) | -26.16 / -30.17 / -37.86; worst -13.39% (s86 F10) | -53.95 / -54.28 / -58.55; worst -6.71% (s148 F10) | PASS |
| checkpoints > +2.0% / > +2.5% (gated) | | | | | **5 / 2** |

**Cross-check, GPAUSE=2, seeds 0–99** (cited by pause spec §10, QA CI and GE-AC29): **0 / 0** of 7,200; every cell PASSES; worst +1.35% ((e) optimal s25 F24). Full table: `scratch/v2-econ/out/g5p45/d34/doc-tables.md`.

**Effect of carrying the Frenzy over (GPAUSE=2 vs GPAUSE=1), per pattern, over 4 profiles × 3 checkpoints:**

| Pattern | max Δ mean (pp), any profile/checkpoint | max Δ worst (pp) | cells where (ii-2) worst > (ii-1) worst |
|---|---|---|---|
| (a) | +0.00 | +0.00 | 0 of 12 |
| (b) | +0.15 | +0.43 | 5 of 12 |
| (c) | +0.00 | +0.00 | 0 of 12 |
| (d) | +0.00 | +0.00 | 0 of 12 |
| (e) | +0.00 | +0.03 | 1 of 12 |
| (f) | +0.00 | +0.00 | 0 of 12 |
| (g) | +0.00 | +0.00 | 0 of 12 |

**Result: the ruled (ii) PASSES the strict band.**
- Seed-checkpoints above +2.0% / +2.5%: **0 / 0** of 14,400. GPAUSE=1 is also 0 / 0; the baseline is **5 / 2**:
  - (b) seller15 s47 F10 +2.62 and s31 F18 +2.37;
  - (f) optimal s19 F10 +2.52, casual s169 F10 +2.36, slow s193 F10 +2.25.
- Worst checkpoint: +1.35% ((e) optimal s25 F24). Every mean is ≤ +0.00%, and (d) ≤ never-pause.
- **The Frenzy carry-over does raise (b) slightly**, by at most +0.15 pp on a mean and +0.43 pp on a worst seed (casual F18 −3.16 → −2.73%), and (e) by +0.03 pp (casual worst +1.11 → +1.14%).
  - It doesn't change (f), because a full-coop pause while a Frenzy runs is outweighed by the ×2 being suspended during the pause.
  - The closest cell to the band is still 0.65 pp under +2.0%.
- **Cost to a pausing player:** pausing also stops golden eggs and the Frenzy, so engaged players lose ≈ 8–12 pp more (optimal (b) −0.47 → −10.83% over all checkpoints; seller15 −0.63 → −8.16%; optimal (a) −5.16 → −16.69%). The short (e) pause is almost free (−0.03% mean).
- **(i) credit exclusion: NOT RUN** (D-HOP-34). PM Workers' readability point (a farm-wide timer stops because of a per-worker action) is open for PM Collection/UX. The UI should show the golden egg and Frenzy as paused.

**G1 window gate and premium** (harness definition: every 10-minute window from F10, seeds 1–200, N = naive, H = Frenzy-holder):
- **GPAUSE=2 is identical to the record:** the output JSON for every cell (window P95/worst, by-band, premium, G4, step) is byte-identical to `out/x30/` and `scratch/v2-econ/out/g5p45/d33/base-x30-*`.
- GPAUSE=1 is identical too:

| Policy | Profile | baseline P95 / worst seed | (ii) P95 / worst seed | premium median F10–19 / F20–29 / L30, baseline | (ii) | Δ premium (pp) |
|---|---|---|---|---|---|---|
| N | optimal | 1.755 / 1.917 | 1.755 / 1.917 | +61.3% / +64.8% / +64.9% | +61.3% / +64.8% / +64.9% | +0.0 / +0.0 / +0.0 |
| N | seller15 | 1.701 / 1.808 | 1.701 / 1.808 | +56.6% / +58.2% / +59.0% | +56.6% / +58.2% / +59.0% | +0.0 / +0.0 / +0.0 |
| N | casual | 1.668 / 1.815 | 1.668 / 1.815 | +53.0% / +53.9% / +54.6% | +53.0% / +53.9% / +54.6% | +0.0 / +0.0 / +0.0 |
| N | slow | 1.334 / 1.475 | 1.334 / 1.475 | +18.6% / +19.7% / +19.9% | +18.6% / +19.7% / +19.9% | +0.0 / +0.0 / +0.0 |
| H | optimal | 1.761 / 1.936 | 1.761 / 1.936 | +58.4% / +63.6% / +63.5% | +58.4% / +63.6% / +63.5% | +0.0 / +0.0 / +0.0 |
| H | seller15 | 1.706 / 1.875 | 1.706 / 1.875 | +52.4% / +55.3% / +56.0% | +52.4% / +55.3% / +56.0% | +0.0 / +0.0 / +0.0 |
| H | casual | 1.662 / 1.858 | 1.662 / 1.858 | +47.0% / +49.8% / +50.9% | +47.0% / +49.8% / +50.9% | +0.0 / +0.0 / +0.0 |
| H | slow | 1.314 / 1.466 | 1.314 / 1.466 | +11.7% / +16.3% / +15.9% | +11.7% / +16.3% / +15.9% | +0.0 / +0.0 / +0.0 |

- Premium Δ = **0.0 pp** on all 8 cells for both variants. The G1 active bots never pause and the idle comparator never pauses, so the freeze never triggers.

**AC7 flag-off:** stack off, seller15 `ac7` bot, seeds 1–200, `m5.ts` vs `m5gp.ts` at GPAUSE=1 and at GPAUSE=2.
- The per-seed reach and final-state trace sha `19d4034d…` is **identical** in both (`scratch/v2-econ/out/g5p45/d33/ac7.json`, `scratch/v2-econ/out/g5p45/d34/ac7.json`).
- L10 fastest / median / P95 8.32 / 10.40 / **12.08** min; L30 47.84 / 49.64 / 50.77 min.
- The game `src/` is untouched, so harness AC7 play-equivalence (§13.2) is unchanged.

**Diagnostics without the fix, seeds 1–200** (these replace the seeds 0–99 numbers in §12, which stay labelled 0–99):

| Run (8dc90e2b, seeds 1–200) | optimal | seller15 | casual | slow |
|---|---|---|---|---|
| (b) lockout 30 | -0.43% mean, worst +2.50% | -0.99% mean, worst +1.80% | -17.01% mean, worst +1.33% | -37.09% mean, worst +2.99% |
| (b) lockout 45 (baseline) | -0.47% mean, worst +1.59% | -0.63% mean, worst +2.62% | -16.09% mean, worst +1.07% | -33.82% mean, worst -0.08% |
| (b) lockout 60 | -0.54% mean, worst +1.65% | -0.96% mean, worst +2.14% | -15.36% mean, worst -1.82% | -33.04% mean, worst +1.40% |
| (b) golden off, lockout 45 | -0.49% mean, worst +0.48% | -0.61% mean, worst +0.17% | -15.36% mean, worst +0.08% | -34.10% mean, worst +0.48% |
| (f) golden off, lockout 45 | -0.06% mean, worst +0.52% | -0.04% mean, worst +0.19% | -0.05% mean, worst +0.11% | -0.24% mean, worst +0.47% |

- Above +2.0%:
  - lockout 30: optimal s19 F10 +2.50 and slow s148 F10 +2.99;
  - lockout 45: seller15 s47, s31;
  - lockout 60: seller15 s188 +2.04 and s192 +2.14.
- Golden off: 0 for both (b) and (f), worst +0.52%. No lockout length passes without the fix.

**Recommendation: ship (ii) as ruled (GPAUSE=2) with no resume wait (none exists)**, and keep `tc_pause_call_lockout_s` 45.
- It touches one system (golden egg and its Frenzy timer) and needs no stock tracking.
- Premium loss is 0 pp for non-pausing play.

**Commands** (`cd scratch/v2-econ/h`):
- G5-P: `CSV=../economy.m50-draft.csv SEEDS=200 S0=1 W=1800 PROFS=<p> SWEEP=A LOCK=45 GPAUSE=<0|1|2> node_modules/.bin/vite-node m5g5p-gp.ts`. With GPAUSE=0 it reproduces `m5g5p.ts` exactly.
- G1: `CSV=../economy.m50-draft.csv SEEDS=200 S0=1 T=<4000|6000 slow> CFG=<AssZ|AssZhold> PROFS=<p> GPAUSE=<1|2> node_modules/.bin/vite-node m5x-gp.ts`.
- AC7: `GP=<1|2> vite-node ac7gp.ts`.
- **Logs:**
  - GPAUSE=2: `scratch/v2-econ/out/g5p45/d34/` (`g2-g5p-*`, `g2-g5p-s0-*`, `g2-x30-*`, `ac7.*`, `doc-tables.md`, `runner.sha`).
  - GPAUSE=1 and baseline: `scratch/v2-econ/out/g5p45/d33/`.
  - Diagnostics: `scratch/v2-econ/out/g5p45/{F-L30,G-nogold-L45,E-*-L60,B}-*`.

## 13. Draft CSV columns (approved in principle, D-HOP-2026-10-24-16 (5); NOT applied to product/economy.csv)
- **Draft file:** `scratch/v2-econ/economy.m50-draft.csv`, sha256 **8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b** (152 cols, 31 rows). It is `product/economy.csv` c7bb783f with 29 columns appended and two value changes. Every new value is constant across L0–30.
- **Sign-off diff:** `scratch/v2-econ/m50-draft.diff`. It has a header that lists the changed cells and the added columns, followed by a raw `diff -u`.
- **Broody naming:** `sync-economy.ts:203` auto-maps only `tc_*` columns into `balance.m4.tc.<name>`. The Broody columns are now **`tc_broody_*`** in the draft file (D-HOP-16 (5)).
- **Other rulings carried:** `tc_ability_w2_mode` 0 = Sweep A (D-HOP-16 (1)); `tc_pause_call_lockout_s` 45 (3); `w2_asleep_collect_share` 0.15 (6).

### 13.1 Diff summary for sign-off (draft vs `product/economy.csv` c7bb783f)

| Change | Columns | Rows | Old → new | Ruling |
|---|---|---|---|---|
| Value change | `tc_streak_cap` | L0–30 (31) | 0.4 → 0.28 | draft approved in principle (D-HOP-16 (5)); R9 / P1 |
| Value change | `w2_asleep_collect_share` | L0–30 (31) | 0.20 → 0.15 | D-HOP-16 (6) |
| Added (cols 124–126) | `tc_first_spawn_s`, `tc_warn_at_s`, `tc_urgent_at_s` | all | — → 45, 20, 27 | golden egg v0.5 |
| Added (127, 137) | `tc_streak_unlock_farm`, `tc_streak_tier_count` | all | — → 8, 4 | streak / A2 |
| Added (128–130) | `tc_tap_income_share`, `tc_tap_credit_min_s`, `tc_tap_bonus_income_window_s` | all | — → 0.03, 1.0, 60 | A1 |
| Added (131–135) | `tc_broody_income_share`, `tc_broody_cap_s`, `tc_broody_ready_share`, `tc_broody_unlock_worker`, `tc_broody_max_on_screen` | all | — → 0.05, 150, 0.5, 2, 1 | D-HOP-16 (5) naming |
| Added (136, 138, 139) | `tc_ability_unlock_farm`, `tc_ability_w2_mode`, `tc_ability_energy_cost` | all | — → 10, 0, 0 | D-HOP-06; D-HOP-16 (1) |
| Added (140–142) | `tc_pause_unlock_farm`, `tc_pause_toggle_debounce_s`, `tc_pause_call_lockout_s` | all | — → 10, 2, 45 | D-HOP-06(b); D-HOP-16 (3) |
| Added (143) | `tc_spawn_grace_ms` | all | — → 250 | golden egg R19 fresh-spawn tap grace (`collection/m5-golden-egg-spec.md:145`, :230); PM Collection request. UI/input tolerance only, so no pacing effect and no sim |
| Added (144–148) | `tc_stall_hold_s`, `tc_stall_hold_nomh_s`, `tc_stall_hold_paused_s`, `tc_stall_rearm_s`, `tc_stall_tap_guard_ms` | all | — → 8, 20, 20, 5, 500 | Sales-stopped chip, `market/sales-stopped-spec.md` v1.3.2 §6 (:193–197). `tc_stall_min_show_s` was dropped by D-HOP-2026-10-24-20. UI only, no sim |
| Added (149–152) | `tc_fatigue_cue_min_share`, `tc_fatigue_cue_hold_s`, `tc_fatigue_cue_clear_share`, `tc_fatigue_cue_clear_hold_s` | all | — → 0.15, 5, 0.12, 2 | Fatigue Rules 2–4, same spec §6 (:199–202). `tc_` prefix ruled by HoP/HoE because sync drops unprefixed columns; no `fatigue_explainer_*` columns. UI only, no sim |
| Removed / reordered | none | — | — | the 123 base columns keep their order |
| **Not added** | `guard_heartbeat_s`, `guard_stale_s` | — | — | D-HOP-25 amendment (`decisions.md:351`) dropped them from the product lineage (125 → 123 cols; they exist only in the old game copy b48be8a4). No M5 spec cites them (`rg` over product/ finds only historical CSVs, the patch, the Python sim and decisions.md). I had re-added them on HoE's §9.5(3) note; removed again (D-HOP-2026-10-24-22) |

- **SS-21 merge gate (`sales-stopped-spec.md:292`; hard gate, no waiver):** for seeds 0–99, the `bestBuy` sequence and the AC7 and L10 bot traces must be byte-identical with the chip and Rules 2–4 on vs off.
  - The spec's literal wording also requires every pre-existing L0–30 cell to equal c7bb783f, with only its sales-stopped columns added (9 after D-HOP-20). **This combined draft would fail that wording**, because it carries `tc_streak_cap` 0.40 → 0.28 and `w2_asleep_collect_share` 0.20 → 0.15.
  - **For HoP/HoE, pick one:** (a) land the 9 stall/fatigue columns in their own PR on c7bb783f; or (b) amend SS-21 to "pre-existing cells identical except the D-HOP-16 value changes".
  - Those two cells have no reader at a05bc74. So the bot-trace part of SS-21 is unaffected either way; §13.2 shows this as harness play-equivalence.
- **G10 note (no CSV column the game doesn't read):** none of the 29 new columns has a reader. They are all `tc_*`, so sync maps them into `m4.tc` and the harness's G10 perturbation counts them as read (§13.2) at a05bc74. Apply the draft together with the M5.0 feature PRs, or allowlist the columns for G10 until then.

### 13.2 Harness-of-record re-measure (HoO harness `scripts/measure-l30plus.ts`)
**Provenance:**
- Code `a05bc74d689b2d4468937629875fcd0aaf1e7476`, harness blob `75c864752b5a` (= committed blob), tree **clean** (`code.dirty` false).
- Run from a detached `git worktree` of a05bc74 at `scratch/v2-econ/hor-a05bc74/`. node_modules is a symlink, the shared `wt-m41-integrated` checkout was left untouched, and nothing was modified or committed.
- Command: `cd scratch/v2-econ/hor-a05bc74 && npm run measure:l30plus -- <csv> --out ../out/hor/<k>`. Defaults are the gate run: seeds 1–200, T 14400 s, `--equiv-until first-l30plus-buy`. The baseline is `scratch/m41-5-drop/economy.dropped8.csv` = c7bb783f (pin matches).
- Output: `scratch/v2-econ/out/hor/{prod,draftF,t3,t3draftF}/{result.json,summary.txt}`.
- The T3 rows use the splice (L31+ from N0b_C150) with the same draft columns appended (`t3draft` sha 43977349…).

| gates.md card | prod c7bb783f | **draft 45095351 (= final 8dc90e2b + 2 guard cols)** | T3 splice 366d3a04 | **T3 + draft 43977349** |
|---|---|---|---|---|
| G1 step P95 F28+ (≤ 2.00) | 1.726 PASS | **1.726 PASS** | 3.273 FAIL (F30+ ref 2.604) | **3.273 FAIL** (identical) |
| G2 step worst F28+ (≤ 2.25) | 1.999 (s165) PASS | **1.999 PASS** | 4.185 (s23) FAIL | **4.185 FAIL** (identical) |
| G3 top-step share F28+ (≤ 25%) | F29 97.5% FAIL¹ | **F29 97.5% FAIL¹** | F30 63.0% FAIL | **F30 63.0% FAIL** |
| G4 no-purchase stretch F28+ worst / P95 (≤ 180 s) | 146 / 138 PASS | **146 / 138 PASS** | 360 / 332 FAIL | **360 / 332 FAIL** |
| G5 workers L10 P95 (≤ 12.1) | 12.08 (margin 0.022) PASS | **12.08 PASS** | 12.08 PASS | **12.08 PASS** |
| no-workers L10 P95 | 12.02 | **12.02** | 12.02 | **12.02** |
| G6 acw1 | PASS | **PASS** | PASS | **PASS** |
| G7 L0–30 bytes / L30 row / play-equivalence | PASS / PASS / PASS | **FAIL² / FAIL² / PASS 200/200** | PASS / PASS / FAIL (184/200, L30+ reshape) | FAIL² / FAIL² / FAIL (184/200, identical to T3) |
| G8 sync + validateBalance | PASS | **PASS** (all 31 new columns parse; `tc_*` land in `m4.tc`) | PASS | **PASS** |
| G9 costs strictly rising | PASS | **PASS** | PASS | **PASS** |
| G10 unread columns | 16 FAIL (pre-existing allowlist set) | 18 FAIL: the +2 were `guard_heartbeat_s` / `guard_stale_s`, now dropped. **Final 8dc90e2b = 16, same as prod** | 16 FAIL | 18 → 16 after the drop |

¹ On main the F28+ window holds only F28–F29, so one level is always the top step. This is pre-existing.
² The 62 cell diffs are exactly the two ruled value changes × 31 rows (`tc_streak_cap` 0.4 → 0.28, `w2_asleep_collect_share` 0.20 → 0.15). Neither cell has a reader, so play-equivalence is **200/200 hash-identical through F31**.

**Reading:**
- **No regression vs c7bb783f.** Every pacing number is identical (L10, step, G4, per-level times) and play-equivalence is 200/200. The draft's only G7 "FAIL" is the two intended cells, which the approval card has to cover explicitly.
  - The same evidence covers the bot-trace part of SS-21 for these cells.
- **G10:** the 29 `tc_*` columns count as read (sync maps them). The only new unread columns were the 2 `guard_*`, which are now dropped, so the final draft adds nothing to G10.
- **Provenance note:** the harness ran on 45095351, which is the final 8dc90e2b plus the 2 `guard_*` columns. Those columns are unread (the G10 perturbation proves it), so every pacing and trace result carries over byte-for-byte. A confirmatory run on 8dc90e2b can go into the CI gate (X1).
- **T3:** the draft changes nothing (identical G1–G9). The T3 FAILs are the parked L30+ reshape's.

**What the harness of record can't measure yet**, and why: at a05bc74, `git grep` in `src/` finds no golden egg, streak, A1 tap coins, Broody, abilities/Sweep or Pause logic. There is only a placeholder comment at `src/sim/payout.ts:7` ("M4 adds streak / frenzy entries here") plus "paused" comments in `econ/income.ts:33,46`. The harness's bots (`runM2` seller15, `runBot`) can't tap for golden eggs, cast calls or pause. The README also forbids env knobs or alternative bots.

| M5.0 gate | Measurable on HoR now? | Needed |
|---|---|---|
| Window gate (M4-AC24, 10-min active ÷ idle, P95 ≤ 2.0 / worst ≤ 2.25) | **No.** No mechanics in src, no active bot, no window metric | The M5.0 features merged behind `m4.flags.*`, plus a reviewed harness commit: an active-bot profile set (optimal / seller15 / casual, naive and frenzy-holder casts), the window-ratio metric and `--m5 on` |
| M5.0 deltas on G1/G2/G4 (step, nothing-affordable) | **No.** The draft only proves the mechanic-free baseline is unchanged | Same as above; then the same-seeds +0.10 step rule after the L30+ reshape (D-HOP-16 (2)) |
| G3 top step and G5 workers L10 with M5.0 on | Baseline only (unchanged) | Same |
| G5-P Pause patterns (a)–(g) | **No.** Pause isn't in src; the bots never pause | Pause built (rule 3, 0.25× via `rest_recovery_mult`), plus a harness pause-pattern driver and the managed-income window metric (pause spec §10) |
| SS-21 (sales-stopped trace identity) | **Partly.** The cell part is shown above; the chip on/off part needs the chip built | Chip behind `m4.flags.salesStopped`; run with the flag on and off |

Until then, the M5.0 numbers in §6.1 and §10–12 are **SCRATCH** (runner `m5.ts`) and are labelled that way.

### 13.2a Acceptance criterion X1 (D-HOP-2026-10-24-22): harness-of-record M5.0 CI merge gate `pacing-x1-stack`
- **Paper build-ready** is shown by the scratch runner re-run to the **harness definition** on the **shipping CSV**:
  - `scratch/v2-econ/economy.m50-draft.csv` sha256 **8dc90e2b…996b**, **L0–30 only** (max level 30, T 4000 s; 200/200 seeds reach L30)
  - every 10-minute window from F10 to L30, seeds **1–200**
  - Sweep A, `tc_pause_call_lockout_s` 45, the I_ss = 0 stall rule (`AssZ`: warm-up I_ss, and an instant 0 while a hired, unpaused Market Hand is Asleep or Unpaid); N = naive casts (`AssZ`), H = frenzy-holder (`AssZhold`)
- **Commands** (`cd scratch/v2-econ/h`):
  - windows: `CSV=../economy.m50-draft.csv SEEDS=200 S0=1 T=4000 CFG=<AssZ|AssZhold> PROFS=<p> node_modules/.bin/vite-node m5x.ts` → `scratch/v2-econ/out/x30/` (935–1,005 windows per profile × policy)
  - step + G4 + baseline: same with `CFG=<none|AssZ|AssZhold> NOWIN=1 STEP_FROM=11` → `scratch/v2-econ/out/x30s/`
  - **SCRATCH.** The T3-lineage run (`t3-draft.csv` dd301dfd…, to L50, `scratch/v2-econ/out/x/`) is kept below as reference for the L30+ known risk only; it is not part of X1.
- **Approximations (labelled; both apply to every window number below):**
  - **(A1) Window starts every 300 s**, from F10 until L30 (overlapping 600 s windows at a half-window step), not every second. A burst shorter than 300 s can fall between two starts, but every 600 s span overlaps at least one measured window by ≥ 300 s.
  - **(A2) Timers reset per window.** Each window replays 600 s from the live game state with no buys, but the runner's mechanic timers start fresh: streak 0, all calls ready, no Frenzy, empty Broody nest, golden egg schedule re-drawn. Calls being ready at t = 0 tends to over-state the ratio slightly (conservative); a streak starting at 0 under-states it by ≤ 28 s × 0.28.
  - The idle reference is the idle bot (no taps, catches or calls) from the same state and seed.
- **AC-X1 (merge gate, before any M5.0 flag ships on):** once the M5.0 mechanics land behind `m4.flags.*`, Engineering extends `measure:l30plus` through a reviewed harness commit (profiles below, both call policies, this window metric, a G5-P pause-pattern driver).
  - Every value must come in within **±20% of the prediction**, and every absolute gate marked blocking must hold.
  - A value outside the band blocks the merge until Economy reconciles it. Economy does not retune to make the band; it explains the gap or re-predicts with HoP sign-off.
- **CI check `pacing-x1-stack`** (named by HoE; HoE owns it; it is both the CI job name and the GitHub status-check name, cited on every row):
  - Runs on **every PR and every merge**.
  - Checks the **whole enabled M5.0 stack** on 8dc90e2b, **plus each flag's off-vs-on delta** (one flag toggled at a time against the stack, same seeds).
  - Rows marked **Y fail the check** (block merge); rows marked **N are warnings** only.
  - It becomes a **required** status check only after Vadim's go; until then it runs and reports but does not gate.

**Final X1 prediction table** (8dc90e2b, L0–30, seeds 1–200; window rows per A1/A2; profile cells are optimal / seller15 / casual):

| Metric | Policy | optimal | seller15 | casual | ±20% band | Absolute gate | Blocks merge | CI check | Result |
|---|---|---|---|---|---|---|---|---|---|
| G1 window ratio P95, all windows F10–30 | N | 1.755 | 1.701 | 1.668 | ×0.8–1.2 | ≤ 2.00 | Y | `pacing-x1-stack` | PASS |
| | H | 1.761 | 1.706 | 1.662 | ×0.8–1.2 | ≤ 2.00 | Y | `pacing-x1-stack` | PASS |
| G1 window ratio P95 of each seed's worst window | N | 1.791 | 1.758 | 1.739 | ×0.8–1.2 | ≤ 2.00 | Y | `pacing-x1-stack` | PASS |
| | H | 1.813 | 1.767 | 1.735 | ×0.8–1.2 | ≤ 2.00 | Y | `pacing-x1-stack` | PASS |
| G1 window ratio, worst seed | N | 1.917 | 1.808 | 1.815 | ×0.8–1.2 | ≤ 2.25 | Y | `pacing-x1-stack` | PASS |
| | H | **1.936** | 1.875 | 1.858 | ×0.8–1.2 | ≤ 2.25 | Y | `pacing-x1-stack` | PASS |
| Window ratio median | N / H | 1.656 / 1.636 | 1.585 / 1.556 | 1.542 / 1.489 | ×0.8–1.2 | — | N | `pacing-x1-stack` | info |
| Window ratio by band P95, F10–17 / F18–23 / F24–29 | N | 1.75 / 1.77 / 1.74 | 1.69 / 1.72 / 1.69 | 1.64 / 1.70 / 1.67 | ×0.8–1.2 | — | N | `pacing-x1-stack` | info |
| | H | 1.75 / 1.78 / 1.75 | 1.67 / 1.73 / 1.71 | 1.65 / 1.68 / 1.66 | ×0.8–1.2 | — | N | `pacing-x1-stack` | info |
| Active premium (mech ÷ passive), median F10–19 / F20–29 / at L30 | N | +61.3 / +64.8 / +64.9% | +56.6 / +58.2 / +59.0% | +53.0 / +53.9 / +54.6% | ×0.8–1.2 | budget +50%: accepted if G1 holds (D-HOP-21) | N | `pacing-x1-stack` | over budget, accepted |
| | H | +58.4 / +63.6 / +63.5% | +52.4 / +55.3 / +56.0% | +47.0 / +49.8 / +50.9% | ×0.8–1.2 | (same) | N | `pacing-x1-stack` | over budget, accepted |
| Step ratio P95, per level L11–30 (no-mechanics baseline 2.989 / 3.392 / 3.589) | N | 2.407 (**−0.58**) | 2.418 (**−0.97**) | 2.655 (**−0.93**) | ×0.8–1.2 on the value | delta ≤ +0.10 vs baseline, same seeds | Y | `pacing-x1-stack` | PASS |
| | H | 2.435 (−0.55) | 2.602 (−0.79) | 2.818 (−0.77) | ×0.8–1.2 on the value | delta ≤ +0.10 | Y | `pacing-x1-stack` | PASS |
| Step ratio worst seed, L11–30 (baseline 3.453 / 3.927 / 4.687) | N | 2.608 (−0.85) | 2.913 (−1.01) | 3.147 (−1.54) | ×0.8–1.2 on the value | delta ≤ +0.10 | Y | `pacing-x1-stack` | PASS |
| | H | 2.634 (−0.82) | 3.157 (−0.77) | 3.801 (−0.89) | ×0.8–1.2 on the value | delta ≤ +0.10 | Y | `pacing-x1-stack` | PASS |
| G4 longest nothing-affordable F10–30, P50 / P95 / worst (s), any-row (M5.0 record, D-HOP-30; kept by D-HOP-2026-10-24-36 (2)) (baseline 129/260/381, 110/196/305, 103/149/226) | N | 84 / 160 / 234 | 77 / 126 / 294 | 70 / 126 / 196 | ×0.8–1.2 | worst ≤ baseline worst, same seeds | Y | `pacing-x1-stack` | PASS (improves) |
| | H | 84 / 166 / 272 | 78 / 142 / 231 | 73 / 141 / 216 | ×0.8–1.2 | worst ≤ baseline worst | Y | `pacing-x1-stack` | PASS (improves) |
| G4 P95 ≤ 180 s, any-row (D-HOP-2026-10-24-30 (2); D-HOP-36 (2)) | N / H | 160 | 126 | 126 | ×0.8–1.2 | P95 ≤ 180 s | Y | `pacing-x1-stack` | PASS (126–166 s) |
| G4 absolute ≤ 180 s, worst seed, any-row (D-HOP-2026-10-24-30 (3): warning, pre-existing L0–30 dead zone, CEO known risk) | N / H | 234 / 272 | 294 / 231 | 196 / 216 | — | ≤ 180 s | N | `pacing-x1-stack` | **FAIL, pre-existing** (baseline 226–381 also fails; P95 126–166 is under 180) |
| G4 **meaningful rows** (D-HOP-2026-10-24-35; FARM and W* always count, D-HOP-36 (3)), P50 / P95 / worst (s) (baseline 225/381/567, 153/260/381, 129/218/271) | N | 135 / 231 / 286 | 95 / 162 / 294 | 80 / 158 / 200 | ×0.8–1.2 | reported in M5.0 (D-HOP-36 (2)); P95 ≤ 180 s becomes a Y gate at M5.1 exit | N | `pacing-x1-stack` | **warning**: P95 > 180 on optimal N/H (231/237) and seller15 H (182); baseline fails too (P95 218–381), pre-existing L0–30 dead zone, fixed in the M5.1 L0–30 unfreeze |
| | H | 135 / 237 / 292 | 104 / 182 / 277 | 82 / 162 / 219 | ×0.8–1.2 | (same) | N | `pacing-x1-stack` | warning (same) |
| G5 workers L10 P95 (min) | N | 11.05 | 11.37 | 14.11 | ×0.8–1.2 | ≤ 12.1 (seller15) | Y | `pacing-x1-stack` | PASS |
| L30 median (min) | N | 34.4 | 35.2 | 37.2 | ×0.8–1.2 | — | N | `pacing-x1-stack` | info |
| Peak per-sale multiplier, F18 | any | ×4.51 | ×4.51 | ×4.51 | exact (formula) | — | N | `pacing-x1-stack` | info |
| SS-21 sales-stopped chip on vs off | bots | identical traces | identical | identical | exact (byte-identical) | identical | Y | `pacing-x1-stack` | predicted identical (UI-only columns, no reader in sim) |
| AC7 with every M5.0 flag off vs c7bb783f | ac7 | byte-identical | — | — | exact | identical | Y | `pacing-x1-stack` | PASS on paper (play-equivalence 200/200, §13.2) |
| Each flag off vs on, alone | N | §6.1 per-source row ±20% | | | ×0.8–1.2 | no single flag pushes G1 past its gate | Y | `pacing-x1-stack` | predicted PASS |
| G5-P (a) yawn pause, **fix (ii) as ruled (GPAUSE=2)**, mean Δ F10/F18/F24 (worst seed-checkpoint), 8dc90e2b seeds 1–200 | — | −16.5 / −17.2 / −16.3% (−11.32% s188 F10) | −16.9 / −18.3 / −22.2% (−8.14% s37 F18) | −39.1 / −42.1 / −48.6% (−26.81% s108 F10) | sign + ≤ limit | ≤ +1.0% mean, every seed-checkpoint ≤ +2.0% (strict, D-HOP-33) | Y | `pacing-x1-stack` | PASS; slow −60.0 / −59.0 / −66.1% (−20.50% s148 F10). GPAUSE=1 reference in §12a |
| G5-P (b) stockpile-and-Rush, lockout 45, **fix (ii) as ruled (GPAUSE=2)**, mean Δ F10/F18/F24 (worst seed-checkpoint), 8dc90e2b seeds 1–200 | — | −11.0 / −11.1 / −10.3% (−6.69% s185 F10) | −8.3 / −8.4 / −7.8% (−1.90% s183 F18) | −19.1 / −17.6 / −24.6% (−2.73% s157 F18) | sign + ≤ limit | ≤ +1.0% mean, every seed-checkpoint ≤ +2.0% (strict, D-HOP-33) | Y | `pacing-x1-stack` | PASS; slow −38.7 / −33.7 / −37.8% (−5.24% s108 F10). GPAUSE=1 reference in §12a |
| G5-P (c) bench Market Hand, **fix (ii) as ruled (GPAUSE=2)**, mean Δ F10/F18/F24 (worst seed-checkpoint), 8dc90e2b seeds 1–200 | — | −15.3 / −15.6 / −14.5% (−10.62% s70 F18) | −12.4 / −12.8 / −12.2% (−5.43% s37 F18) | −31.6 / −35.5 / −44.6% (−16.64% s86 F10) | sign + ≤ limit | reported only | N | `pacing-x1-stack` | reported; slow −57.5 / −57.8 / −63.5% (−17.89% s148 F10). GPAUSE=1 reference in §12a |
| G5-P (d) Grader pause at ≤ 50%, **fix (ii) as ruled (GPAUSE=2)**, mean Δ F10/F18/F24 (worst seed-checkpoint), 8dc90e2b seeds 1–200 | — | +0.0 / +0.0 / −59.9% (+0.00% s1 F10) | +0.0 / +0.0 / −57.5% (+0.00% s1 F10) | +0.0 / +0.0 / −59.0% (+0.00% s1 F10) | sign + ≤ limit | ≤ never-pause | Y | `pacing-x1-stack` | PASS; slow +0.0 / +0.0 / −53.5% (+0.00% s1 F10). GPAUSE=1 reference in §12a |
| G5-P (e) short pause, **fix (ii) as ruled (GPAUSE=2)**, mean Δ F10/F18/F24 (worst seed-checkpoint), 8dc90e2b seeds 1–200 | — | +0.0 / +0.0 / −0.1% (+1.35% s25 F24) | −0.0 / −0.0 / −0.1% (+1.01% s50 F10) | −0.0 / −0.1 / −0.2% (+1.14% s120 F18) | sign + ≤ limit | ≤ +1.0% mean, every seed-checkpoint ≤ +2.0% (strict, D-HOP-33) | Y | `pacing-x1-stack` | PASS; slow +0.0 / −0.0 / −0.0% (+1.18% s43 F10). GPAUSE=1 reference in §12a |
| G5-P (f) full-coop pause, **fix (ii) as ruled (GPAUSE=2)**, mean Δ F10/F18/F24 (worst seed-checkpoint), 8dc90e2b seeds 1–200 | — | −3.2 / −1.2 / +0.0% (+1.26% s34 F10) | −2.1 / −0.7 / +0.0% (+0.78% s31 F18) | −2.0 / −0.3 / +0.0% (+1.11% s19 F18) | sign + ≤ limit | ≤ +1.0% mean, every seed-checkpoint ≤ +2.0% (strict, D-HOP-33) | Y | `pacing-x1-stack` | PASS; slow −2.4 / −0.3 / +0.0% (+0.89% s116 F18). GPAUSE=1 reference in §12a |
| G5-P (g) wage-skip bench, **fix (ii) as ruled (GPAUSE=2)**, mean Δ F10/F18/F24 (worst seed-checkpoint), 8dc90e2b seeds 1–200 | — | −16.5 / −16.8 / −16.0% (−11.99% s70 F18) | −13.5 / −14.0 / −13.5% (−6.61% s37 F18) | −31.6 / −35.5 / −44.6% (−16.56% s86 F10) | sign + ≤ limit | ≤ +1.0% mean, every seed-checkpoint ≤ +2.0% (strict, D-HOP-33) | Y | `pacing-x1-stack` | PASS; slow −57.5 / −57.7 / −63.5% (−17.89% s148 F10). GPAUSE=1 reference in §12a |
| **G5-P pause-driver summary, (a)–(g)**, fix (ii) as ruled (GPAUSE=2), lockout 45, 4 profiles | all profiles | **seed-checkpoints > +2.0% / > +2.5%: 0 / 0 of 14,400** (GPAUSE=1 reference 0 / 0; baseline without fix 5 / 2); worst +1.35% (e) optimal s25 F24; every mean ≤ +0.00%; Frenzy carry-over adds ≤ +0.43 pp to any worst seed ((b)); 0–99 cross-check 0 / 0 of 7,200 | | | mean ≤ +1.0%; every seed-checkpoint ≤ +2.0% | — | Y (D-HOP-33 strict band) | `pacing-x1-stack` | **PASS with fix (ii) as ruled**. Without the fix: FAIL (§12a) |

- **Row sources:**
  - G1, premium, step L11–30 and G4 rows: this re-run on 8dc90e2b L0–30 (`scratch/v2-econ/out/x30/`, `scratch/v2-econ/out/x30s/`).
  - Workers L10 and L30 median: the §10 100-seed checkpoint (seeds 0–99), because `m5x.ts` doesn't record them. The T3 splice rows L0–30 equal 8dc90e2b's, so they carry over. The harness of record measures them natively; on the mechanic-free draft it gives L10 P95 12.08 (§13.2).
  - G5-P rows: **fix (ii) as ruled, GPAUSE=2** (§12a), 8dc90e2b, seeds 1–200, lockout 45, `scratch/v2-econ/out/g5p45/d34/g2-g5p-*`. The GPAUSE=1 countdown-only reference is in `scratch/v2-econ/out/g5p45/d33/ii-g5p-arg-*`. G5-P is per-checkpoint at F10/F18/F24, so it is L0–30 by construction. The CI pause rows run on 8dc90e2b seeds 1–200 (the seeds of record); 0–99 is a labelled cross-check only.
- **G5-P 200-seed check, baseline WITHOUT the fix** (lockout 45, shipping CSV 8dc90e2b, seeds 1–200, all of (a)–(g), `scratch/v2-econ/out/g5p45/B-*`; superseded by fix (ii), §12a; with slow added the baseline count is 5 / 2 of 14,400):
  - Command: `cd scratch/v2-econ/h && CSV=../economy.m50-draft.csv SEEDS=200 S0=1 W=1800 PROFS=<p> SWEEP=A LOCK=45 node_modules/.bin/vite-node m5g5p.ts`.
  - Every pattern runs on 8dc90e2b, because F10/F18/F24 snapshots and no-buy play never need L31+. All 200 seeds reach every checkpoint.
  - The results match the T3 splice: L0–30 rows are identical, so every seed in 0–99 gives the same value. The (b) seller15 outliers are the same seeds (31, 47), and the optimal (f) outlier is the same seed (19, +2.52%).
  - Means are ≤ +0.00% for every pattern, profile and checkpoint, and (d) is ≤ never-pause.
  - **Seed-checkpoints > +2.0%: 4 of 10,800 gated** (200 seeds × 3 checkpoints × 3 profiles × 6 gated patterns): (b) seller15 s47 F10 +2.62 and s31 F18 +2.37; (f) optimal s19 F10 +2.52 and casual s169 F10 +2.36. The 100-seed splice misses casual s169.
  - **Result: FAIL on the D-HOP-28 band.** No pattern has its mean above +1.0%.
- **Step rows:** the L11–30 per-level step ratio is **not** a `gates.md` absolute gate (G1/G2 are L30+). In X1 it is a delta check only: the stack must not add more than +0.10 over the no-mechanics run. It lowers it by 0.55–0.97 at P95.
- **G4 (D-HOP-2026-10-24-30):** worst seed no worse than the same-seeds no-mechanics baseline = Y (PASS); P95 ≤ 180 s = Y (PASS, 126–166 s); worst seed ≤ 180 s absolute = N (warning: pre-existing L0–30 dead zone, baseline 226–381 s, flagged to the CEO as a known risk since L0–30 is frozen).
- **G4 meaningful rows (D-HOP-2026-10-24-35, 19:10; applies from M5.1 on).** The rows above did **not** exclude zero-gain rows before this edit: "affordable" was any `candidates()` row with coins ≥ cost (`m5.ts:104`). On 8dc90e2b (today's bot, 9 cells, seeds 1–200, `g4m2.log`) the zero-gain rows that were ever affordable are: **every Collection row (COLL; `incomePerSec` has no tap term), 22k–223k seed-seconds per cell**; **FARM at F10–F29 in states where the next step only raises caps (immediate `optionGain` 0), 14k–96k seed-seconds per cell**; and **W2 (Coop Hand hire), 40 seed-seconds, casual no-mechanics only**. HENS, VALUE, W1, W3 and W4 never showed a zero-gain affordable second on today's bot (on PMFU's BBv2 picker, HENS and W3 also do).
  - **Definition used:** a second counts as affordable only if some `candidates()` row has coins ≥ cost **and** `optionGain(s,b,key).gain > 0`, with FARM and W1–W4/Grader always counted (the BBv2-1 exemption in `farm/m5.1-bestbuy-rebaseline-proposal.md` §2; PMFU's BB-5 sense). Strict gain > 0 with no FARM exemption gives 280–706 s worst and 355–549 s P95, because Farm steps read as zero-gain; I don't recommend it. Confirmed by D-HOP-36 (3).
  - **Re-measure:** `scratch/m51-econ/ac22/g4/` (runner = `scratch/m51-econ/h/m5.ts` copy + measurement-only `G4M=1` flag, `m5g4.ts`/`g4.ts`), 8dc90e2b, seeds 1–200, T 4000, breeds off. With the flag on, the any-row numbers reproduce the record exactly on all 9 cells (none/AssZ/AssZhold × seller15/optimal/casual), so gameplay is unchanged and only the counting moves. 138–185 seeds per cell move.
  - **Effect:** clause (1) still passes everywhere; P95 ≤ 180 is over on optimal N/H (231/237) and seller15 H (182), with the no-mechanics baseline over too (218–381). **D-HOP-2026-10-24-36 (2):** M5.0 X1 keeps the any-row G4 rows (Y, PASS); the meaningful-rows G4 is an N (warning) row in M5.0 and a Y gate (P95 ≤ 180 s) at M5.1 exit. **(3):** FARM and worker rows always count. **M5.1 risk for the L0–30 unfreeze:** PMFU's BBv2 bot measures P95 197–199 s (> 180), with Farm-first hatching +5 s on the worst seed (226 → 231); see the BB-10 note in `scratch/m51-econ/ac22/g4/bb10-gate-note.md`.
- **G5-P bands (D-HOP-2026-10-24-33, strict; replaces the D-HOP-28 (f) exception):** every pattern's mean ≤ +1.0%; (d) ≤ never-pause; **every** seed-checkpoint ≤ +2.0%. Without the fix, the (b) re-run at lockout 45 (D-HOP-30 (4)) fails on seller15 (+2.62% / +2.37%) and (f) fails on 3 profiles. **With fix (ii) as ruled (GPAUSE=2), all 14,400 gated seed-checkpoints are ≤ +2.0% (worst +1.35%): PASS** (§12a).
- **Reference only, not X1 (T3 lineage `t3-draft.csv` dd301dfd…, to L50, `scratch/v2-econ/out/x/`):** G1 window worst 1.917 / 1.816 / 1.815 (N), 1.936 / 1.875 / 1.858 (H), PASS. L30+ step P95 2.681 / 3.146 / 3.370 (N) and 3.312 / 3.270 / 3.622 (H) vs the no-mechanics 2.467 / 2.604 / 2.794: **+0.21 to +0.85, known risk** after the L30+ reshape (D-HOP-16 (2)).

### 13.3 Column detail
| Column (proposed name) | Value | Unit | Rationale / source |
|---|---|---|---|
| `tc_first_spawn_s` | 45 | s | Golden egg v0.5 first spawn after unlock (sizing §8.2) |
| `tc_warn_at_s` | 20 | s | v0.5 warning cue |
| `tc_urgent_at_s` | 27 | s | v0.5 urgent cue (lifetime 30 s) |
| `tc_streak_cap` (existing, **value change**) | 0.28 | mult add | R9 / P1. Sims in §8 and §10 use 0.28. The CEO's 0.30 also passes the window gate (ESTIMATE: +0.02 on P95); 0.40 is what `decisions.md:171` measured at worst 1.93 |
| `tc_streak_unlock_farm` | 8 | Farm | Same as the golden egg unlock (F8) |
| `tc_streak_tier_count` | 4 | tiers | A2 tier step: 4 tiers of 0.07 up to the 0.28 cap |
| `tc_tap_income_share` | 0.03 | × ref income per credited tap | P1 / A1 |
| `tc_tap_credit_min_s` | 1.0 | s (sim time) | One credited tap per second. A credited tap is any Collect tap, egg or not (resolves sizing §8.2 #4 on the A1 side; the streak uses the same credit) |
| `tc_tap_bonus_income_window_s` | 60 | s | Reference income = trailing 60 s of passive sale coins (resolves #5: Grader passive yes; golden cash, Frenzy, calls, streak, Broody and tap coins no) |
| `tc_broody_income_share` | 0.05 | × ref income /s | P1 Broody fill rate |
| `tc_broody_cap_s` | 150 | s | Nest is full after 150 s |
| `tc_broody_ready_share` | 0.5 | of cap | The "ready" glow shows at half full |
| `tc_broody_unlock_worker` | 2 | worker index | Unlocks at the first Coop Hand hire (W2) |
| `tc_broody_max_on_screen` | 1 | count | One nest |
| `tc_ability_unlock_farm` | 10 | Farm | D-HOP-06; specs v1.2 |
| `tc_ability_energy_cost` | 0 | energy % | 0 in M5.0; 10 is M5.1 [P] (§5 model) |
| `tc_ability_w2_mode` | 0 | 0 = lay (A), 1 = price (B) | **Ruled A** (D-HOP-16 (1)); no price-mult column |
| `tc_pause_unlock_farm` | 10 | Farm | D-HOP-06(b) |
| `tc_pause_toggle_debounce_s` | 2 | s | Pause spec v1.2 (UI only) |
| `tc_pause_call_lockout_s` | **45** | s (sim) | Guard G2. **Ruled 45** (D-HOP-16 (3)); the spec draft was 30. G5-P pattern (b) worst seed: +2.5% at 30, +1.6% at 45 (§12, optimal, seeds 0–99). Seeds 1–200, all profiles: no lockout passes without fix (ii) (§12a) |
| `tc_spawn_grace_ms` | 250 | ms | Golden egg R19: ignore a pointer-down within 250 ms of the spawn becoming visible (`m5-golden-egg-spec.md:145`). Input tolerance; no pacing effect |
| `tc_stall_hold_s` / `_hold_nomh_s` / `_hold_paused_s` / `_rearm_s` / `_tap_guard_ms` | 8 / 20 / 20 / 5 / 500 | s, ms | Sales-stopped chip (sales-stopped-spec v1.3.2 §6; `_min_show_s` dropped, D-HOP-20). UI only; SS-21 trace gate |
| `tc_fatigue_cue_min_share` / `_hold_s` / `_clear_share` / `_clear_hold_s` | 0.15 / 5 / 0.12 / 2 | share, s | Fatigue cue Rules 2–4 (same §6); clear_share < min_share is validated on load. UI only |

**Sync mapping: columns in the CSV that the game doesn't read yet** (read-only check of `scratch/v2-econ/h` = `wt-m41-integrated` a05bc74: no hits in `src/` or `src/config/balance.json`):

| Column | Current CSV value | Intended game consumer | Code location (read-only) | Proposed `balance.json` key | Change after modelling? |
|---|---|---|---|---|---|
| `rest_recovery_mult` | 0.25 | Paused-worker energy recovery: `energy += dt × mult / drain_s_per_pct`, +1% per 36 s (pause spec v1.2 rule 3) | `src/sim/tick.ts:18`, the per-worker energy update (add a `paused` branch next to the drain); validate in (0, 0.35] in `validateBalance` | `workers.energy.rest_recovery_mult`, an explicit map in `sync-economy.ts` next to `drain_s_per_pct` | **No.** Keep 0.25 (locked, `decisions.md:9`); G5-P §12 |
| `leave_attended_window_s` | 30 | "Attended" = tab visible **and** pointer/key input within the last 30 s of sim time. It gates Activate-all, Broody fill and the attended clock (abilities spec v1.2 rule 9) | No consumer today. A new input timestamp in `src/game.ts` (pointerdown/keydown listeners, beside the hidden-tab handling at `game.ts:285`) | `m4.attended_window_s` (explicit map), or rename to `tc_attended_window_s` → `m4.tc.attended_window_s` | **No.** 30 s; the §10 runner models attended as check-in cadence (ESTIMATE) |
| `w2_asleep_collect_share` | 0.20 (stale; effective 0 in M5.0; **ruled 0.15**, D-HOP-16 (6)) | Asleep Coop Hand collects this share of production | Coop Hand step in `src/sim/tick.ts` (asleep collects 0 today); not in `game/data/economy.csv` | `workers.coop_hand.asleep_collect_share` (when a consumer is built) | **Yes: correct to 0.15** (pending HoP); 0.20 only with MK-33a (§9) |
| `charge_regen_s`, `charge_cap`, `start_charges`, `refill_threshold_pct`, `combo_*`, `nudge_*` | see CSV | M5.1 / parked systems | none | none yet | Allowlist for G10 until M5.1; `charge_regen_s` 150 → 120 from F18 if charges ship (§5) |

---

## 14. Caveats
- The mechanics (golden egg, streak, tap cash, Broody, abilities, Rush meter, asleep share) are modelled **in the scratch runner only**; none exist in src. Catch rates (75 / 95 / 60%) and reaction times (1–8 s) are ESTIMATE. In §8 the abilities are a price proxy and Inspect is not modelled. In §10–12 (`m5.ts`) they are modelled per spec v1.2.
- The idle profile still taps until the Coop Hand is hired, so it is not a zero-input player before F7–8.
- The T3 splice is my construction per HoP's instruction (main L0–30 plus N0b_C150 L31+). The L30+ reshape is still parked, and its baseline fails G1–G4.
- E2, E4 and the Order Board/Rush entries are ESTIMATE. A Lab/breeds model needs the systems specced first.
- §10–12 measure the window gate with one 600 s window per checkpoint per seed, not a sliding maximum over every window. Attended means present at a check-in (ESTIMATE). The frenzy-holder waits without a limit.
- Sims ran on a shared box at high load; results are deterministic per seed.
