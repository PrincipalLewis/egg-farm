# combined QA ce7d59a suite=core (2026-10-17 00:14 CEST)

| suite | check | engine | result |
|---|---|---|---|
| setup | clean clone, no outside links | - | PASS |
| build | npm run build (release + check-release-build) | - | PASS index-CxSBr014.js |
| build | npm run build:qa (dist-qa) | - | PASS index-CGgD-9Bl.js |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | FAIL 1 pass / 1 fail FAIL [chromium] release globals: only eggfarmExportTelemetry allowed — {"appGlobals":["eggfarmExportTelemetry","eggfarm","eggfarmOrderList; |
| core | economy-copy-cell-by-cell-data-vs-product | - | PASS identical, 32 rows, 1472 cells |
| core | F1-GAP-economy.f1-F18-11076-F19-18201-w4-5538-9100 | - | PASS 4/4 |
| core | TR-5 tr5_run.py --seeds 30 --scenario standard | - | PASS RESULT: PASS |
| core | suite runtime | - | 0m1s |

Total wall time 0m13s. PASS 6 FAIL 1 N/A 0
