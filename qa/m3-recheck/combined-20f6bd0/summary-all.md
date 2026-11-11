# combined QA 20f6bd0 suite=all (2026-10-16 13:11 CEST)

| suite | check | engine | result |
|---|---|---|---|
| setup | clean clone, no outside links | - | PASS |
| unit | vitest clean clone | - | PASS  Tests 373 passed | 2 skipped (375) |
| unit | vitest workspace-linked (/tmp/qa-x/ws/product -> product/) | - | PASS  Tests 375 passed (375) |
| build | npm run build (release + check-release-build) | - | PASS index-Ci7iwQ7m.js |
| build | npm run build:qa (dist-qa) | - | PASS index-DODJ4jTS.js |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| save | fixture migrations v4/v5 -> current (+wageFracCents if v6), corrupt rejected | - | PASS 9/9 (save version 6) |
| save | offline-clock-code | - | PASS 17/17 |
| save | v6-migrations-wageFrac-0gate | chromium | FAIL 4 pass / 3 fail FAIL [chromium] save v5->v6 m2-rc1-v5-12min.json: money, levels, workers kept; wageFracCents {} — {"from":{"coins":15061,"farm":10,"coll":;FAIL [chromium] save v5->v6 m2-rc1-v5-40min.json: money, levels, workers kept; wageFracCents {} — {"from":{"coins":1291591,"farm":19,"coll;FAIL [chromium] save v5->v6 m2-rc1-v5-40min-edge.json: money, levels, workers kept; wageFracCents {} — {"from":{"coins":1291591,"farm":19,; |
| save | v6-migrations-wageFrac-0gate | webkit | FAIL 5 pass / 2 fail FAIL [webkit] save v5->v6 m2-rc1-v5-40min.json: money, levels, workers kept; wageFracCents {} — {"from":{"coins":1291591,"farm":19,"coll":;FAIL [webkit] save v5->v6 m2-rc1-v5-40min-edge.json: money, levels, workers kept; wageFracCents {} — {"from":{"coins":1291591,"farm":19,"c; |
| save | v6-migrations-wageFrac-0gate | firefox | FAIL 6 pass / 1 fail FAIL [firefox] save v5->v6 m2-rc1-v5-40min-edge.json: money, levels, workers kept; wageFracCents {} — {"from":{"coins":1291591,"farm":19,"; |
| save | durability-guard-R1-R6 | chromium | PASS 1 pass |
| save | durability-guard-R1-R6 | webkit | PASS 1 pass |
| save | durability-guard-R1-R6 | firefox | PASS 1 pass |
| save | durability-D2-kill | chromium | FAIL 6 pass / 27 fail LOSS [chromium] {"mode":"delay","D":0,"rep":0,"B":1719,"L1":2019,"after":1719,"lost":300,"wholeLost":true,"recovery":0,"vis":null,"killed":1;LOSS [chromium] {"mode":"delay","D":0,"rep":1,"B":1719,"L1":2019,"after":1719,"lost":300,"wholeLost":true,"recovery":0,"vis":null,"killed":1;LOSS [chromium] {"mode":"delay","D":0,"rep":2,"B":1719,"L1":2019,"after":1719,"lost":300,"wholeLost":true,"recovery":0,"vis":null,"killed":1; |
| save | durability-780-save_restore | chromium | FAIL no results (exit 1)  Node.js v20.19.2  |
| save | durability-D2-kill | webkit | FAIL 21 pass / 9 fail / 3 known LOSS [webkit] {"mode":"delay","D":0,"rep":0,"B":1719,"L1":2019,"after":1719,"lost":300,"wholeLost":false,"recovery":0,"vis":null,"killed":5};LOSS [webkit] {"mode":"delay","D":0,"rep":1,"B":1719,"L1":2019,"after":1719,"lost":300,"wholeLost":false,"recovery":0,"vis":null,"killed":5};LOSS [webkit] {"mode":"delay","D":0,"rep":2,"B":1719,"L1":2019,"after":1719,"lost":300,"wholeLost":false,"recovery":0,"vis":null,"killed":5}; |
| save | offline-clock | chromium | FAIL 4 pass / 2 fail FAIL [chromium] 1 h away: offline grant > 0 with welcome-back modal — {"pend":9902,"modal":false,"cap":7200,"errs":0};FAIL [chromium] grant proportional: cap grant / 1 h grant = cap/3600 (±1 egg) — {"h1":9902,"cap":19800}; |
| save | durability-780-save_restore | webkit | FAIL no results (exit 1)  Node.js v20.19.2  |
| save | offline-clock | webkit | FAIL 4 pass / 2 fail FAIL [webkit] 1 h away: offline grant > 0 with welcome-back modal — {"pend":9903,"modal":false,"cap":7200,"errs":0};FAIL [webkit] grant proportional: cap grant / 1 h grant = cap/3600 (±1 egg) — {"h1":9903,"cap":19800}; |
| save | durability-D2-kill | firefox | FAIL 14 pass / 13 fail LOSS [firefox] {"mode":"delay","D":0,"rep":0,"B":1719,"L1":2019,"after":0,"lost":2019,"wholeLost":true,"recovery":0,"vis":null,"killed":7};LOSS [firefox] {"mode":"delay","D":0,"rep":1,"B":1719,"L1":2019,"after":0,"lost":2019,"wholeLost":true,"recovery":0,"vis":null,"killed":7};LOSS [firefox] {"mode":"delay","D":0,"rep":2,"B":1719,"L1":2019,"after":0,"lost":2019,"wholeLost":true,"recovery":0,"vis":null,"killed":7}; |
| save | durability-780-save_restore | firefox | FAIL no results (exit 1)  Node.js v20.19.2  |
| save | offline-clock | firefox | PASS 6 pass |
| save | qa-pt1-browser telemetry/install_id (dist, C/F/W/iOS-WebKit) | - | PASS 4 engines |
| save | qa-pt1-browser telemetry/install_id (dist-qa, C/F/W/iOS-WebKit) | - | PASS 4 engines |
| save | suite runtime | - | 12m36s |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| ui | s2-8-wage-label-boundaries-code | - | N/A (s2-economy-ui fmtExactRate not in 20f6bd0) |
| ui | rc1-ui-plan | chromium | FAIL 3 pass / 11 fail / 1 known FAIL [chromium] S2-6 360px queue-full tag straddles strip, covers no chip — {"text":"Queue full","straddle":false,"over":true,"n":9};FAIL [chromium] S2-6/S2-9 (script error) — "Error: page.evaluate: TypeError: Failed to execute 'getComputedStyle' on 'Window': parameter 1;FAIL [chromium] S2-5 one visible Manage-all control, labelled (no unlabeled/duplicate) — {"manageAll":1,"unlabeled":1,"nav":[["Market",108; |
| ui | rc1-ui-plan | webkit | FAIL 3 pass / 11 fail / 1 known FAIL [webkit] S2-6 360px queue-full tag straddles strip, covers no chip — {"text":"Queue full","straddle":false,"over":true,"n":9};FAIL [webkit] S2-6/S2-9 (script error) — "Error: page.evaluate: TypeError: Argument 1 ('element') to Window.getComputedStyle must be an in;FAIL [webkit] S2-5 one visible Manage-all control, labelled (no unlabeled/duplicate) — {"manageAll":1,"unlabeled":1,"nav":[["Market",108,6; |
| ui | rc1-ui-plan | firefox | FAIL 3 pass / 11 fail / 1 known FAIL [firefox] S2-6 360px queue-full tag straddles strip, covers no chip — {"text":"Queue full","straddle":false,"over":true,"n":9};FAIL [firefox] S2-6/S2-9 (script error) — "Error: page.evaluate: Window.getComputedStyle: Argument 1 is not an object.\n@debugger eval cod;FAIL [firefox] S2-5 one visible Manage-all control, labelled (no unlabeled/duplicate) — {"manageAll":1,"unlabeled":1,"nav":[["Market",108,; |
| ui | fasttap | chromium | PASS 13 pass, 1 known: FAIL [chromium] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"; |
| ui | s2-8-wage-label-browser | chromium | N/A (fmtExactRate/wage label not in 20f6bd0) |
| ui | fasttap | firefox | PASS 13 pass, 1 known: FAIL [firefox] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"f; |
| ui | s2-8-wage-label-browser | firefox | N/A (fmtExactRate/wage label not in 20f6bd0) |
| ui | fasttap | webkit | PASS 13 pass, 1 known: FAIL [webkit] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"we; |
| ui | s2-8-wage-label-browser | webkit | N/A (fmtExactRate/wage label not in 20f6bd0) |
| ui | eng-rc0-browser | chromium | PASS exit 0 56/56 passed |
| ui | eng-rc0-browser | firefox | FAIL exit 1 34/39 passed |
| ui | eng-rc0-browser | webkit | FAIL exit 1 24/30 passed |
| ui | suite runtime | - | 4m8s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| money | s2-8-exact-wage-60s-10min | chromium | PASS 4 pass, 1 N/A |
| money | s2-8-exact-wage-60s-10min | webkit | PASS 4 pass, 1 N/A |
| money | s2-8-exact-wage-60s-10min | firefox | PASS 4 pass, 1 N/A |
| money | zero-gate-carried-frac | chromium | FAIL 4 pass / 3 fail FAIL [chromium] save v5->v6 m2-rc1-v5-12min.json: money, levels, workers kept; wageFracCents {} — {"from":{"coins":15061,"farm":10,"coll":;FAIL [chromium] save v5->v6 m2-rc1-v5-40min.json: money, levels, workers kept; wageFracCents {} — {"from":{"coins":1291591,"farm":19,"coll;FAIL [chromium] save v5->v6 m2-rc1-v5-40min-edge.json: money, levels, workers kept; wageFracCents {} — {"from":{"coins":1291591,"farm":19,; |
| money | zero-gate-carried-frac | webkit | FAIL 6 pass / 1 fail FAIL [webkit] save v5->v6 m2-rc1-v5-40min.json: money, levels, workers kept; wageFracCents {} — {"from":{"coins":1291591,"farm":19,"coll":; |
| money | zero-gate-carried-frac | firefox | PASS 7 pass |
| money | suite runtime | - | 1m45s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| f1 | market-hand-min-wait-2s | - | N/A (market_hand_min_wait_s not in 20f6bd0) |
| f1 | pacing-bands-f1-proposal | - | N/A (F1 economy not merged at this SHA; current economy vs F1 bands: 14/24 in band) |
| f1 | npm run check-economy-copy | - | PASS check-economy-copy: ../product/economy.csv not found - skipped |
| f1 | suite runtime | - | 0m58s |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| market | MK-20-sim-hash | - | PASS 2/2 |
| market | MK-16-22-served-dwell | chromium | FAIL 4 pass / 2 fail FAIL [chromium] MK-16 served card shows "Thanks! +$X" ~1.5 s then leaves — {"n":25,"min":798,"max":1505,"early":[{"L":798,"pop":false,"squ;FAIL [chromium] MK-19 reduced motion: static "Thanks!" card, same ~1.5 s dwell — {"rm":{"rm":true,"anim":"none"},"life":[899,1500,1502,150; |
| market | MK-16-22-served-dwell | webkit | FAIL 4 pass / 2 fail FAIL [webkit] MK-16 served card shows "Thanks! +$X" ~1.5 s then leaves — {"n":25,"min":1027,"max":1570,"early":[{"L":1027,"pop":false,"squ;FAIL [webkit] MK-19 reduced motion: static "Thanks!" card, same ~1.5 s dwell — {"rm":{"rm":true,"anim":"none"},"life":[1226,1564,1568,1464; |
| market | MK-16-22-served-dwell | firefox | FAIL 4 pass / 2 fail FAIL [firefox] MK-16 served card shows "Thanks! +$X" ~1.5 s then leaves — {"n":25,"min":909,"max":1608,"early":[{"L":909,"pop":false,"sque;FAIL [firefox] MK-19 reduced motion: static "Thanks!" card, same ~1.5 s dwell — {"rm":{"rm":true,"anim":"none"},"life":[1131,1513,1510,150; |
| market | MK-23-25-orders-copy-pay | chromium | PASS 2 pass, 4 N/A |
| market | MK-23-25-orders-copy-pay | webkit | PASS 2 pass, 4 N/A |
| market | MK-23-25-orders-copy-pay | firefox | PASS 2 pass, 4 N/A |
| market | suite runtime | - | 3m7s |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | FAIL 1 pass / 1 fail FAIL [webkit] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | FAIL 1 pass / 1 fail FAIL [firefox] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"; |
| release | tag-latest-hash-playthrough | chromium | FAIL 4 pass / 1 fail, 2 N/A FAIL [chromium] release globals only eggfarmExportTelemetry — ["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| release | tag-latest-hash-playthrough | firefox | FAIL 4 pass / 1 fail FAIL [firefox] release globals only eggfarmExportTelemetry — ["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| release | tag-latest-hash-playthrough | webkit | FAIL 4 pass / 1 fail FAIL [webkit] release globals only eggfarmExportTelemetry — ["eggfarmExportTelemetry","eggfarm","eggfarmOrderList"]; |
| release | suite runtime | - | 0m35s |

Total wall time 28m1s. PASS 26 FAIL 42 N/A 6
