# combined QA aa66bdb suite=all (2026-10-16 13:11 CEST)

| suite | check | engine | result |
|---|---|---|---|
| setup | clean clone, no outside links | - | PASS |
| unit | vitest clean clone | - | PASS  Tests 381 passed | 2 skipped (383) |
| unit | vitest workspace-linked (/tmp/qa-x/ws/product -> product/) | - | PASS  Tests 383 passed (383) |
| build | npm run build (release + check-release-build) | - | PASS index-CM0CW_ot.js |
| build | npm run build:qa (dist-qa) | - | PASS index-tijW0_nx.js |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| save | fixture migrations v4/v5 -> current (+wageFracCents if v6), corrupt rejected | - | PASS 9/9 (save version 5; v6/wageFracCents N/A at this SHA) |
| save | offline-clock-code | - | PASS 17/17 |
| save | v6-migrations-wageFrac | webkit | N/A (no wageFracCents/save v6 in aa66bdb) |
| save | v6-migrations-wageFrac | chromium | N/A (no wageFracCents/save v6 in aa66bdb) |
| save | v6-migrations-wageFrac | firefox | N/A (no wageFracCents/save v6 in aa66bdb) |
| save | durability-guard-R1-R6 | chromium | PASS 1 pass |
| save | durability-guard-R1-R6 | webkit | PASS 1 pass |
| save | durability-guard-R1-R6 | firefox | PASS 1 pass |
| save | durability-D2-kill | chromium | FAIL 8 pass / 25 fail LOSS [chromium] {"mode":"delay","D":0,"rep":0,"B":1719,"L1":1819,"after":1719,"lost":100,"wholeLost":true,"recovery":0,"vis":null,"killed":1;LOSS [chromium] {"mode":"delay","D":0,"rep":1,"B":1719,"L1":1819,"after":1719,"lost":100,"wholeLost":true,"recovery":0,"vis":null,"killed":1;LOSS [chromium] {"mode":"delay","D":0,"rep":2,"B":1719,"L1":1819,"after":1719,"lost":100,"wholeLost":true,"recovery":0,"vis":null,"killed":1; |
| save | durability-780-save_restore | chromium | FAIL no results (exit 1)  Node.js v20.19.2  |
| save | durability-D2-kill | webkit | FAIL 21 pass / 9 fail / 3 known LOSS [webkit] {"mode":"delay","D":0,"rep":0,"B":1719,"L1":1819,"after":1719,"lost":100,"wholeLost":false,"recovery":0,"vis":null,"killed":5};LOSS [webkit] {"mode":"delay","D":0,"rep":1,"B":1719,"L1":1819,"after":1719,"lost":100,"wholeLost":false,"recovery":0,"vis":null,"killed":5};LOSS [webkit] {"mode":"delay","D":0,"rep":2,"B":1719,"L1":1819,"after":1719,"lost":100,"wholeLost":false,"recovery":0,"vis":null,"killed":5}; |
| save | offline-clock | chromium | FAIL 4 pass / 2 fail FAIL [chromium] 1 h away: offline grant > 0 with welcome-back modal — {"pend":9903,"modal":false,"cap":7200,"errs":0};FAIL [chromium] grant proportional: cap grant / 1 h grant = cap/3600 (±1 egg) — {"h1":9903,"cap":19800}; |
| save | durability-780-save_restore | webkit | FAIL no results (exit 1)  Node.js v20.19.2  |
| save | offline-clock | webkit | FAIL 4 pass / 2 fail FAIL [webkit] 1 h away: offline grant > 0 with welcome-back modal — {"pend":9903,"modal":false,"cap":7200,"errs":0};FAIL [webkit] grant proportional: cap grant / 1 h grant = cap/3600 (±1 egg) — {"h1":9903,"cap":19800}; |
| save | durability-D2-kill | firefox | FAIL 15 pass / 12 fail LOSS [firefox] {"mode":"delay","D":0,"rep":0,"B":1719,"L1":1819,"after":0,"lost":1819,"wholeLost":true,"recovery":0,"vis":null,"killed":7};LOSS [firefox] {"mode":"delay","D":0,"rep":1,"B":1719,"L1":1819,"after":0,"lost":1819,"wholeLost":true,"recovery":0,"vis":null,"killed":7};LOSS [firefox] {"mode":"delay","D":0,"rep":2,"B":1719,"L1":1819,"after":0,"lost":1819,"wholeLost":true,"recovery":0,"vis":null,"killed":7}; |
| save | durability-780-save_restore | firefox | FAIL no results (exit 1)  Node.js v20.19.2  |
| save | offline-clock | firefox | PASS 6 pass |
| save | qa-pt1-browser telemetry/install_id (dist, C/F/W/iOS-WebKit) | - | PASS 4 engines |
| save | qa-pt1-browser telemetry/install_id (dist-qa, C/F/W/iOS-WebKit) | - | PASS 4 engines |
| save | suite runtime | - | 12m10s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| ui | s2-8-wage-label-boundaries-code | - | PASS 15/15 |
| ui | rc1-ui-plan | chromium | PASS 35 pass, 1 known: FAIL [chromium] S2-5 4 equal nav buttons, 64px tall — [["Market",97,; |
| ui | rc1-ui-plan | webkit | PASS 35 pass, 1 known: FAIL [webkit] S2-5 4 equal nav buttons, 64px tall — [["Market",97,64; |
| ui | rc1-ui-plan | firefox | PASS 35 pass, 1 known: FAIL [firefox] S2-5 4 equal nav buttons, 64px tall — [["Market",96,6; |
| ui | fasttap | chromium | PASS 13 pass, 1 known: FAIL [chromium] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"; |
| ui | s2-8-wage-label-browser-360 | chromium | PASS 20 pass |
| ui | fasttap | firefox | PASS 13 pass, 1 known: FAIL [firefox] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"f; |
| ui | fasttap | webkit | PASS 13 pass, 1 known: FAIL [webkit] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"we; |
| ui | s2-8-wage-label-browser-360 | firefox | PASS 1 pass |
| ui | s2-8-wage-label-browser-360 | webkit | PASS 1 pass |
| ui | eng-rc0-browser | chromium | PASS exit 0 87/87 passed |
| ui | eng-rc0-browser | webkit | PASS exit 0 87/87 passed |
| ui | eng-rc0-browser | firefox | PASS exit 0 87/87 passed |
| ui | suite runtime | - | 7m3s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| money | s2-8-exact-wage | chromium | N/A (exact-rate wages (wageFracCents) not in aa66bdb) |
| money | s2-8-exact-wage | webkit | N/A (exact-rate wages (wageFracCents) not in aa66bdb) |
| money | s2-8-exact-wage | firefox | N/A (exact-rate wages (wageFracCents) not in aa66bdb) |
| money | zero-gate | firefox | N/A ($0 gate with wageFracCents not in aa66bdb) |
| money | zero-gate | webkit | N/A ($0 gate with wageFracCents not in aa66bdb) |
| money | zero-gate | chromium | N/A ($0 gate with wageFracCents not in aa66bdb) |
| money | suite runtime | - | 0m11s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| f1 | market-hand-min-wait-2s | - | N/A (market_hand_min_wait_s not in aa66bdb) |
| f1 | pacing-bands-f1-proposal | - | N/A (F1 economy not merged at this SHA; current economy vs F1 bands: 14/24 in band) |
| f1 | npm run check-economy-copy | - | N/A (script not in package.json at aa66bdb) |
| f1 | suite runtime | - | 0m48s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| market | MK-20-sim-hash | - | N/A (served_dwell_ms not in aa66bdb) |
| market | MK-16-22 | firefox | N/A (served_dwell_ms not in aa66bdb) |
| market | MK-16-22 | chromium | N/A (served_dwell_ms not in aa66bdb) |
| market | MK-16-22 | webkit | N/A (served_dwell_ms not in aa66bdb) |
| market | MK-23-25-orders-copy-pay | chromium | PASS 2 pass, 4 N/A |
| market | MK-23-25-orders-copy-pay | webkit | PASS 2 pass, 4 N/A |
| market | MK-23-25-orders-copy-pay | firefox | PASS 2 pass, 4 N/A |
| market | suite runtime | - | 0m25s |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| release | tag-latest-hash-playthrough | webkit | FAIL 4 pass / 1 fail FAIL [webkit] release globals only eggfarmExportTelemetry — ["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| release | tag-latest-hash-playthrough | chromium | FAIL 4 pass / 1 fail, 2 N/A FAIL [chromium] release globals only eggfarmExportTelemetry — ["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| release | tag-latest-hash-playthrough | firefox | FAIL 4 pass / 1 fail FAIL [firefox] release globals only eggfarmExportTelemetry — ["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| release | suite runtime | - | 0m45s |

Total wall time 26m15s. PASS 29 FAIL 29 N/A 16
