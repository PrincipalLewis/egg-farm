# AC7 independent verification: main 8e6d53e (CSV 6dca24cd, L21 -3%)
QA Saves & Release Verification, 2026-10-17 ~09:00–09:25 CEST. Python/Node gate only (no browser, no lock).
Worktree: qa/wt-ac7-8e6d53e (detached at 8e6d53e). Evidence folder: qa/m3-recheck/ac7-verify-8e6d53e/

## Verdict
- **(1) AC7 on 8e6d53e: PASS.** Independently reproduced at 100 seeds with the variance bot, on both the TS port and the Python reference. Every band and variance target is met.
- **(2) L30+ release gate with the L21 trim: FAIL. Severity Major (blocks the L30+ release).** The b59c4e0d L30+ shipping file with 6dca24cd's L21 row gives casual+workers EX-1 L30–40 step ratio P95 2.20x / **worst 2.40x**, over the HoP 00:12 limit of ≤2.25/≤2.25. The unmodified b59c4e0d run on the same box at the same moment passes at 2.00/2.20. Changing only L21 causes the regression.
- **Provenance finding (Minor, process):** Economy's log scratch/ac7-f1/gate_8e6d53e.log was produced by the **Python** bot, not the TS port. Details below.

## (1) AC7
### Which bot ran
- The TS port is in the tree: tests/seller-variance.ts (commit 3155bbd, "port seller variance model … with Python parity tests"), used by tests/bot.ts and tests/bot-m2.ts.
- I ran `npm run test:slow` equivalent: `npx vitest run --config vitest.slow.config.ts --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1`. Result: 2 files, 14/14 passed, rc=0 (ts_slow.log).
  - Python parity holds: the MT19937 stream and action traces are exact; m1 old-bot per-seed exact; m2 old-bot 87/100 bit-exact, all within 15 s.
  - CSV-sha guards are hard-pinned to 6dca24cd. The fixture metadata reads economy_csv 6dca24cd, sim 68a64c59, proposal 17877b41.
- **Economy's gate is not the port.** scratch/ac7-f1/gate.py does `import seller_variance_sim as S` from product/sim and calls `S.run` / `S.run_m2`, which is the Python bot. It also still writes `ac7_f1_acaceee.json`. Its numbers match mine exactly, so the result is right, but that log cannot show the port ran. **HoP's port-landed condition is met by this QA run (TS slow suite), not by Economy's log.**

### Numbers (100 seeds, seller15, variance VAR_DEFAULT)
| Metric | Target | TS port (vitest) | Python ref (my rerun, vendored 68a64c59) | Economy log |
|---|---|---|---|---|
| L@30 P5/P95, no workers | band | 20/20 | 20/20 | 20/20 |
| L@30 P5/P95, workers | band | 20/21 | 20/21 (P50 21) | 20/21 |
| L10 fastest / P95, no workers (min) | – | – | 8.54 / 9.92 | 8.54 / 9.92 |
| L10 fastest / P95, workers (min) | – | – | 9.12 / 10.28 | 9.12 / 10.28 |
| Distinct time-to-L18 (target ≥50/100) | ≥50 | parity test passes | 97 (no wk) / 90 (wk) | 97 / 90 |
| t18 P95/P50 spread (target +3..+15 %) | 3–15 % | m1 7.1 %, m2 7.1 % | 6.8 % / 6.3 % | 6.8 / 6.3 |
| t18 P5/P50/P95 (min), m2 | ±2 % vs PY | 20.63/21.11/22.61 (PY 20.56/21.06/22.39) | – | – |
| L18–25 slowest level, workers variance, P95 | ≤390 s | 361.0 s | 361 s | 361 s |
| … worst seed | ≤480 s | 378.3 s | 376 s | 376 s |
| Fixed workers bot, slowest L18–25 | ≤360 s | 270 s | 270 s | 270 s |
| Workers t20 P95 (warn line) | warn >1740 s | 1670 s (P5/P50/worst 1564/1602/1727) | 1670 s | 1670 s |
| No-workers t20 P95 | warn 1740 | – | **1737 s (3 s margin, near-edge)** | 1737 |

My Python rerun matches Economy's log on every field. The only changes from the acaceee run are slow1825 worst 493→376 and P95 376→361 (the expected effect of the L21 trim). The TS port is within the parity tolerance; its worst seed is 378.3 s against Python's 376 s.

