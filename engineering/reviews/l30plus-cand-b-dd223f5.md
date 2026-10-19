# L30+ candidate (b) on main dd223f5 (M4 B, m4b-dd223f5)

Senior Software Architect, 2026-10-19 09:21 (UTC+2). HoP candidate (b) = S2 caps + C2 costs + fixed-3 surcharge (D-HOP-2026-10-19-22).
- CSV: `/workspace/egg-farm-studio/scratch/m4-retune/handoff-T3h/cand/b.csv`, sha256 `84bd0b70bf40b8dfa8be223a0356f2cddbf025c532fe4da3ab5adf11d9088faa` (verified).
- Harness: `npm run measure:l30plus -- <csv>` (scripts/measure-l30plus.ts, blob 8aa74ce14a21, committed). See engineering/l30plus-harness.md.
- Committed bots at their defaults, no overrides. Full output: l30plus-cand-b-dd223f5.summary.txt (next to this file).

## (a) Does it build on main as-is? **No.**
`sync-economy` on dd223f5 fails with `could not fit demandLoFactor from economy.csv`. Main has none of the #45 L30+ code. The
missing pieces are:

| missing on main | #45 commit | what |
|---|---|---|
| farmMaxLevel 50 (Farm max != CSV rows) and hvExtraSecondLevelMult 1.1 in economy-config; sync passes cfg to fitM4 | c27fdfb | tunables + sync |
| per-row caps `capOverFarmByFarm` (S2: F+3 below L40, F+5 from L40), surcharge `extraCostFarmShareByFarm` + `trackExtraCost` | 20bf1d3, c27fdfb | per-track caps / fixed-3 surcharge |
| data-driven track max `trackMaxLevel` (55), tracks independent of the Farm max | 20bf1d3 | Hens/Egg value to 55 |
| Balance type for the optional m4 fields (type-only) | af04736 | tsc |
| fit/verify Farm, Collection, workers on rows 0..farmMaxLevel only (rows 51-55 = track pricing base) | 63d2c51 | sync truncation |
| track eggs/s, egg value and offline clamp at the track's own max (Saves M1) | 408a589 | clamps |
| demand_min/max fitted on rows 0..30 | 0efda7d | sync |
| per-level coop table `farm.coopCapacityTable` (non-linear coop, D-HOP-10) + strictly rising costs L0-55 tests | bd3e527 | coop table |

**Measured on a local, unpushed branch** `tmp/cand-b-l30code` = main dd223f5 + `cherry-pick -x` of those 7 commits (+ the harness),
HEAD 729565e9 (clean). The only conflict was 408a589's tests/m4-migrate-v7-sample.test.ts, which isn't on main, so I dropped it. tsc is clean
and sync + validateBalance pass: Farm max 50, Hens/Egg value max 55, coop table on, m4.enabled 1. **These numbers are not main's
code.** They show what (b) does once the #45 code lands.

## (b) Pacing per Farm level, workers path (runM2 seller15 variance, 4 h, seeds 1-200)
All 200 seeds reach F50. Time on each level, median/P95 in seconds:

| F | med/P95 | F | med/P95 | F | med/P95 | F | med/P95 | F | med/P95 |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 168/235 | 10 | 42/71 | 20 | 151/214 | 30 | 168/260 | 40 | 329/346 |
| 1 | 64/124 | 11 | 48/87 | 21 | 137/228 | 31 | 186/266 | 41 | 297/470 |
| 2 | 53/89 | 12 | 53/98 | 22 | 154/208 | 32 | 170/238 | 42 | 458/483 |
| 3 | 48/91 | 13 | 57/110 | 23 | 113/177 | 33 | 175/197 | 43 | 433/458 |
| 4 | 39/82 | 14 | 57/109 | 24 | 127/173 | 34 | 278/307 | 44 | 333/356 |
| 5 | 44/82 | 15 | 107/166 | 25 | 115/148 | 35 | 197/300 | 45 | 562/584 |
| 6 | 41/77 | 16 | 81/135 | 26 | 145/195 | 36 | 196/220 | 46 | 381/583 |
| 7 | 45/81 | 17 | 158/227 | 27 | 180/204 | 37 | 203/231 | 47 | 412/436 |
| 8 | 58/97 | 18 | 134/193 | 28 | 217/244 | 38 | 345/369 | 48 | 445/464 |
| 9 | 41/65 | 19 | 98/137 | 29 | 182/283 | 39 | 222/349 | 49 | 759/778 |

**Dead zones (P95 time on level > 3 min):**
- Pre-existing on main's own data: F0, F17, F18, F20-22, F26-28. Main measured the same way flags F0, F17, F18, F20, F21, F22,
  F26, F27, F28, so these are not new.
- New or changed with (b): F29, plus **every level F30-F49**. The worst are F45 (9.4/9.7 min), F49 (12.7/13.0 min), F42-43
  (~7.5 min), F38 (5.8/6.2 min) and F34 (4.6/5.1 min).
- Late-game levels at > 3 min are by design (late-game-curve-model). The 3-min flag applies mainly to the early/mid game.
  The F34/F38/F45/F49 spikes are what drive the top-step-share failure below.

