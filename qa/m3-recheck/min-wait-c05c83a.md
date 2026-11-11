# feat/market-hand-min-wait @ c05c83a — QA check
Date: 2026-10-17 ~09:05 CEST. c05c83a is one commit on main 8e6d53e. I used scratch worktrees in /tmp (/tmp/mw-c05, /tmp/mw-c05w3 for the CSV=3 experiment, /tmp/mw-main = 8e6d53e). Nothing was pushed. Raw output is in mk59a-harness/c05c83a/.

## 1) Min wait is data-driven and exact at tick resolution: PASS
- Path: data/economy.csv `market_hand_min_wait_s` → scripts/sync-economy.ts → balance.json `workers.market_hand.min_wait_s`. tick.ts `servable()` reads only the balance value; there is no literal 2 in src. validateBalance requires a number ≥ 0.
- At CSV value 2 (5 seeds × L5/10/12/14/18, 600 s each, 5,520 Market Hand sells), the shortest customer wait at the moment of a Market Hand sale is **2.000 s**, and every sale lands in the 2.0 s bucket. No Market Hand sale happens before 2.0 s of wait.
- CSV changed to 3 in scratch, then `npm run sync-economy`: balance.json min_wait_s 2→3. The same run (5,515 sells) gives a shortest wait of **3.000 s**. The behaviour follows the data.
- **Conflict with the HoP ruling:** a held turn charges **no wage** (tick.ts comment "HELD -- no wage", and the test asserts `wages.length == 0` on an empty queue). HoP rejected no-wage-on-empty-queue, so wages must stay as on main: Market Hand is charged on its normal every_s cadence whether or not anyone is servable. Must change before merge.

