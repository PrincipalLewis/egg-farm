## pacing-x1-stack: **FAIL**

- data: `shipped-tree` (shipped data/economy.csv + src/config/balance.json from the tree, full M5.0 stack (pause rows out)); CSV data/economy.csv sha256 a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f, src/config/balance.json sha256 ddd02fbaea437e14c55f1df3251c2331b60e33697512a4e5107b69cd5f34b41a (read from the tree, sha256 recorded)
- run: seeds 1-200, T 4000 s, windows every 300 s (A1/A2), step ratio from L11; commit 5b713e5a586e; shard runtimes casual 1942s, optimal 2720s, seller15 1337s
- **balance.json (QA-D-1030-SHIPFLAGS):** src/config/balance.json sha256 ddd02fbaea437e14c55f1df3251c2331b60e33697512a4e5107b69cd5f34b41a; m4.enabled=1; m4.flags golden=0 streak=0 tapCoins=0 abilities=0 broody=0 salesStopped=0 fatigueCue=0 pause=0 rc2Refill=0 autoRefill=0 clockWage=0 breeds=0 zeroGainUi=0 bestBuyV2=0; flags ON: none; bot-modelled src M5 flags (golden/streak/tapCoins/broody/abilities/pause) ON: none (bot model runs; O-3 guard would throw if any were on)
- table: tests/fixtures/x1/pred-13.2a-7bbb5925.csv sha256 7bbb5925 (§13.2a of record, economy.c0d9492b.md L879-913)
- rows: 45 PASS, 0 FAIL, 1 WARN, 20 INFO, 0 PENDING-REPRED (not judged until HoP signs the re-prediction), 3 N/A (row 903, D-CEO-20261030-04), 12 NOT-WIRED (3 blocking), 24 EXCLUDED (G5-P pause rows)
- **FAIL: blocking row 904 optimal NOT-WIRED**
- **FAIL: blocking row 904 seller15 NOT-WIRED**
- **FAIL: blocking row 904 casual NOT-WIRED**
- **not judged:** 21 blocking pause rows (906, 907, 909, 910, 911, 912, 913) EXCLUDED-not-judged (D-HOE-20261029-05); X1 does not cover G5-P
- **watch list (D-HOP-2026-10-30-08):** G4 worst > 180 s: optimal none 202 s, optimal H 191 s; 898/899 not measured by X1 (NOT-WIRED): cite product/economy/reprediction-l894-896-a8c4e268.md (sha1 1c7a39bd) for them