## (c) Workers L10 P95: **12.08 min, margin 0.02 min (1.3 s) to the 12.1 gate** (fastest seed 8.32). No-workers: 12.02 (margin 0.08; fastest 7.87).
Identical to main's own data (main: 12.08 / 12.02). (b) doesn't move L10. The margin is razor-thin, so any L0-11 change will fail it.

## (d) L0-11 / L0-30
- **L0-11: PASS.** Every shared CSV cell is identical. L0-11 `tableRow` and m4 Hens/Egg value costs are identical to main's
  balance.json. L0-11 pacing is identical (F0-F26 time-on-level medians/P95 equal main's run).
- **L0-30 byte-exact vs main: FAIL (L30 row only).** L30 farm_cost 624316 -> 330194, hens_cost 94319 -> 74005,
  egg_value_cost 249339 -> 133856. HoP's "L0-30 byte-exact" holds against the T3 L30+ base, not against main.
  main's L30 row is the pre-L30+ end-of-curve row, which was never meant to be bought into L31.
  - With the L30 change, time on F27/F28/F29 moves (main 182/205, 155/175, 227/247 s -> (b) 180/204, 217/244, 182/283 s).
    Main has no F30 purchase, so main's "time on F29" is time to the cap.
  - The CSV also adds 8 columns: farm_ms_price_mult, feed_mill_price_mult, auto_collect_every_s, contracts_manual_bonus,
    hv_extra_cost_farm_share, farm_max_level, hv_extra_second_markup, start_coop_eggs. Only hv_extra_cost_farm_share is read,
    and only on the #45 code. See d-hop-22-unread-columns.md.
- **Byte-level:** no full CSV line is byte-identical, because of the added columns. The comparison is cell-wise on shared columns.
- **Step sizes:**

| step | farm_cost | egg_value_cost | hens_cost | collection_cost |
|---|---|---|---|---|
| L28->L29 | x1.350 | x1.330 (98670->131231) | x1.300 | x1.6 |
| **L29->L30** | **x1.020** | **x1.020 (131231->133856)** | x1.020 | x1.6 |
| L33->L34 | x1.136 | x1.045 (153590->160551) | x1.045 | x1.6 |
| L38->L39 | x1.136 | x1.045 (191697->200385) | x1.045 | x1.6 |
| L48->L49 | x1.136 | x1.045 (298620->312154) | x1.045 | x1.6 |

  Collection keeps x1.6 per level throughout. That matches HoP's root cause: on the long levels (F34, F38, F45, F49) the bot
  also buys a Collection level that costs about as much as a Farm level.

## (e) Step gate (real code)
- **D-CEO-20261019-04: PASS.** P95 **1.974** (<= 2.00), worst **2.171, seed 188** (<= 2.25), 200/200 seeds counted.
  Top 5 seeds: 188 2.171, 50 2.109, 123 2.060, 154 2.043, 180 2.040.
- **Top-step share (D-HOP-22 rule <= 25%): FAIL.** F38 27.5%, F45 20.0%, F49 19.5%, F34 10.5%, F35 6.0%, F42 5.0%.
  This reproduces HoP's estimate exactly (F38 27.5%).

## (e2) Non-data work needed to lift the cap on main
- The 7 #45 commits above. That covers the tunables, sync, clamps and the coop table.
- **UI on main:**
  - app.ts:483 (Farm/Collection card `Level ${L} / ${b.maxLevel}`) already reads the cap from data. Fine (50).
  - **app.ts:504 track card on main reads `b.maxLevel`.** It would show "Level N / 50" for tracks that go to 55. #45 (20bf1d3)
    changes it to `trackMaxLevel(t, b)`.
  - **tracks-ui.ts:66 `milestoneHint`: `if (L >= b.maxLevel) return null`** is still Farm-max based, even on #45.
    It should be `trackMaxLevel(t, b)`. That's minor while no milestone sits above 50, but it's the same class of bug. **Needs a fix.**
  - next-goal.ts:22/25 and app.ts:547 correctly use the Farm max for Farm/Collection.
  - No hard-coded 30 cap in src/ (grep: the remaining "30"s are animation/fx counts and comments).
- Saves: the level-tolerance fix a399d27 / 7ab3d3d is on main already (via #47 / M4 B).
- Tests: tests/l30plus.test.ts and the new L30+ tests come with c27fdfb/63d2c51/408a589/bd3e527. The data-landing steps
  (allowlists, HoQA pin test, M4-on golden re-pin, step gate ON) are in the scratch land-l30-data.sh from #45.

## Verdict
(b) passes D-CEO-04 on real code (1.974 / 2.171, seed 188), L10 (12.08, margin 0.02) and L0-11, and builds once the #45 code is in.
It fails the 25% top-step rule (F38 27.5%). L0-30 is byte-exact except the L30 row (intended). Re-run Economy's L31+
Collection reshape with `npm run measure:l30plus -- <csv>` on the same code (tmp/cand-b-l30code or main + the 7 commits).