## (2) CSV diff and L30+ gate
- Revisions found by hash: 6dca24cd = product/economy.csv (= wt data/economy.csv); 86f0e80e = scratch/qa-pr24/economy.f1-m4cols.csv; b59c4e0d = product/economy.l30plus-polish.csv. Copies and sha256 values are in the evidence folder.
- **6dca24cd vs 86f0e80e:** only L21 changes: farm_cost 41918→40660 and w4_tier_cost 20959→20330. The columns are identical, and so is L30.
- **6dca24cd vs b59c4e0d (L0–30 overlap):** L21 has the same two cells. L30 differs (farm/hens/egg_value_cost plus some float formatting), but that difference is pre-existing and identical to the 86f0e80e-vs-b59c4e0d difference; b59c4e0d's L30–55 are the L30+ values. 6dca24cd contains no L31+ rows.
- No L30+ cost changed. But late_curve simulates from L0, so cumulative times shift, and per the rule I reran the gate. Input: b59c4e0d with only L21 farm_cost/w4_tier_cost set to the 6dca24cd values (csv_b59c4e0d+L21trim.csv, sha ee6bd47d73c0). This is my construction of the effective release file; no pinned L30+ file that includes the trim exists yet.

| Gate (100 seeds, late_curve ab928dc96d1c) | b59c4e0d baseline | b59c4e0d + L21 trim |
|---|---|---|
| standard L35/L40/L50 | 54.50/66.75/101.25 | 54.50/66.75/101.25 |
| casual L35/L40/L50 | 58.00/71.00/105.33 | 58.00/70.83/105.33 |
| **casual EX-1 L30–40 P95/worst (≤2.25/2.25)** | 2.00/2.20 PASS | **2.20/2.40 FAIL** |
| casual L41–50 ratio P95/worst | 2.00/2.17 | 1.71/2.17 |
| active/idle, L30-19a, purchase gaps | PASS (WARNs unchanged) | PASS (unchanged) |
| OVERALL | PASS | **FAIL (1 gate)** |

2.40 is the same worst value that retired 3e3d61fd. Changelog line 83 says to "hold the L30+ release rather than ship" on such a regression. Economy's 08:25/08:50 sweeps covered only AC7 and L18–25, not L30+.

### HoP approval for 6dca24cd
- An approval is logged: balance-changelog L130 / decisions L314, "Oct 17 08:50: HoP final: L21 trim -3%" (40660 / 20330). The values match the CSV, so I did not verify against unapproved values.
- Ordering concern (Minor): commit 38c3651 (08:23) is already labelled "HoP-approved -3%". At 08:25 the log says "awaiting approval". The 08:40 entry approves −1%. #36 merged at 08:41 with "AC7 VERIFIED", and the −3% approval entry is timestamped **08:50**, after the merge. All of these entries are relayed by Economy; there is no direct HoP line. Ask HoP to confirm that −3% was approved before the merge, and whether that approval covers the L30+ EX-1 impact.

## Repro
```
cd /workspace/egg-farm-studio/game && git fetch origin && git worktree add --detach ../qa/wt-ac7-8e6d53e 8e6d53e
cd ../qa/wt-ac7-8e6d53e && ln -s ../../game/node_modules node_modules
npx vitest run --config vitest.slow.config.ts --poolOptions.forks.maxForks=2 --poolOptions.forks.minForks=1
cd ../m3-recheck/ac7-verify-8e6d53e && python3 py_gate.py      # Economy's gate.py, pointed at the worktree's vendored sim
python3 ../../m3-scripts/l30plus-gate.py --seeds 100 --csv $PWD/csv_b59c4e0d.csv --csv-sha b59c4e0db7e7 --late-curve-sha ab928dc96d1c
python3 ../../m3-scripts/l30plus-gate.py --seeds 100 --csv "$PWD/csv_b59c4e0d+L21trim.csv" --csv-sha ee6bd47d73c0 --late-curve-sha ab928dc96d1c
```
Evidence: head.txt, ts_slow.log, py_gate.py, py_gate.log, py_gate_8e6d53e.json, csv_*.csv, csv_sha256.txt, csv_compare.txt, diff_*.txt, l30plus-gate-b59c-baseline.log, l30plus-gate-b59c+L21trim.log.

## Not run
- Browser and in-game verification of the L21 cost (out of scope: Python/Node gate only).
- Default `npm test` (fast vitest suite) and check-economy-copy --strict on 8e6d53e: I relied on Economy's strict EXIT 0.
- Separate check-vendor-pins.mjs. vitest was invoked directly, not via npm run test:slow, so the pin pre-step did not run; I matched the vendored sim and CSV sha256 values by hand: 68a64c59, 10f29a4a, 6dca24cd.
- L30+ gate with --level-times per-level, and l30plus-gate --selftest.
- Tuning or alternative L21 values to restore EX-1. That decision belongs to Economy and HoP.

## HoP ruling (08:47 CEST)
- HoP confirms the L21 −3% (40660) was approved at about 08:12, and #36's numbers were signed off to HoE at about 08:24, both before the 08:41 merge. The 08:40 −1% entry is VOID. The process finding is resolved.
- The approval did NOT cover the EX-1 impact.
- AC7 is VERIFIED, on the strength of QA's TS-port run, and the AC7/rc path proceeds.
- The L30+ release gate stays FAIL (Major). L30+ doesn't ship until it's green. Economy will fix it on top of 6dca24cd without reverting the trim, and QA reruns the full gate set on the fix.
- New rule: any CSV change must run the full gate set, L30+ included, before merge.