| line | profile | policy | metric | Y/N | predicted | measured | status | why |
|---|---|---|---|---|---|---|---|---|
| 879 | optimal | N | G1 window ratio P95, all windows F10–30 | Y | 1.755 | 1.754 | PASS |  |
| 879 | seller15 | N | G1 window ratio P95, all windows F10–30 | Y | 1.701 | 1.702 | PASS |  |
| 879 | casual | N | G1 window ratio P95, all windows F10–30 | Y | 1.668 | 1.668 | PASS |  |
| 880 | optimal | H | G1 window ratio P95, all windows F10–30 | Y | 1.761 | 1.761 | PASS |  |
| 880 | seller15 | H | G1 window ratio P95, all windows F10–30 | Y | 1.706 | 1.704 | PASS |  |
| 880 | casual | H | G1 window ratio P95, all windows F10–30 | Y | 1.662 | 1.663 | PASS |  |
| 881 | optimal | N | G1 window ratio P95 of each seed's worst window | Y | 1.791 | 1.791 | PASS |  |
| 881 | seller15 | N | G1 window ratio P95 of each seed's worst window | Y | 1.758 | 1.758 | PASS |  |
| 881 | casual | N | G1 window ratio P95 of each seed's worst window | Y | 1.739 | 1.734 | PASS |  |
| 882 | optimal | H | G1 window ratio P95 of each seed's worst window | Y | 1.813 | 1.813 | PASS |  |
| 882 | seller15 | H | G1 window ratio P95 of each seed's worst window | Y | 1.767 | 1.765 | PASS |  |
| 882 | casual | H | G1 window ratio P95 of each seed's worst window | Y | 1.735 | 1.734 | PASS |  |
| 883 | optimal | N | G1 window ratio, worst seed | Y | 1.917 | 1.917 | PASS |  |
| 883 | seller15 | N | G1 window ratio, worst seed | Y | 1.808 | 1.808 | PASS |  |
| 883 | casual | N | G1 window ratio, worst seed | Y | 1.815 | 1.815 | PASS |  |
| 884 | optimal | H | G1 window ratio, worst seed | Y | 1.936 | 1.936 | PASS |  |
| 884 | seller15 | H | G1 window ratio, worst seed | Y | 1.875 | 1.875 | PASS |  |
| 884 | casual | H | G1 window ratio, worst seed | Y | 1.858 | 1.858 | PASS |  |
| 885 | optimal | N / H | Window ratio median | N | 1.656 / 1.636 | 1.657 / 1.636 | INFO |  |
| 885 | seller15 | N / H | Window ratio median | N | 1.585 / 1.556 | 1.585 / 1.558 | INFO |  |
| 885 | casual | N / H | Window ratio median | N | 1.542 / 1.489 | 1.537 / 1.49 | INFO |  |
| 886 | optimal | N | Window ratio by band P95, F10–17 / F18–23 / F24–29 | N | 1.75 / 1.77 / 1.74 | 1.75 / 1.77 / 1.73 | INFO |  |
| 886 | seller15 | N | Window ratio by band P95, F10–17 / F18–23 / F24–29 | N | 1.69 / 1.72 / 1.69 | 1.69 / 1.72 / 1.7 | INFO |  |
| 886 | casual | N | Window ratio by band P95, F10–17 / F18–23 / F24–29 | N | 1.64 / 1.70 / 1.67 | 1.64 / 1.7 / 1.67 | INFO |  |
| 887 | optimal | H | Window ratio by band P95, F10–17 / F18–23 / F24–29 | N | 1.75 / 1.78 / 1.75 | 1.75 / 1.78 / 1.75 | INFO |  |
| 887 | seller15 | H | Window ratio by band P95, F10–17 / F18–23 / F24–29 | N | 1.67 / 1.73 / 1.71 | 1.67 / 1.73 / 1.71 | INFO |  |
| 887 | casual | H | Window ratio by band P95, F10–17 / F18–23 / F24–29 | N | 1.65 / 1.68 / 1.66 | 1.65 / 1.68 / 1.66 | INFO |  |
| 888 | optimal | N | Active premium (mech ÷ passive), median F10–19 / F20–29 / at L30 | N | +61.3 / +64.8 / +64.9% | +61.3% / +66.1% / +64.8% | INFO |  |
| 888 | seller15 | N | Active premium (mech ÷ passive), median F10–19 / F20–29 / at L30 | N | +56.6 / +58.2 / +59.0% | +56.6% / +59.5% / +58.5% | INFO |  |
| 888 | casual | N | Active premium (mech ÷ passive), median F10–19 / F20–29 / at L30 | N | +53.0 / +53.9 / +54.6% | +53% / +54.9% / +54.1% | INFO |  |
| 889 | optimal | H | Active premium (mech ÷ passive), median F10–19 / F20–29 / at L30 | N | +58.4 / +63.6 / +63.5% | +58.4% / +63.1% / +63.8% | INFO |  |
| 889 | seller15 | H | Active premium (mech ÷ passive), median F10–19 / F20–29 / at L30 | N | +52.4 / +55.3 / +56.0% | +52.4% / +55.8% / +55.8% | INFO |  |
| 889 | casual | H | Active premium (mech ÷ passive), median F10–19 / F20–29 / at L30 | N | +47.0 / +49.8 / +50.9% | +47% / +49.5% / +50.8% | INFO |  |
| 890 | optimal | N | Step ratio P95, per level L11–30 (no-mechanics baseline 2.989 / 3.392 / 3.589) | Y | 2.407 (−0.58) | 1.979 (-1.01 vs no-mechanics 2.989) | PASS |  |
| 890 | seller15 | N | Step ratio P95, per level L11–30 (no-mechanics baseline 2.989 / 3.392 / 3.589) | Y | 2.418 (−0.97) | 2.198 (-1.19 vs no-mechanics 3.392) | PASS |  |
| 890 | casual | N | Step ratio P95, per level L11–30 (no-mechanics baseline 2.989 / 3.392 / 3.589) | Y | 2.655 (−0.93) | 2.504 (-1.07 vs no-mechanics 3.575) | PASS |  |
| 891 | optimal | H | Step ratio P95, per level L11–30 (no-mechanics baseline 2.989 / 3.392 / 3.589) | Y | 2.435 (−0.55) | 2.097 (-0.89 vs no-mechanics 2.989) | PASS |  |
| 891 | seller15 | H | Step ratio P95, per level L11–30 (no-mechanics baseline 2.989 / 3.392 / 3.589) | Y | 2.602 (−0.79) | 2.342 (-1.05 vs no-mechanics 3.392) | PASS |  |
| 891 | casual | H | Step ratio P95, per level L11–30 (no-mechanics baseline 2.989 / 3.392 / 3.589) | Y | 2.818 (−0.77) | 2.654 (-0.92 vs no-mechanics 3.575) | PASS |  |
| 892 | optimal | N | Step ratio worst seed, L11–30 (baseline 3.453 / 3.927 / 4.687) | Y | 2.608 (−0.85) | 2.407 (-1.05 vs no-mechanics 3.453) | PASS |  |
| 892 | seller15 | N | Step ratio worst seed, L11–30 (baseline 3.453 / 3.927 / 4.687) | Y | 2.913 (−1.01) | 2.913 (-1.01 vs no-mechanics 3.927) | PASS |  |
| 892 | casual | N | Step ratio worst seed, L11–30 (baseline 3.453 / 3.927 / 4.687) | Y | 3.147 (−1.54) | 3.087 (-1.6 vs no-mechanics 4.687) | PASS |  |
| 893 | optimal | H | Step ratio worst seed, L11–30 (baseline 3.453 / 3.927 / 4.687) | Y | 2.634 (−0.82) | 2.435 (-1.02 vs no-mechanics 3.453) | PASS |  |
| 893 | seller15 | H | Step ratio worst seed, L11–30 (baseline 3.453 / 3.927 / 4.687) | Y | 3.157 (−0.77) | 3.157 (-0.77 vs no-mechanics 3.927) | PASS |  |
| 893 | casual | H | Step ratio worst seed, L11–30 (baseline 3.453 / 3.927 / 4.687) | Y | 3.801 (−0.89) | 3.801 (-0.89 vs no-mechanics 4.687) | PASS |  |
| 894 | optimal | N | G4 longest nothing-affordable F10–30, P50 / P95 / worst (s), any-row (M5.0 record, D-HOP-3 | Y | 68 / 114 / 143 (signed re-pred D-HOP-2026-10-30-08; table had 84 / 160 / 234) | 68 / 114 / 143 (baseline 104/161/202) | PASS |  |
| 894 | seller15 | N | G4 longest nothing-affordable F10–30, P50 / P95 / worst (s), any-row (M5.0 record, D-HOP-3 | Y | 47 / 77 / 132 (signed re-pred D-HOP-2026-10-30-08; table had 77 / 126 / 294) | 47 / 77 / 132 (baseline 68/115/153) | PASS |  |
| 894 | casual | N | G4 longest nothing-affordable F10–30, P50 / P95 / worst (s), any-row (M5.0 record, D-HOP-3 | Y | 36 / 64 / 92 (signed re-pred D-HOP-2026-10-30-08; table had 70 / 126 / 196) | 36 / 64 / 92 (baseline 59/94/129) | PASS |  |
| 895 | optimal | H | G4 longest nothing-affordable F10–30, P50 / P95 / worst (s), any-row (M5.0 record, D-HOP-3 | Y | 70 / 107 / 191 (signed re-pred D-HOP-2026-10-30-08; table had 84 / 166 / 272) | 70 / 107 / 191 (baseline 104/161/202) | PASS |  |
| 895 | seller15 | H | G4 longest nothing-affordable F10–30, P50 / P95 / worst (s), any-row (M5.0 record, D-HOP-3 | Y | 47 / 86 / 120 (signed re-pred D-HOP-2026-10-30-08; table had 78 / 142 / 231) | 47 / 86 / 120 (baseline 68/115/153) | PASS |  |
| 895 | casual | H | G4 longest nothing-affordable F10–30, P50 / P95 / worst (s), any-row (M5.0 record, D-HOP-3 | Y | 40 / 81 / 140 (signed re-pred D-HOP-2026-10-30-08; table had 73 / 141 / 216) | 40 / 81 / 140 (baseline 59/94/129) | PASS |  |
| 896 | optimal | N / H | G4 P95 ≤ 180 s, any-row (D-HOP-2026-10-24-30 (2); D-HOP-36 (2)) | Y | 114 / 107 (signed re-pred D-HOP-2026-10-30-08; table had 160) | 114 / 107 (N / H) | PASS |  |
| 896 | seller15 | N / H | G4 P95 ≤ 180 s, any-row (D-HOP-2026-10-24-30 (2); D-HOP-36 (2)) | Y | 77 / 86 (signed re-pred D-HOP-2026-10-30-08; table had 126) | 77 / 86 (N / H) | PASS |  |
| 896 | casual | N / H | G4 P95 ≤ 180 s, any-row (D-HOP-2026-10-24-30 (2); D-HOP-36 (2)) | Y | 64 / 81 (signed re-pred D-HOP-2026-10-30-08; table had 126) | 64 / 81 (N / H) | PASS |  |
| 897 | optimal | N / H | G4 absolute ≤ 180 s, worst seed, any-row (D-HOP-2026-10-24-30 (3): warning, pre-existing L | N | 234 / 272 | 143 / 191 | WARN | worst 191 > 180 s (pre-existing L0–30 dead zone, known risk) |
| 897 | seller15 | N / H | G4 absolute ≤ 180 s, worst seed, any-row (D-HOP-2026-10-24-30 (3): warning, pre-existing L | N | 294 / 231 | 132 / 120 | INFO |  |
| 897 | casual | N / H | G4 absolute ≤ 180 s, worst seed, any-row (D-HOP-2026-10-24-30 (3): warning, pre-existing L | N | 196 / 216 | 92 / 140 | INFO |  |
| 898 | optimal | N | G4 meaningful rows (D-HOP-2026-10-24-35; FARM and W* always count, D-HOP-36 (3)), P50 / P9 | N | 135 / 231 / 286 |  | NOT-WIRED | G4 meaningful-rows counting (G4M, D-HOP-36) is not in tests/bot-m5.ts |
| 898 | seller15 | N | G4 meaningful rows (D-HOP-2026-10-24-35; FARM and W* always count, D-HOP-36 (3)), P50 / P9 | N | 95 / 162 / 294 |  | NOT-WIRED | G4 meaningful-rows counting (G4M, D-HOP-36) is not in tests/bot-m5.ts |
| 898 | casual | N | G4 meaningful rows (D-HOP-2026-10-24-35; FARM and W* always count, D-HOP-36 (3)), P50 / P9 | N | 80 / 158 / 200 |  | NOT-WIRED | G4 meaningful-rows counting (G4M, D-HOP-36) is not in tests/bot-m5.ts |
| 899 | optimal | H | G4 meaningful rows (D-HOP-2026-10-24-35; FARM and W* always count, D-HOP-36 (3)), P50 / P9 | N | 135 / 237 / 292 |  | NOT-WIRED | G4 meaningful-rows counting (G4M, D-HOP-36) is not in tests/bot-m5.ts |
| 899 | seller15 | H | G4 meaningful rows (D-HOP-2026-10-24-35; FARM and W* always count, D-HOP-36 (3)), P50 / P9 | N | 104 / 182 / 277 |  | NOT-WIRED | G4 meaningful-rows counting (G4M, D-HOP-36) is not in tests/bot-m5.ts |
| 899 | casual | H | G4 meaningful rows (D-HOP-2026-10-24-35; FARM and W* always count, D-HOP-36 (3)), P50 / P9 | N | 82 / 162 / 219 |  | NOT-WIRED | G4 meaningful-rows counting (G4M, D-HOP-36) is not in tests/bot-m5.ts |
| 900 | optimal | N | G5 workers L10 P95 (min) | Y | 11.05 | 11.05 | PASS |  |
| 900 | seller15 | N | G5 workers L10 P95 (min) | Y | 11.37 | 11.57 | PASS |  |
| 900 | casual | N | G5 workers L10 P95 (min) | Y | 14.11 | 14.11 | PASS |  |
| 901 | optimal | N | L30 median (min) | N | 34.4 | 30.4 | INFO |  |
| 901 | seller15 | N | L30 median (min) | N | 35.2 | 31.2 | INFO |  |
| 901 | casual | N | L30 median (min) | N | 37.2 | 33.4 | INFO |  |
| 902 | optimal | any | Peak per-sale multiplier, F18 | N | ×4.51 |  | NOT-WIRED | peak per-sale multiplier is a formula row; no measured counterpart in windowGate() |
| 902 | seller15 | any | Peak per-sale multiplier, F18 | N | ×4.51 |  | NOT-WIRED | peak per-sale multiplier is a formula row; no measured counterpart in windowGate() |
| 902 | casual | any | Peak per-sale multiplier, F18 | N | ×4.51 |  | NOT-WIRED | peak per-sale multiplier is a formula row; no measured counterpart in windowGate() |
| 903 | optimal | bots | SS-21 sales-stopped chip on vs off | Y | identical traces |  | N/A | NOT APPLICABLE: QA-D-1030-SS15-NA / D-CEO-20261030-04: #5b not in RC (manifest row 23); salesStopped ships flag-off with no code, so there is no chip on/off trace to compare |
| 903 | seller15 | bots | SS-21 sales-stopped chip on vs off | Y | identical |  | N/A | NOT APPLICABLE: QA-D-1030-SS15-NA / D-CEO-20261030-04: #5b not in RC (manifest row 23); salesStopped ships flag-off with no code, so there is no chip on/off trace to compare |
| 903 | casual | bots | SS-21 sales-stopped chip on vs off | Y | identical |  | N/A | NOT APPLICABLE: QA-D-1030-SS15-NA / D-CEO-20261030-04: #5b not in RC (manifest row 23); salesStopped ships flag-off with no code, so there is no chip on/off trace to compare |
| 904 | optimal | ac7 | AC7 2x active/idle gate on the tree's data/economy.csv (CSV-RECORD captured) | Y | PASS |  | NOT-WIRED | not run in CI (RC-only): AC7 runs only inside the recorded RC run (scripts/pacing-x1-run.sh writes ac7.json; verdict --require-ac7); blocking, so the verdict is FAIL here |
| 904 | seller15 | ac7 | AC7 2x active/idle gate on the tree's data/economy.csv (CSV-RECORD captured) | Y | PASS |  | NOT-WIRED | not run in CI (RC-only): AC7 runs only inside the recorded RC run (scripts/pacing-x1-run.sh writes ac7.json; verdict --require-ac7); blocking, so the verdict is FAIL here |
| 904 | casual | ac7 | AC7 2x active/idle gate on the tree's data/economy.csv (CSV-RECORD captured) | Y | PASS |  | NOT-WIRED | not run in CI (RC-only): AC7 runs only inside the recorded RC run (scripts/pacing-x1-run.sh writes ac7.json; verdict --require-ac7); blocking, so the verdict is FAIL here |
| 905 | optimal | N | Each flag off vs on, alone | Y | §6.1 per-source row ±20% | golden off: P95 1.463 (Δon 0.291), seedMax P95 1.466, worst 1.48; streak off: P95 1.446 (Δon 0.308), seedMax P95 1.499, worst 1.57; tapCoins off: P95 1.723 (Δon 0.031), seedMax P95 1.771, worst 1.847; broody off: P95 1.703 (Δon 0.051), seedMax P95 1.749, worst 1.824; abilities off: P95 1.666 (Δon 0.088), seedMax P95 1.706, worst 1.785 | PASS |  |
| 905 | seller15 | N | Each flag off vs on, alone | Y |  | golden off: P95 1.451 (Δon 0.251), seedMax P95 1.455, worst 1.466; streak off: P95 1.403 (Δon 0.299), seedMax P95 1.464, worst 1.508; tapCoins off: P95 1.684 (Δon 0.018), seedMax P95 1.742, worst 1.798; broody off: P95 1.652 (Δon 0.05), seedMax P95 1.709, worst 1.758; abilities off: P95 1.617 (Δon 0.085), seedMax P95 1.67, worst 1.707 | PASS |  |
| 905 | casual | N | Each flag off vs on, alone | Y |  | golden off: P95 1.453 (Δon 0.215), seedMax P95 1.456, worst 1.46; streak off: P95 1.378 (Δon 0.29), seedMax P95 1.439, worst 1.484; tapCoins off: P95 1.653 (Δon 0.015), seedMax P95 1.719, worst 1.797; broody off: P95 1.621 (Δon 0.047), seedMax P95 1.689, worst 1.754; abilities off: P95 1.581 (Δon 0.087), seedMax P95 1.619, worst 1.723 | PASS |  |
| 906 | optimal | — | G5-P (a) yawn pause, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-checkpoi | Y | −16.5 / −17.2 / −16.3% (−11.32% s188 F10) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 906 | seller15 | — | G5-P (a) yawn pause, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-checkpoi | Y | −16.9 / −18.3 / −22.2% (−8.14% s37 F18) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 906 | casual | — | G5-P (a) yawn pause, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-checkpoi | Y | −39.1 / −42.1 / −48.6% (−26.81% s108 F10) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 907 | optimal | — | G5-P (b) stockpile-and-Rush, lockout 45, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24  | Y | −11.0 / −11.1 / −10.3% (−6.69% s185 F10) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 907 | seller15 | — | G5-P (b) stockpile-and-Rush, lockout 45, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24  | Y | −8.3 / −8.4 / −7.8% (−1.90% s183 F18) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 907 | casual | — | G5-P (b) stockpile-and-Rush, lockout 45, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24  | Y | −19.1 / −17.6 / −24.6% (−2.73% s157 F18) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 908 | optimal | — | G5-P (c) bench Market Hand, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-c | N | −15.3 / −15.6 / −14.5% (−10.62% s70 F18) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 908 | seller15 | — | G5-P (c) bench Market Hand, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-c | N | −12.4 / −12.8 / −12.2% (−5.43% s37 F18) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 908 | casual | — | G5-P (c) bench Market Hand, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-c | N | −31.6 / −35.5 / −44.6% (−16.64% s86 F10) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 909 | optimal | — | G5-P (d) Grader pause at ≤ 50%, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst se | Y | +0.0 / +0.0 / −59.9% (+0.00% s1 F10) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 909 | seller15 | — | G5-P (d) Grader pause at ≤ 50%, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst se | Y | +0.0 / +0.0 / −57.5% (+0.00% s1 F10) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 909 | casual | — | G5-P (d) Grader pause at ≤ 50%, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst se | Y | +0.0 / +0.0 / −59.0% (+0.00% s1 F10) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 910 | optimal | — | G5-P (e) short pause, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-checkpo | Y | +0.0 / +0.0 / −0.1% (+1.35% s25 F24) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 910 | seller15 | — | G5-P (e) short pause, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-checkpo | Y | −0.0 / −0.0 / −0.1% (+1.01% s50 F10) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 910 | casual | — | G5-P (e) short pause, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-checkpo | Y | −0.0 / −0.1 / −0.2% (+1.14% s120 F18) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 911 | optimal | — | G5-P (f) full-coop pause, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-che | Y | −3.2 / −1.2 / +0.0% (+1.26% s34 F10) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 911 | seller15 | — | G5-P (f) full-coop pause, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-che | Y | −2.1 / −0.7 / +0.0% (+0.78% s31 F18) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 911 | casual | — | G5-P (f) full-coop pause, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-che | Y | −2.0 / −0.3 / +0.0% (+1.11% s19 F18) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 912 | optimal | — | G5-P (g) wage-skip bench, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-che | Y | −16.5 / −16.8 / −16.0% (−11.99% s70 F18) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 912 | seller15 | — | G5-P (g) wage-skip bench, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-che | Y | −13.5 / −14.0 / −13.5% (−6.61% s37 F18) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 912 | casual | — | G5-P (g) wage-skip bench, fix (ii) as ruled (GPAUSE=2), mean Δ F10/F18/F24 (worst seed-che | Y | −31.6 / −35.5 / −44.6% (−16.56% s86 F10) |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 913 | optimal | all profiles | G5-P pause-driver summary, (a)–(g), fix (ii) as ruled (GPAUSE=2), lockout 45, 4 profiles | Y | seed-checkpoints > +2.0% / > +2.5%: 0 / 0 of 14,400 (GPAUSE=1 reference 0 / 0; baseline without fix 5 / 2); worst +1.35% (e) optimal s25 F24; every mean ≤ +0.00%; Frenzy carry-over adds ≤ +0.43 pp to any worst seed ((b)); 0–99 cross-check 0 / 0 of 7,200 |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 913 | seller15 | all profiles | G5-P pause-driver summary, (a)–(g), fix (ii) as ruled (GPAUSE=2), lockout 45, 4 profiles | Y |  |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
| 913 | casual | all profiles | G5-P pause-driver summary, (a)–(g), fix (ii) as ruled (GPAUSE=2), lockout 45, 4 profiles | Y |  |  | EXCLUDED | EXCLUDED-not-judged: G5-P pause rows stay out until Features delivers the driver (D-HOE-20261029-05, engineering/decisions.md:230); never PASS, X1 does not cover G5-P |
