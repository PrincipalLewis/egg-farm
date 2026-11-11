# combined QA 2490c79 suite=all (2026-10-16 13:38 CEST)

| suite | check | engine | result |
|---|---|---|---|
| setup | clean clone, no outside links | - | PASS |
| unit | vitest clean clone | - | PASS  Tests 399 passed | 2 skipped (401) |
| unit | vitest workspace-linked (/tmp/qa-x/ws/product -> product/) | - | PASS  Tests 401 passed (401) |
| build | npm run build (release + check-release-build) | - | PASS index-DjkebpVj.js |
| build | npm run build:qa (dist-qa) | - | PASS index-CEa7reKm.js |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| core | economy-copy cell-by-cell data-vs-product | - | PASS identical, 32 rows, 1472 cells |
| core | F1-GAP economy.f1.csv (F18 11076, F19 18201, w4 5538/9100) | - | FAIL exit 1  |
| core | TR-5 tr5_run.py --seeds 30 --scenario standard | - | PASS RESULT: PASS |
| core | suite runtime | - | 0m7s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| save | fixture migrations v4/v5 -> current (+wageFracCents if v6), corrupt rejected | - | PASS 9/9 (save version 5; v6/wageFracCents N/A at this SHA) |
| save | offline-clock-code | - | PASS 17/17 |
| save | v6-migrations-wageFrac | webkit | N/A (no wageFracCents/save v6 in 2490c79) |
| save | v6-migrations-wageFrac | chromium | N/A (no wageFracCents/save v6 in 2490c79) |
| save | v6-migrations-wageFrac | firefox | N/A (no wageFracCents/save v6 in 2490c79) |
| save | durability (guard R1-R6, D2 kill, 780 save_restore) | webkit | N/A (IndexedDB mirror / save-durability not in 2490c79) |
| save | durability (guard R1-R6, D2 kill, 780 save_restore) | firefox | N/A (IndexedDB mirror / save-durability not in 2490c79) |
| save | durability (guard R1-R6, D2 kill, 780 save_restore) | chromium | N/A (IndexedDB mirror / save-durability not in 2490c79) |
| save | offline-clock | chromium | PASS 6 pass |
| save | offline-clock | webkit | PASS 6 pass |
| save | offline-clock | firefox | PASS 6 pass |
| save | qa-pt1-browser telemetry/install_id (dist, C/F/W/iOS-WebKit) | - | PASS 4 engines |
| save | qa-pt1-browser telemetry/install_id (dist-qa, C/F/W/iOS-WebKit) | - | PASS 4 engines |
| save | suite runtime | - | 1m0s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| ui | s2-8-wage-label-boundaries-code | - | PASS 15/15 |
| ui | rc1-ui-plan | chromium | PASS 35 pass, 1 known: FAIL [chromium] S2-5 4 equal nav buttons, 64px tall — [["Market",97,; |
| ui | rc1-ui-plan | webkit | PASS 35 pass, 1 known: FAIL [webkit] S2-5 4 equal nav buttons, 64px tall — [["Market",97,64; |
| ui | rc1-ui-plan | firefox | PASS 35 pass, 1 known: FAIL [firefox] S2-5 4 equal nav buttons, 64px tall — [["Market",96,6; |
| ui | fasttap | chromium | PASS 13 pass, 1 known: FAIL [chromium] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"; |
| ui | s2-8-wage-label-browser-360 | chromium | PASS 20 pass |
| ui | fasttap | firefox | PASS 13 pass, 1 known: FAIL [firefox] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"f; |
| ui | s2-8-wage-label-browser-360 | firefox | PASS 20 pass |
| ui | fasttap | webkit | PASS 13 pass, 1 known: FAIL [webkit] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"we; |
| ui | s2-8-wage-label-browser-360 | webkit | PASS 20 pass |
| ui | eng-rc0-browser | chromium | PASS exit 0 113/113 passed |
| ui | eng-rc0-browser | webkit | PASS exit 0 113/113 passed |
| ui | eng-rc0-browser | firefox | PASS exit 0 113/113 passed |
| ui | suite runtime | - | 6m56s |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| money | s2-8-exact-wage | chromium | N/A (exact-rate wages (wageFracCents) not in 2490c79) |
| money | s2-8-exact-wage | firefox | N/A (exact-rate wages (wageFracCents) not in 2490c79) |
| money | s2-8-exact-wage | webkit | N/A (exact-rate wages (wageFracCents) not in 2490c79) |
| money | zero-gate | chromium | N/A ($0 gate with wageFracCents not in 2490c79) |
| money | zero-gate | firefox | N/A ($0 gate with wageFracCents not in 2490c79) |
| money | zero-gate | webkit | N/A ($0 gate with wageFracCents not in 2490c79) |
| money | suite runtime | - | 0m6s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| f1 | market-hand-min-wait-2s | - | N/A (market_hand_min_wait_s not in 2490c79) |
| f1 | pacing-bands-f1-proposal | - | N/A (F1 economy not merged at this SHA; current economy vs F1 bands: 14/24 in band) |
| f1 | npm run check-economy-copy | - | N/A (script not in package.json at 2490c79) |
| f1 | suite runtime | - | 0m35s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| market | MK-20-sim-hash | - | N/A (served_dwell_ms not in 2490c79) |
| market | MK-16-22 | chromium | N/A (served_dwell_ms not in 2490c79) |
| market | MK-16-22 | firefox | N/A (served_dwell_ms not in 2490c79) |
| market | MK-16-22 | webkit | N/A (served_dwell_ms not in 2490c79) |
| market | MK-23-25-orders-copy-pay | chromium | PASS 2 pass, 4 N/A |
| market | MK-23-25-orders-copy-pay | webkit | PASS 2 pass, 4 N/A |
| market | MK-23-25-orders-copy-pay | firefox | PASS 2 pass, 4 N/A |
| market | suite runtime | - | 0m19s |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| release | tag-latest-hash-playthrough | webkit | PASS 5 pass |
| release | tag-latest-hash-playthrough | chromium | PASS 7 pass |
| release | tag-latest-hash-playthrough | firefox | PASS 5 pass |
| release | suite runtime | - | 0m33s |

Total wall time 11m41s. PASS 54 FAIL 1 N/A 19
