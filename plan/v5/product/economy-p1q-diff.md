# economy.p1q.csv: diff vs economy.csv (Economy/Balance Designer, 2026-10-15 23:45 UTC+2)
Approved by Head of Product: P1q + P3 + P4 ship together; P2 is a UI change.
**The staged file is `product/economy.p1q.csv`. It is merged into `economy.csv` only after PM Farm Upgrades signs off on `queue_max`.**

- **Columns:** same 46 columns in the same order, same line endings. Only 7 columns change, and every other cell is byte-identical (checked cell by cell). That includes `manage_prompt_threshold`, which is already 0.4 on every row.
- **Generator:** the changed values come from `Eco(CURRENT + d_lo 0.4, d_hi 0.8, iv_scale 0.5, rate_l0 1.5, q_base 6, q_step 5, q_cap 10)` in `sim/economy_sim.py`. The same formatting reproduces today's `economy.csv` values exactly.
- **Verification:** `pt1_resim.py --csv-only` reads the candidate CSV (M1 columns per level, plus the worker spec via `spec_from_csv`) and reproduces the formula-path P1q+P3+P4 numbers **identically**: all 13 table rows (AC7, AC7-soft, and AC-W for seller15, cheapest, casual and slow; managed, unmanaged and M1). Output: `sim/m2_validation/pt1_resim_csv_out.md`.
- **`qa/csv_check.py economy.p1q.csv`:** exit 1, with 127 mismatches. **All of them are the expected new values**: 31 rows each of `customer_interval_s`, `demand_min`, `demand_max` and `queue_max`, plus the L0 `eggs_per_sec`, `offline_eggs_per_sec` and `offline_max_eggs_2h` (31×4 + 3 = 127). Worker columns: 28 of 28, 0 mismatches. QA's formulas need the PT1 update (see the last section). Today's `economy.csv` still passes with 0 mismatches.

## Per-column summary
| column | old → new | rows affected |
|---|---|---|
| customer_interval_s | max(3, round(10×0.95^F, 2)) → round(0.5 × that, 2) (10.0 → 5.0 … 3.0 → 1.5) | all 31 |
| demand_min | ceil(0.8k) → ceil(0.4k), k = eggs/s × **base** interval | all 31 |
| demand_max | ceil(1.6k) → ceil(0.8k) | all 31 |
| queue_max | min(5, 3+floor(F/10)) → min(10, 6+floor(F/5)) | all 31 |
| eggs_per_sec | 1.0 → 1.5 | L0 only |
| offline_eggs_per_sec | 0.25 → 0.38 | L0 only |
| offline_max_eggs_2h | 1800 → 2700 | L0 only |
| everything else (incl. hens L0 = 5, manage_prompt_threshold 0.4) | unchanged | — |

## Per-level values
| level | customer_interval_s | demand_min | demand_max | queue_max |
|---|---|---|---|---|
| 0 | 10.0 → 5.0 | 8 → 6 | 16 → 12 | 3 → 6 |  (L0 also: eggs_per_sec 1.0 → 1.5, offline 0.25 → 0.38 / 1800 → 2700)
| 1 | 9.5 → 4.75 | 16 → 8 | 31 → 16 | 3 → 6 |
| 2 | 9.03 → 4.51 | 22 → 11 | 44 → 22 | 3 → 6 |
| 3 | 8.57 → 4.29 | 28 → 14 | 55 → 28 | 3 → 6 |
| 4 | 8.15 → 4.08 | 33 → 17 | 66 → 33 | 3 → 6 |
| 5 | 7.74 → 3.87 | 38 → 19 | 75 → 38 | 3 → 7 |
| 6 | 7.35 → 3.67 | 42 → 21 | 83 → 42 | 3 → 7 |
| 7 | 6.98 → 3.49 | 45 → 23 | 90 → 45 | 3 → 7 |
| 8 | 6.63 → 3.31 | 48 → 24 | 96 → 48 | 3 → 7 |
| 9 | 6.3 → 3.15 | 51 → 26 | 101 → 51 | 3 → 7 |
| 10 | 5.99 → 3.0 | 53 → 27 | 106 → 53 | 4 → 8 |
| 11 | 5.69 → 2.85 | 55 → 28 | 110 → 55 | 4 → 8 |
| 12 | 5.4 → 2.7 | 57 → 29 | 113 → 57 | 4 → 8 |
| 13 | 5.13 → 2.56 | 58 → 29 | 115 → 58 | 4 → 8 |
| 14 | 4.88 → 2.44 | 59 → 30 | 118 → 59 | 4 → 8 |
| 15 | 4.63 → 2.31 | 60 → 30 | 119 → 60 | 4 → 9 |
| 16 | 4.4 → 2.2 | 60 → 30 | 120 → 60 | 4 → 9 |
| 17 | 4.18 → 2.09 | 61 → 31 | 121 → 61 | 4 → 9 |
| 18 | 3.97 → 1.99 | 61 → 31 | 121 → 61 | 4 → 9 |
| 19 | 3.77 → 1.89 | 61 → 31 | 121 → 61 | 4 → 9 |
| 20 | 3.58 → 1.79 | 61 → 31 | 121 → 61 | 5 → 10 |
| 21 | 3.41 → 1.71 | 61 → 31 | 121 → 61 | 5 → 10 |
| 22 | 3.24 → 1.62 | 60 → 30 | 120 → 60 | 5 → 10 |
| 23 | 3.07 → 1.53 | 59 → 30 | 118 → 59 | 5 → 10 |
| 24 | 3.0 → 1.5 | 60 → 30 | 120 → 60 | 5 → 10 |
| 25 | 3.0 → 1.5 | 63 → 32 | 125 → 63 | 5 → 10 |
| 26 | 3.0 → 1.5 | 65 → 33 | 130 → 65 | 5 → 10 |
| 27 | 3.0 → 1.5 | 68 → 34 | 135 → 68 | 5 → 10 |
| 28 | 3.0 → 1.5 | 70 → 35 | 140 → 70 | 5 → 10 |
| 29 | 3.0 → 1.5 | 72 → 36 | 144 → 72 | 5 → 10 |
| 30 | 3.0 → 1.5 | 75 → 38 | 149 → 75 | 5 → 10 |

