# combined QA 98396ed suite=all (2026-10-16 13:11 CEST)

| suite | check | engine | result |
|---|---|---|---|
| setup | clean clone, no outside links | - | PASS |
| unit | vitest clean clone | - | FAIL  Tests 291 passed (291) |
| unit | vitest workspace-linked (/tmp/qa-x/ws/product -> product/) | - | PASS  Tests 365 passed (365) |
| build | npm run build (release + check-release-build) | - | PASS index-zqqnVDoP.js |
| build | npm run build:qa (dist-qa) | - | PASS index-DMNkAKgy.js |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| save | fixture migrations v4/v5 -> current (+wageFracCents if v6), corrupt rejected | - | PASS 9/9 (save version 5; v6/wageFracCents N/A at this SHA) |
| save | offline-clock-code | - | PASS 17/17 |
| save | v6-migrations-wageFrac | webkit | N/A (no wageFracCents/save v6 in 98396ed) |
| save | v6-migrations-wageFrac | firefox | N/A (no wageFracCents/save v6 in 98396ed) |
| save | v6-migrations-wageFrac | chromium | N/A (no wageFracCents/save v6 in 98396ed) |
| save | durability-guard-R1-R6 | chromium | FAIL 32 pass / 1 fail / 1 known FAIL [chromium] Handover: old tab flushes first, new tab loads its exact unsaved state (no play lost), flush→claim ≤300 ms — {"bought"; |
| save | durability-guard-R1-R6 | webkit | FAIL 31 pass / 1 fail / 1 known FAIL [webkit] Handover: old tab flushes first, new tab loads its exact unsaved state (no play lost), flush→claim ≤300 ms — {"bought":5; |
| save | durability-guard-R1-R6 | firefox | FAIL 29 pass / 1 fail / 3 known FAIL [firefox] TG-1/TG-UI-1/AC14d(newest tab owns): notice in old tab ≤1 s, old money frozen 5 s, B owns lease — {"tNoticeMsInclStart":1; |
| save | durability-D2-kill | chromium | PASS 30 pass, 3 known: LOSS [chromium] {"mode":"sametask","D":0,"rep":0,"B":1719,"L1":1720,"a;LOSS [chromium] {"mode":"sametask","D":0,"rep":1,"B":1719,"L1":1720,"a;LOSS [chromium] {"mode":"sametask","D":0,"rep":2,"B":1719,"L1":1720,"a; |
| save | durability-780-save_restore | chromium | PASS 5 pass |
| save | offline-clock | chromium | FAIL 4 pass / 2 fail FAIL [chromium] 1 h away: offline grant > 0 with welcome-back modal — {"pend":9903,"modal":false,"cap":7200,"errs":0};FAIL [chromium] grant proportional: cap grant / 1 h grant = cap/3600 (±1 egg) — {"h1":9903,"cap":19800}; |
| save | eng-release-globals | chromium | PASS exit 0  |
| save | durability-D2-kill | webkit | PASS 30 pass, 3 known: LOSS [webkit] {"mode":"sametask","D":0,"rep":0,"B":1719,"L1":1720,"aft;LOSS [webkit] {"mode":"sametask","D":0,"rep":1,"B":1719,"L1":1720,"aft;LOSS [webkit] {"mode":"sametask","D":0,"rep":2,"B":1719,"L1":1720,"aft; |
| save | durability-780-save_restore | webkit | PASS 5 pass |
| save | offline-clock | webkit | PASS 6 pass |
| save | eng-tab-guard | chromium | PASS exit 0  |
| save | eng-release-globals | webkit | PASS exit 0  |
| save | eng-tab-guard | webkit | PASS exit 0  |
| save | durability-D2-kill | firefox | PASS 24 pass, 3 known: LOSS [firefox] {"mode":"sametask","D":0,"rep":0,"B":1719,"L1":1720,"af;LOSS [firefox] {"mode":"sametask","D":0,"rep":1,"B":1719,"L1":1720,"af;LOSS [firefox] {"mode":"sametask","D":0,"rep":2,"B":1719,"L1":1720,"af; |
| save | eng-d2-kill | chromium | PASS exit 0 SUMMARY [chromium] 0ms 3/3, 100ms 3/3, 500ms 3/3, 1000ms 3/3, 2000ms 3/3, 3000ms |
| save | durability-780-save_restore | firefox | PASS 4 pass, 1 known: FAIL [firefox] TG-UI-9b sound back after Play here (+Tap to start): co; |
| save | offline-clock | firefox | PASS 6 pass |
| save | eng-release-globals | firefox | PASS exit 0  |
| save | eng-d2-kill | webkit | PASS exit 0 SUMMARY [webkit] 0ms 3/3, 100ms 3/3, 500ms 3/3, 1000ms 3/3, 2000ms 3/3, 3000ms 3 |
| save | eng-tab-guard | firefox | PASS exit 0  |
| save | eng-d2-kill | firefox | PASS exit 0 SUMMARY [firefox] 0ms 3/3, 100ms 3/3, 500ms 3/3, 1000ms 3/3, 2000ms 3/3, 3000ms  |
| save | qa-pt1-browser telemetry/install_id (dist, C/F/W/iOS-WebKit) | - | PASS 4 engines |
| save | qa-pt1-browser telemetry/install_id (dist-qa, C/F/W/iOS-WebKit) | - | PASS 4 engines |
| save | suite runtime | - | 21m17s |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| ui | s2-8-wage-label-boundaries-code | - | N/A (s2-economy-ui fmtExactRate not in 98396ed) |
| ui | rc1-ui-plan | chromium | FAIL 3 pass / 11 fail / 1 known FAIL [chromium] S2-6 360px queue-full tag straddles strip, covers no chip — {"text":"Queue full","straddle":false,"over":true,"n":9};FAIL [chromium] S2-6/S2-9 (script error) — "Error: page.evaluate: TypeError: Failed to execute 'getComputedStyle' on 'Window': parameter 1;FAIL [chromium] S2-5 one visible Manage-all control, labelled (no unlabeled/duplicate) — {"manageAll":1,"unlabeled":1,"nav":[["Market",108; |
| ui | rc1-ui-plan | webkit | FAIL 3 pass / 11 fail / 1 known FAIL [webkit] S2-6 360px queue-full tag straddles strip, covers no chip — {"text":"Queue full","straddle":false,"over":true,"n":9};FAIL [webkit] S2-6/S2-9 (script error) — "Error: page.evaluate: TypeError: Argument 1 ('element') to Window.getComputedStyle must be an in;FAIL [webkit] S2-5 one visible Manage-all control, labelled (no unlabeled/duplicate) — {"manageAll":1,"unlabeled":1,"nav":[["Market",108,6; |
| ui | rc1-ui-plan | firefox | FAIL 3 pass / 11 fail / 1 known FAIL [firefox] S2-6 360px queue-full tag straddles strip, covers no chip — {"text":"Queue full","straddle":false,"over":true,"n":9};FAIL [firefox] S2-6/S2-9 (script error) — "Error: page.evaluate: Window.getComputedStyle: Argument 1 is not an object.\n@debugger eval cod;FAIL [firefox] S2-5 one visible Manage-all control, labelled (no unlabeled/duplicate) — {"manageAll":1,"unlabeled":1,"nav":[["Market",108,; |
| ui | fasttap | chromium | PASS 13 pass, 1 known: FAIL [chromium] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"; |
| ui | s2-8-wage-label-browser | chromium | N/A (fmtExactRate/wage label not in 98396ed) |
| ui | fasttap | firefox | PASS 13 pass, 1 known: FAIL [firefox] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"f; |
| ui | s2-8-wage-label-browser | firefox | N/A (fmtExactRate/wage label not in 98396ed) |
| ui | eng-rc0-browser | firefox | FAIL exit 2  |
| ui | fasttap | webkit | PASS 13 pass, 1 known: FAIL [webkit] fast-tap pointer-norefill 15/s: 0 lost — {"engine":"we; |
| ui | s2-8-wage-label-browser | webkit | N/A (fmtExactRate/wage label not in 98396ed) |
| ui | eng-rc0-browser | chromium | PASS exit 0 40/40 passed |
| ui | eng-rc0-browser | webkit | PASS exit 0 40/40 passed |
| ui | suite runtime | - | 3m26s |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| money | s2-8-exact-wage | webkit | N/A (exact-rate wages (wageFracCents) not in 98396ed) |
| money | s2-8-exact-wage | firefox | N/A (exact-rate wages (wageFracCents) not in 98396ed) |
| money | s2-8-exact-wage | chromium | N/A (exact-rate wages (wageFracCents) not in 98396ed) |
| money | zero-gate | firefox | N/A ($0 gate with wageFracCents not in 98396ed) |
| money | zero-gate | webkit | N/A ($0 gate with wageFracCents not in 98396ed) |
| money | zero-gate | chromium | N/A ($0 gate with wageFracCents not in 98396ed) |
| money | suite runtime | - | 0m6s |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| f1 | market-hand-min-wait-2s | - | N/A (market_hand_min_wait_s not in 98396ed) |
| f1 | pacing-bands-f1-proposal | - | N/A (F1 economy not merged at this SHA; current economy vs F1 bands: 14/24 in band) |
| f1 | npm run check-economy-copy | - | N/A (script not in package.json at 98396ed) |
| f1 | suite runtime | - | 0m34s |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| market | MK-20-sim-hash | - | N/A (served_dwell_ms not in 98396ed) |
| market | MK-16-22 | webkit | N/A (served_dwell_ms not in 98396ed) |
| market | MK-16-22 | firefox | N/A (served_dwell_ms not in 98396ed) |
| market | MK-16-22 | chromium | N/A (served_dwell_ms not in 98396ed) |
| market | MK-23-25-orders-copy-pay | chromium | PASS 2 pass, 4 N/A |
| market | MK-23-25-orders-copy-pay | webkit | PASS 2 pass, 4 N/A |
| market | MK-23-25-orders-copy-pay | firefox | PASS 2 pass, 4 N/A |
| market | suite runtime | - | 0m14s |
| globals | release-globals-only-eggfarmExportTelemetry | webkit | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | chromium | PASS 2 pass |
| globals | release-globals-only-eggfarmExportTelemetry | firefox | PASS 2 pass |
| release | tag-latest-hash-playthrough | webkit | PASS 5 pass |
| release | tag-latest-hash-playthrough | chromium | PASS 5 pass, 2 N/A |
| release | tag-latest-hash-playthrough | firefox | PASS 5 pass |
| release | suite runtime | - | 0m36s |

Total wall time 31m5s. PASS 54 FAIL 9 N/A 20