## 2) s2-3a / MK-21 visibility bound
The test's `visibility(dwellMs, secs, seed)` advances the sim in 100 ms steps from t=0 at L12 with Collection 9, 1,500 eggs, and Market Hand, Coop Hand and Hawker at 100% energy. A frame counts as visible if the live queue has ≥1 customer or (dwell on) a ServedDwell card is active. Denominator: all frames.
Measured on 200 seeds per cell (min / p5 / median / max):
| scenario | main 8e6d53e | c05c83a |
|---|---|---|
| L12, dwell 0, 120 s (the test's "before") | 0.151 (all seeds) | **0.683** |
| L12, dwell 0, 60 s | 0.137 | 0.625 |
| L10, dwell 0, 60 s | 0.040 | **0.567** (lowest) |
| L14, dwell 0, 60 s | 0.148 | 0.688 |
| L12, dwell 1500, 120 s ("after") | 0.663 | 0.917 |
| L10/12/14, dwell 1500, 60 s | 0.465 / 0.603 / 0.665 | 0.835 / 0.835 / 0.835 |
- **The seed spread is zero.** Shipped arrivals use a fixed interval unless `sim_test.poisson_arrivals` is on, and the seed only changes demand, which can't matter with 1,500 eggs. The test's "several seeds" loop (1, 2, 3, 99) is vacuous, so min = p5 = median = max.
- **Verdict:** ≥0.40 is sensible and has margin. The lowest measured value on c05c83a is 0.567 (L10, 60 s), +0.17 over the bar; the test point (L12, 120 s) is 0.683, +0.28. main gives 0.151, so the bound clearly separates the two.
- **Upper bound needed:** yes. A stuck customer (never served) reads as 1.0 and would pass ≥0.40. Add `before ≤ 0.90` (measured 0.683; leaves 0.22 headroom). Also add the direct invariant: no customer stays on screen longer than customer_patience_s.
- **Note:** f1-proposal.md says "88–99% at L10–18" for option B. The shipped sim gives 57–69% with dwell 0 and 83–92% with dwell. The proposal's number comes from the Economy (Poisson) model, so the test comment quoting 88–99% overstates.
- **Proposed exact bounds:** `before` (dwell 0, L12, 120 s) in [0.40, 0.90]. `after` ≥ 0.40 (unchanged; HoP-approved). Replace the seed loop with L10/L12/L14 at 60 s, dwell 1500, each ≥ 0.40.

### MK-21 AC text vs test: not precise; proposed wording
The AC (s2-3a-proposal.md:38) says: "With Market Hand Working and ≥ 500 eggs in stock at Farm L10–14, over 60 s a customer card (waiting or dwelling) is visible ≥ 40% of the time" (labelled playtest).
- **Visible:** the AC leaves it undefined. The test uses sim state (queue non-empty, or a dwell card active). That is not the DOM and not G-strict, and it ignores strip-slot pops and squeezes.
- **Sampling:** the AC has none. The test samples every 100 ms after each step.
- **Window:** the AC says 60 s. The test uses 120 s for its headline and 60 s for the seed loop, both from t=0 with no warm-up.
- **Denominator:** the AC leaves it implicit. The test uses all frames (session time), not time with customers.
- **Scenario:** the AC says L10–14. The test only runs L12, and also hires Coop Hand and Hawker. Seeds are vacuous.
Proposed MK-21 wording:
> MK-21 (sim-measured, tests/s2-3a.test.ts): from `initialState(seed 7)` at Farm L10, L12 and L14, Collection 9, 1,500 eggs, coins unconstrained, Market Hand + Coop Hand + Hawker hired at 100% energy, fixed arrival interval (no Poisson), advance the sim in 100 ms steps from t = 0 for 60 s (600 samples; L12 also 120 s). A sample is **visible** if, after the step, the live customer queue is non-empty, or (dwell on) a served card is within served_dwell_ms. Visible fraction = visible samples ÷ all samples (session time, not time with customers). PASS: dwell 1,500 ms ≥ 0.40 at each level; dwell 0 (min wait alone) at L12 / 120 s within [0.40, 0.90]. This is a sim-state proxy. On-screen card visibility under the G-strict rule is a separate browser row and isn't covered here.

## 3) MK-59a harness base, 400 seeds (seller15, 3,600 s, 0.1 s, game RNG)
| | L20 served % |
|---|---|
| c05c83a (min wait 2) | **65.68** |
| main 8e6d53e (same harness, 400 seeds) | 66.25 (acaceee 100 seeds: 65.94) |
| Economy t2_lc1 base | 68.33 |
- c05c83a − main at L20 is −0.57 (paired SE 0.33, within noise). c05c83a − Economy is −2.65. The min wait does **not** close the offset to Economy, which confirms the RNG-stream explanation; Economy already dropped the absolute 68.33 match.
- **Re-measured paired SDs (c05c83a vs main, same seeds):** L20 SD 6.57 (SE 0.33); median 7.4; max L9 17.8 (SE 0.89); L10–12 16.5–16.8 (SE 0.83). The stand-in had L20 7.24 and max 20.6. With these SEs the MK-59a per-level guard false-fail (all true 0, independence) is about **4.3%**, versus 9.7% with the stand-in. This is still a proxy: the real hold build doesn't exist yet.
- All levels: mk59a-harness/c05c83a/summary.txt.

## 4) Unit tests + tsc on c05c83a
- `npm test` (sync-economy --check + vitest, max 2 forks): **58 files, 603 tests passed**, exit 0.
- `tsc --noEmit`: exit 0.

## HoP rulings (2026-10-17 09:03 UTC+2)
- Wages: held turns MUST charge the wage (wage/min unchanged); the test must assert wages are charged. Zero wage on an empty queue is rejected.
- MK-21 wording APPROVED as proposed: game-state visible fraction, 100 ms steps from t=0; PASS at >=0.40 for L10/L12/L14 (1.5 s dwell, 60 s), and no-dwell L12 120 s within [0.40, 0.90].
- MK-59a guard: a ~4.3% false-fail rate is acceptable only with the rerun-on-trip rule: any level with mean < -2.0 is rerun at 1,600 seeds and FAILS only if it trips again.