## queue_max table
| Farm level | old | new |
|---|---|---|
| L0–4 | 3 | 6 |
| L5–9 | 3 | 7 |
| L10–14 | 4 | 8 |
| L15–19 | 4 | 9 |
| L20–30 | 5 | 10 |
UI (Head of Product's ask to Art & UX): at most about 5 cards plus a '+N waiting' chip at 375px. The sim only depends on the slot count.

## P4 rule (Workers change request; no new CSV values)
- Manage is enabled only when a worker's energy is ≤ `yawn_at_pct` (40).
- Manage all needs ≥ `manage_all_min_workers` (3) workers at ≤40%. It counts and refills **only** those workers; below that, Manage refills the lowest worker.
- The refill stays free, with the shared 30 s `manage_cooldown_s`.
- `manage_prompt_threshold` = 0.4 (it's already in `economy.csv`).
- Sim result: Manage 5.6 per 15 min (was 1.25), AC-W4 5.5, AC-W4b 7.5.

## Pacing (P1q+P3+P4, 100 seeds; full tables in playtest1-resim.md)
- **AC7:** seller15 L10 @10m, L18 @30m; 5-min upgrades ≥12; cheapest-first 90% / 94%. **PASS**
- **AC7-soft:** casual F10 ≤15m 100/100, F18 median 34.3. **PASS**
- **AC-W1:** F18 median 28.2 / 31.2 / 29.2 (seller15 / cheapest / casual); 100/100 reach F10 ≤15m. **PASS**
- **W4** 5.5, **W4b** 7.5, **W5** 5.6 per 15 min. **PASS**
- First 2 min: $2.11/s (was $1.29).

## economy.md text changes (applied)
- New banner: rows marked PT1 describe `economy.p1q.csv`, and the merge into `economy.csv` waits on PM Farm Upgrades.
- **Eggs/sec row:** adds the L0 = 1.5 exception (starter nest; hens stays 5).
- **Customer interval row:** 0.5 × base, base = max(3, 10×0.95^F), 2 dp. L0/L10 examples: 5.0 / 3.0.
- **Demand row:** [ceil(0.4k), ceil(0.8k)], k = eggs/s × base interval. Still ≈1.2× production per second. L0/L10: 6–12 / 27–53.
- **Queue max row:** min(10, 6+floor(F/5)). L0/L10: 6 / 8.
- **Offline row:** L0 max 2,700.
- **Market tunables paragraph:** new `queue_max` bands, the old formula kept for reference, sign-off pending, and the UI note.
- **New bullet:** the PT1-P4 Manage rule.
- **Not changed:** the "~15% customer_lost" outcomes line. It still matches P1q (16.0% lost without workers).

## Follow-ups
- QA: update `csv_check.py` with the PT1 formulas when the merge happens (interval ×0.5, demand 0.4/0.8 × eps × base interval, queue min(10, 6+F//5), L0 eps 1.5).
- Engineering: check whether the build crashes when a worker goes Unpaid while the Grader is hired. The Python sim crashed there (`wage_min` on the W4 tier list) and is now fixed. The crash did not affect the baseline numbers.

## PT1-11 fix (2026-10-15)
The interval column is regenerated as exactly max(1.5, round(5*0.95^F, 2)). The old column halved already-rounded values, so 9 rows were off by 0.01 (F4, 6, 8, 10, 11, 13, 15, 21, 23). Demand was recomputed with factors 0.8/1.6 from the new interval: F21 is now 30-60 (was 31-61) and F23 max is 60 (was 59). Re-sim pacing is unchanged: AC7 10/18, F18 34.3, W4/W4b 5.5/7.5, W5 5.62. Only the minor queue and wait stats move. The L0 eggs/s exception needs `eggsPerSecL0` in formulas.ts, which Engineering is building on m3/rc0. Pre-fix CSV backup: /tmp/economy.p1q-v1.csv.
