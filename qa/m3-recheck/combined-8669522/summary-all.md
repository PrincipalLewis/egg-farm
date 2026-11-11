# combined QA 8669522 suite=all (2026-10-16 14:02 CEST)

| suite | check | engine | result |
|---|---|---|---|
| setup | clean clone, no outside links | - | PASS |
| unit | vitest clean clone | - | PASS  Tests 401 passed | 2 skipped (403) |
| unit | vitest workspace-linked (/tmp/qa-x/ws/product -> product/) | - | PASS  Tests 403 passed (403) |
| build | npm run build (release + check-release-build) | - | PASS index-Cia051lf.js |
| build | npm run build:qa (dist-qa) | - | PASS index-Cj9EAs8A.js |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| core | economy-copy-cell-by-cell-data-vs-product | - | PASS identical, 32 rows, 1472 cells |
| core | F1-GAP-economy.f1-F18-11076-F19-18201-w4-5538-9100 | - | PASS 4/4 |
| core | TR-5 tr5_run.py --seeds 30 --scenario standard | - | PASS RESULT: PASS |
| core | suite runtime | - | 0m2s |
| save | fixture migrations v4/v5 -> current (+wageFracCents if v6), corrupt rejected | - | PASS 9/9 (save version 6) |
| save | offline-clock-code | - | PASS 17/17 |
| save | v6-migrations-wageFrac-0gate | chromium | PASS 7 pass |
| save | v6-migrations-wageFrac-0gate | webkit | PASS 7 pass |
| save | v6-migrations-wageFrac-0gate | firefox | FAIL script crash (exit 1) after 4 pass: page.evaluate: can't access property "state", g is undefined [harness, see log] |
| save | durability-guard-R1-R6 | webkit | FAIL 28 pass / 3 fail / 2 known FAIL [webkit] R5 old save loads + migrates (m1-rc2-v4-12min.json, v4) — {"v":4,"F":10,"C":11,"rec":0,"resavedAt":1792152390597};FAIL [webkit] R5 old save loads + migrates (m2-rc1-v5-12min.json, v5) — {"v":5,"F":10,"C":11,"rec":0,"resavedAt":1792152392907};FAIL [webkit] R5 old save loads + migrates (m2-rc1-v5-40min-edge.json, v5) — {"v":5,"F":19,"C":17,"rec":0,"resavedAt":1792152395249}; |
| save | durability-guard-R1-R6 | chromium | FAIL 30 pass / 3 fail / 1 known FAIL [chromium] R5 old save loads + migrates (m1-rc2-v4-12min.json, v4) — {"v":4,"F":10,"C":11,"rec":0,"resavedAt":1792152397247};FAIL [chromium] R5 old save loads + migrates (m2-rc1-v5-12min.json, v5) — {"v":5,"F":10,"C":11,"rec":0,"resavedAt":1792152399415};FAIL [chromium] R5 old save loads + migrates (m2-rc1-v5-40min-edge.json, v5) — {"v":5,"F":19,"C":17,"rec":0,"resavedAt":1792152401564}; |
| save | durability-guard-R1-R6 | firefox | FAIL 25 pass / 3 fail / 5 known FAIL [firefox] R5 old save loads + migrates (m1-rc2-v4-12min.json, v4) — {"v":4,"F":10,"C":11,"rec":0,"resavedAt":1792152457527};FAIL [firefox] R5 old save loads + migrates (m2-rc1-v5-12min.json, v5) — {"v":5,"F":10,"C":11,"rec":0,"resavedAt":1792152462974};FAIL [firefox] R5 old save loads + migrates (m2-rc1-v5-40min-edge.json, v5) — {"v":5,"F":19,"C":17,"rec":0,"resavedAt":1792152467459}; |
| save | durability-D2-kill | webkit | PASS 30 pass, 3 known: LOSS [webkit] {"mode":"sametask","D":0,"rep":0,"B":1719,"L1":1720,"aft;LOSS [webkit] {"mode":"sametask","D":0,"rep":1,"B":1719,"L1":1720,"aft;LOSS [webkit] {"mode":"sametask","D":0,"rep":2,"B":1719,"L1":1720,"aft; |
| save | durability-D2-kill | chromium | PASS 30 pass, 3 known: LOSS [chromium] {"mode":"sametask","D":0,"rep":0,"B":1719,"L1":1720,"a;LOSS [chromium] {"mode":"sametask","D":0,"rep":1,"B":1719,"L1":1720,"a;LOSS [chromium] {"mode":"sametask","D":0,"rep":2,"B":1719,"L1":1720,"a; |
| save | durability-780-save_restore | chromium | PASS 5 pass |
| save | offline-clock | chromium | PASS 6 pass |
| save | durability-780-save_restore | webkit | PASS 5 pass |
| save | eng-release-globals | chromium | PASS exit 0  |
| save | offline-clock | webkit | PASS 6 pass |
| save | eng-release-globals | webkit | PASS exit 0  |
| save | eng-tab-guard | chromium | FAIL exit 1  |
| save | eng-tab-guard | webkit | FAIL exit 1  |
| save | eng-d2-kill | webkit | FAIL exit 1  |
| save | eng-d2-kill | chromium | FAIL exit 1  |
| save | durability-D2-kill | firefox | PASS 21 pass |
| save | durability-780-save_restore | firefox | PASS 4 pass, 1 known: FAIL [firefox] TG-UI-9b sound back after Play here (+Tap to start): co; |
| save | offline-clock | firefox | PASS 6 pass |
| save | eng-release-globals | firefox | PASS exit 0  |
| save | eng-tab-guard | firefox | PASS exit 0  |
| save | eng-d2-kill | firefox | PASS exit 0 SUMMARY [firefox] 0ms 3/3, 100ms 3/3, 500ms 3/3, 1000ms 3/3, 2000ms 3/3, 3000ms  |
| save | qa-pt1-browser telemetry/install_id (dist, C/F/W/iOS-WebKit) | - | PASS 4 engines |
| save | qa-pt1-browser telemetry/install_id (dist-qa, C/F/W/iOS-WebKit) | - | PASS 4 engines |
| save | suite runtime | - | 37m26s |
| ui | s2-8-wage-label-boundaries-code | - | N/A (s2-economy-ui fmtExactRate not in 8669522) |
| ui | rc1-ui-plan | chromium | N/A (rc1-ui (S2-5/S2-6/S2-8 label) not in 8669522) |
| ui | rc1-ui-plan | firefox | N/A (rc1-ui (S2-5/S2-6/S2-8 label) not in 8669522) |
| ui | rc1-ui-plan | webkit | N/A (rc1-ui (S2-5/S2-6/S2-8 label) not in 8669522) |
| ui | fasttap | firefox | PASS 13 pass, 1 known: FAIL [firefox] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"f; |
| ui | s2-8-wage-label-browser | firefox | N/A (fmtExactRate/wage label not in 8669522) |
| ui | fasttap | chromium | PASS 13 pass, 1 known: FAIL [chromium] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"; |
| ui | s2-8-wage-label-browser | chromium | N/A (fmtExactRate/wage label not in 8669522) |
| ui | fasttap | webkit | PASS 13 pass, 1 known: FAIL [webkit] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"we; |
| ui | s2-8-wage-label-browser | webkit | N/A (fmtExactRate/wage label not in 8669522) |
| ui | eng-rc0-browser | chromium | FAIL exit 1 40/45 passed |
| ui | eng-rc0-browser | firefox | FAIL exit 1 28/34 passed |
| ui | eng-rc0-browser | webkit | FAIL exit 1 16/25 passed |
| ui | suite runtime | - | 1m45s |
| money | s2-8-exact-wage-60s-10min | webkit | PASS 4 pass, 1 N/A |
| money | s2-8-exact-wage-60s-10min | chromium | PASS 4 pass, 1 N/A |
| money | s2-8-exact-wage-60s-10min | firefox | PASS 4 pass, 1 N/A |
| money | zero-gate-carried-frac | chromium | PASS 7 pass |
| money | zero-gate-carried-frac | webkit | PASS 7 pass |
| money | zero-gate-carried-frac | firefox | FAIL script crash (exit 1) after 4 pass: page.evaluate: can't access property "state", g is undefined [harness, see log] |
| money | suite runtime | - | 1m28s |
| f1 | market-hand-min-wait-2s | - | N/A (market_hand_min_wait_s not in 8669522) |
| f1 | pacing-bands-f1-proposal | - | N/A (F1 economy not merged at this SHA; current economy vs F1 bands: 14/24 in band) |
| f1 | npm run check-economy-copy (clean clone) | - | PASS check-economy-copy: ../product/economy.csv not found - skipped |
| f1 | npm run check-economy-copy (workspace-linked, live product/economy.csv) | - | PASS check-economy-copy: data/economy.csv matches product/economy.csv (32 lines, line endings normalised) |
| f1 | suite runtime | - | 0m30s |
| market | MK-20-sim-hash | - | PASS 2/2 |
| market | MK-16-22-served-dwell | chromium | FAIL 4 pass / 2 fail FAIL [chromium] MK-16 served card shows "Thanks! +$X" ~1.5 s then leaves — {"n":25,"min":899,"max":1501,"early":[{"L":899,"pop":false,"squ;FAIL [chromium] MK-19 reduced motion: static "Thanks!" card, same ~1.5 s dwell — {"rm":{"rm":true,"anim":"none"},"life":[1200,1500,1500,15; |
| market | MK-16-22-served-dwell | webkit | FAIL 5 pass / 1 fail FAIL [webkit] MK-16 served card shows "Thanks! +$X" ~1.5 s then leaves — {"n":25,"min":913,"max":1560,"early":[{"L":913,"pop":false,"squee; |
| market | MK-16-22-served-dwell | firefox | FAIL 5 pass / 1 fail FAIL [firefox] MK-16 served card shows "Thanks! +$X" ~1.5 s then leaves — {"n":25,"min":906,"max":1604,"early":[{"L":906,"pop":false,"sque; |
| market | MK-23-25-orders-copy-pay | chromium | PASS 2 pass, 4 N/A |
| market | MK-23-25-orders-copy-pay | webkit | PASS 2 pass, 4 N/A |
| market | MK-23-25-orders-copy-pay | firefox | PASS 2 pass, 4 N/A |
| market | suite runtime | - | 2m45s |
| release | tag-latest-hash-playthrough | chromium | PASS 5 pass, 2 N/A |
| release | tag-latest-hash-playthrough | webkit | PASS 5 pass |
| release | tag-latest-hash-playthrough | firefox | PASS 5 pass |
| release | suite runtime | - | 0m34s |

Total wall time 46m56s. PASS 48 FAIL 15 N/A 9
