# TR-5 reference check (M4 AC7) · PM Farm Upgrades · 2026-10-16
The Collection-aware greedy buyer in `m4_sim.py` is the **TR-5 reference bot** (HoP decision 2026-10-16). `tr5_run.py` runs it and prints PASS/FAIL per M4 AC7.

## Usage
```
python3 product/farm/m4/tr5_run.py [--csv PATH] [--seeds 30] [--scenario standard|casual|d25] [--hens B,G] [--value B,G]
```
- `--csv`: economy table.
  - **Gating table for TR-5 (HoP 2026-10-16): `product/economy.m4-candidate.csv`**, until Economy merges F1 + F1-GAP + M4 columns into economy.csv (live main FAILs today).
  - Default: `product/economy.csv` **once it carries M4 columns** `hens_cost` and `egg_value_cost` (per level, the cost to go L→L+1; optional `hens_cap_over_farm` / `egg_value_cap_over_farm`, default 3; column names final per HoP 2026-10-16, QA gate fix 3).
  - Until Economy publishes it: `product/economy.f1.csv` plus the HoP-adopted formulas **Hens 36×1.30^H, Egg value 48×1.33^V**, caps F+3.
  - If Economy uses other column names, update `M4COLS` in tr5_run.py.
- `--seeds`: seeds 0..N−1 (default 30).
- `--scenario`:
  - `standard` (**gating**): tap 1/s, Sell all every 15 s.
  - `casual`: Poisson arrivals, Sell all every 20 s, demand ×0.75.
  - `d25`: standard with demand ×0.75.
  
  casual and d25 are diagnostic. The AC7 bands are defined for standard, so they are expected to FAIL the F18 time band (risk list, m4-track-check.md).
- `--hens` / `--value`: cost base,growth, used only when the table has no M4 cost columns.
- Exit code: 0 PASS, 1 FAIL, 2 table not found. Runtime about 2 s for 30 seeds.

## Bot logic (no workers)
- **Tracks:**
  - Farm: costs, coop, queue, customer interval and demand from the table. Demand follows the Farm reference curve, not live Hens.
  - Hens: eggs/s 1.5 at H0, else 0.2 × (5 + 5H); ×1.25/1.5/2 at H10/20/30; cap F+3.
  - Egg value: price (1 + 0.05V)(1 + 0.12V) (Collection has no price bonus) × grade (V5 ×1.1, V10 ×1.25, V20 ×1.5 needs F15); cap F+3.
  - Balanced farm: min(F,H,V) ≥ 5/10/15/20/25 gives ×1.10/1.15/1.20/1.25/1.30.
  - Collection: eggs per tap only.
- **Loop:** 0.1 s ticks. The coop fills at eggs/s, capped. Collect 1×/s moves min(coop, eggs per tap). Customers follow the table (queue cap, 30 s patience, a full queue loses the arrival). Sell all happens every 15 s. Coins are rounded half-up to cents.
- **Buying:** right after each Sell, repeated.
  - Income estimate = min(eggs/s, Farm demand rate, eggs per tap × taps/s) × price.
  - For each possible first buy, evaluate every bundle of up to 3 buys across Farm/Hens/Value/Collection (caps respected). ROI = Δincome ÷ total bundle cost.
  - Take the first item of the best bundle. Buy it if affordable; otherwise **wait for it** (no fallback buys).
  - The bundle search is what makes the bot value Collection and Farm correctly when two limits co-bind. A single-step ROI sees zero gain there.

## Pass criteria (M4 AC7, HoP 2026-10-16)
"In band" = **the median seed is in band AND at least 80% of seeds are** (24 of 30).
1. Time to Farm L18: 17.8–21.7 min (±10% of the F1 reference, 19.75 min).
2. Farm level reached at 30:00: L18–L22.
3. Gap between consecutive purchases ≤ 3.0 min (same in-band rule; the worst seed's gap and where it happened are printed).
All three must pass for `RESULT: PASS`.
A seed that never reaches L18 counts as out of band for (1).

## Confirmation run (2026-10-16, 36/48 params, economy.f1.csv)
```
[PASS] F18 time 17.8-21.7 min: median 18.88, in band 30/30 (min 18.50, max 19.25)
[PASS] Farm level at 30:00 in L18-L22: median L22, in band 30/30 (min L22, max L22)
[PASS] gap between purchases <= 3.0 min: median 1.75, ok 30/30, worst 1.75 min at F21 (27.0 min)
RESULT: PASS
```
The old 30/40 params give FAIL (F18 median 17.12, L@30 L23 2/30), so the check discriminates.
