# combined QA 2490c79 suite=core (2026-10-16 13:50 CEST)

| suite | check | engine | result |
|---|---|---|---|
| setup | clean clone, no outside links | - | PASS |
| build | npm run build (release + check-release-build) | - | PASS index-DjkebpVj.js |
| build | npm run build:qa (dist-qa) | - | PASS index-CEa7reKm.js |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| core | economy-copy-cell-by-cell-data-vs-product | - | PASS identical, 32 rows, 1472 cells |
| core | F1-GAP-economy.f1-F18-11076-F19-18201-w4-5538-9100 | - | PASS 4/4 |
| core | TR-5 tr5_run.py --seeds 30 --scenario standard | - | PASS RESULT: PASS |
| core | suite runtime | - | 0m2s |

Total wall time 0m15s. PASS 9 FAIL 0 N/A 0
